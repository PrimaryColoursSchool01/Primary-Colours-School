import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarIcon,
  FilterX,
  Download,
  Image as ImageIcon,
  FileText,
  Receipt,
  Loader2,
  Database,
  RefreshCw,
  Share2,
  ChevronDown,
} from "lucide-react";
import { getAllPaymentRecords, acceptPaymentItems, rejectPaymentRecord, updateAmountReceived } from "@/services/payment-record.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Responses() {
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [loadingStage, setLoadingStage] = useState("initializing");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { type: "accept"|"update-amount", itemIds: [] }

  const hasActiveFilters = appliedSearch.trim() !== "" || status !== "all" || startDate !== "" || endDate !== "";

  const fetchPaymentRecords = async (isRefetch = false) => {
    try {
      if (isRefetch) {
        setIsRefetching(true);
      } else {
        setLoading(true);
        setLoadingStage("connecting");
      }

      if (!isRefetch) setLoadingStage("fetching");
      const params = { page, limit: 10 };
      if (appliedSearch) params.search = appliedSearch;
      if (status !== "all") params.status = status;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await getAllPaymentRecords(params);

      if (!isRefetch) setLoadingStage("processing");
      setPaymentRecords(response.paymentRecords);
      setTotal(response.total);
      setTotalPages(response.totalPages);

      if (!isRefetch) {
        setLoadingStage("ready");
      }
    } catch (error) {
      console.error("Failed to load payment records:", error);
      toast.error("Failed to load payment records");
    } finally {
      if (isRefetch) {
        setIsRefetching(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchPaymentRecords(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchPaymentRecords(true);
    }
  }, [page, status, startDate, endDate, appliedSearch]);

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setSelectedItemIds([]);
    setDetailModalOpen(true);
  };

  const handleItemSelect = (itemId, checked) => {
    if (checked) {
      setSelectedItemIds((prev) => [...prev, itemId]);
    } else {
      setSelectedItemIds((prev) => prev.filter((id) => id !== itemId));
    }
  };

  const handleAccept = async () => {
    if (selectedItemIds.length === 0) {
      toast.error("Please select at least one item to accept");
      return;
    }
    // Only require amount if debt is not yet cleared
    if (!debtCleared) {
      const parsed = parseFloat(amountReceived.replace(/,/g, ""));
      if (!amountReceived || isNaN(parsed) || parsed <= 0) {
        toast.error("Please enter the amount received from the parent");
        return;
      }
    }
    setPendingAction({ type: "accept", itemIds: selectedItemIds });
    setConfirmModalOpen(true);
  };

  const handleUpdateAmount = () => {
    const parsed = parseFloat(amountReceived.replace(/,/g, ""));
    if (!amountReceived || isNaN(parsed) || parsed <= 0) {
      toast.error("Please enter the amount received from the parent");
      return;
    }
    setPendingAction({ type: "update-amount", itemIds: [] });
    setConfirmModalOpen(true);
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;
    const parsed = parseFloat(amountReceived.replace(/,/g, "")) || 0;
    try {
      setActionLoading(true);
      if (pendingAction.type === "accept") {
        // Only send amountReceived if debt not cleared and amount was entered
        const amountToSend = (!debtCleared && parsed > 0) ? parsed : undefined;
        const res = await acceptPaymentItems(selectedRecord._id, pendingAction.itemIds, amountToSend);
        toast.success("Payment accepted successfully");
        setSelectedRecord(res.paymentRecord);
        setSelectedItemIds([]);
        setAmountReceived("");
        setConfirmModalOpen(false);
        setPendingAction(null);
        fetchPaymentRecords(true);
      } else if (pendingAction.type === "update-amount") {
        const res = await updateAmountReceived(selectedRecord._id, parsed);
        toast.success("Payment amount updated");
        setSelectedRecord(res.paymentRecord);
        setAmountReceived("");
        setConfirmModalOpen(false);
        setPendingAction(null);
        fetchPaymentRecords(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    const parsed = parseFloat(amountReceived.replace(/,/g, ""));
    if (!amountReceived || isNaN(parsed) || parsed < 0) {
      toast.error("Please enter the amount received from the parent");
      return;
    }
    try {
      setActionLoading(true);
      await rejectPaymentRecord(selectedRecord._id, rejectionReason, parsed);
      toast.success("Payment record rejected");
      setAmountReceived("");
      setRejectModalOpen(false);
      setDetailModalOpen(false);
      fetchPaymentRecords(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = () => {
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  // ── Live preview calculations ──────────────────────────────────────────
  const amountReceivedNum = parseFloat(amountReceived.replace(/,/g, "")) || 0;
  const previouslyReceived = selectedRecord?.amountReceived || 0;
  const newTotalReceived = previouslyReceived + amountReceivedNum;
  const newOutstanding = Math.max(0, (selectedRecord?.totalAmount || 0) - newTotalReceived);
  const showPreview = amountReceivedNum > 0;
  const debtCleared = previouslyReceived >= (selectedRecord?.totalAmount || 0);

  // ── Format number with commas for display ─────────────────────────────
  const formatWithCommas = (value) => {
    const digits = value.replace(/[^0-9]/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("en-NG");
  };

  const handleAmountChange = (e) => {
    const formatted = formatWithCommas(e.target.value);
    setAmountReceived(formatted);
  };

  const handleClearDates = () => {
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const handleClearAllFilters = () => {
    setSearch("");
    setAppliedSearch("");
    setStatus("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const handleSearch = () => {
    const normalized = search.trim();
    setPage(1);
    setAppliedSearch(normalized);
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      accepted: "bg-green-100 text-green-800 border border-green-200",
      rejected: "bg-red-100 text-red-800 border border-red-200",
      partially_accepted: "bg-orange-100 text-orange-800 border border-orange-200",
    };
    return configs[status] || configs.pending;
  };

  const getItemStatusBadge = (status) => {
    const configs = {
      pending: "bg-slate-100 text-slate-700",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return configs[status] || configs.pending;
  };

  const formatStatus = (status) => {
    if (status === "partially_accepted") return "Partial";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getEvidenceImageSrc = (record) => {
    if (record.paymentEvidenceType !== "image" || !record.paymentEvidenceImage) return null;
    try {
      const raw = Array.isArray(record.paymentEvidenceImage?.data)
        ? record.paymentEvidenceImage.data
        : Array.isArray(record.paymentEvidenceImage)
          ? record.paymentEvidenceImage
          : null;
      if (!raw) return null;
      const bytes = new Uint8Array(raw);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const contentType = record.paymentEvidenceContentType || "image/jpeg";
      return `data:${contentType};base64,${base64}`;
    } catch {
      return null;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Helper: Convert jsPDF instance to a File object (preserves filename on iOS)
  // ──────────────────────────────────────────────────────────────────────────
  const pdfToFile = (doc, filename) => {
    const pdfBlob = doc.output("blob");
    return new File([pdfBlob], filename, { type: "application/pdf" });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Helper: Share file via Web Share API, with automatic download fallback
  // ──────────────────────────────────────────────────────────────────────────
  const sharePDF = async (file, fallbackFilename) => {
    // Check if Web Share API with files is supported
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: "Payment Receipt",
          text: "Receipt from Primary Colours School",
          files: [file],
        });
        toast.success("Receipt ready to send");
        return true;
      } catch (err) {
        // User cancelled or share failed – fallback to download
        if (err.name !== "AbortError") {
          console.warn("Share failed, falling back to download:", err);
        }
      }
    }

    // Fallback: trigger download
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = fallbackFilename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded (sharing not supported)");
    return false;
  };

  const loadImageDataUrl = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });

  // ──────────────────────────────────────────────────────────────────────────
  // Updated: Thermal Receipt-style PDF – now shares natively with fallback
  // ──────────────────────────────────────────────────────────────────────────
  const generateReceiptPDF = async (record, mode = "share") => {
    const acceptedItems = record.items.filter((item) => item.status === "accepted");
    const outstandingItems = record.items.filter((item) => item.status === "pending");
    const isPartial = record.status === "partially_accepted";

    // ── Dynamic page height based on item count ────────────────
    const baseHeight = 170;
    const perItemHeight = 10;
    // Extra height for outstanding section if partial
    const outstandingExtra = isPartial ? outstandingItems.length * perItemHeight + 30 : 0;
    const pageHeight = baseHeight + acceptedItems.length * perItemHeight + outstandingExtra;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, pageHeight],
    });

    const pageW = 80;
    const margin = 5;

    // ── Helpers ────────────────────────────────────────────────
    const formatCurrencyPDF = (amt) => {
      const num = typeof amt === "number" ? amt : 0;
      return `NGN ${num.toLocaleString("en-NG")}`;
    };

    const dashedLine = (y) => {
      doc.setDrawColor(180, 180, 180).setLineWidth(0.2);
      const dashW = 2;
      const gapW = 1.2;
      let x = margin;
      while (x < pageW - margin) {
        doc.line(x, y, Math.min(x + dashW, pageW - margin), y);
        x += dashW + gapW;
      }
    };

    const solidLine = (y, color = [200, 200, 200]) => {
      doc
        .setDrawColor(...color)
        .setLineWidth(0.3)
        .line(margin, y, pageW - margin, y);
    };

    // ── Colors ─────────────────────────────────────────────────
    const BLACK = [15, 23, 42];
    const GRAY = [100, 116, 139];
    const PRIMARY = [19, 109, 236];

    let y = 9;
    const badgeDataUrl = await loadImageDataUrl("/primarcoloursbadge.png");

    if (badgeDataUrl) {
      const badgeSize = 13;
      const badgeX = (pageW - badgeSize) / 2;
      doc.addImage(badgeDataUrl, "PNG", badgeX, y - 4, badgeSize, badgeSize);
      y += 12;
    }

    // ── SCHOOL NAME ────────────────────────────────────────────
    doc
      .setFontSize(11)
      .setFont("helvetica", "bold")
      .setTextColor(...BLACK)
      .text("PRIMARY COLOURS", pageW / 2, y, { align: "center" });
    y += 5;
    doc
      .setFontSize(9)
      .setFont("helvetica", "bold")
      .setTextColor(...BLACK)
      .text("SCHOOL", pageW / 2, y, { align: "center" });
    y += 5;
    doc
      .setFontSize(6.5)
      .setFont("helvetica", "normal")
      .setTextColor(...GRAY)
      .text("OFFICIAL PAYMENT RECEIPT", pageW / 2, y, { align: "center" });
    y += 4;
    doc
      .setFontSize(6)
      .setFont("helvetica", "normal")
      .setTextColor(...GRAY)
      .text(new Date().toLocaleString("en-NG"), pageW / 2, y, { align: "center" });
    y += 4;

    dashedLine(y);
    y += 5;

    // ── RECEIPT META ───────────────────────────────────────────
    doc
      .setFontSize(6.5)
      .setFont("helvetica", "bold")
      .setTextColor(...BLACK);
    doc.text("RECEIPT NO:", margin, y);
    doc
      .setFont("helvetica", "normal")
      .setTextColor(...GRAY)
      .text(`#${record._id.slice(-8).toUpperCase()}`, pageW - margin, y, { align: "right" });
    y += 4;
    doc
      .setFont("helvetica", "bold")
      .setTextColor(...BLACK)
      .text("PAYMENT DATE:", margin, y);
    doc
      .setFont("helvetica", "normal")
      .setTextColor(...GRAY)
      .text(new Date(record.dateOfPayment).toLocaleDateString("en-NG"), pageW - margin, y, { align: "right" });
    y += 4;

    dashedLine(y);
    y += 5;

    // ── BILL TO ────────────────────────────────────────────────
    doc
      .setFontSize(6.5)
      .setFont("helvetica", "bold")
      .setTextColor(...PRIMARY)
      .text("BILL TO", margin, y);
    y += 4;
    doc.setFont("helvetica", "normal").setTextColor(...BLACK);
    const infoRows = [
      ["Child", record.nameOfChild],
      ["Payer", record.nameOfPayerOrCompany],
      ["Class", record.classId?.name || "N/A"],
      ["Session", record.session],
      ...(record.term ? [["Term", record.term]] : []),
    ];
    infoRows.forEach(([label, value]) => {
      doc
        .setFontSize(6.5)
        .setFont("helvetica", "bold")
        .setTextColor(...GRAY)
        .text(`${label}:`, margin, y);
      doc
        .setFont("helvetica", "normal")
        .setTextColor(...BLACK)
        .text(String(value), pageW - margin, y, { align: "right" });
      y += 4;
    });

    dashedLine(y);
    y += 5;

    // ── PAYMENT METHOD ─────────────────────────────────────────
    doc
      .setFontSize(6.5)
      .setFont("helvetica", "bold")
      .setTextColor(...PRIMARY)
      .text("PAYMENT METHOD", margin, y);
    y += 4;
    doc
      .setFontSize(6.5)
      .setFont("helvetica", "bold")
      .setTextColor(...GRAY)
      .text("Mode:", margin, y);
    doc
      .setFont("helvetica", "normal")
      .setTextColor(...BLACK)
      .text(record.modeOfPayment.replace(/-/g, " "), pageW - margin, y, { align: "right" });
    y += 4;
    doc
      .setFontSize(6.5)
      .setFont("helvetica", "bold")
      .setTextColor(...GRAY)
      .text("Bank/Source:", margin, y);
    doc
      .setFont("helvetica", "normal")
      .setTextColor(...BLACK)
      .text(record.bankOrPaymentSourceName, pageW - margin, y, { align: "right" });
    y += 4;

    dashedLine(y);
    y += 5;

    // ── ITEMS HEADER ───────────────────────────────────────────
    doc
      .setFontSize(6.5)
      .setFont("helvetica", "bold")
      .setTextColor(...PRIMARY)
      .text("ACCEPTED ITEMS", margin, y);
    y += 4;

    doc
      .setFontSize(6)
      .setFont("helvetica", "bold")
      .setTextColor(...GRAY);
    doc.text("DESCRIPTION", margin, y);
    doc.text("QTY", pageW / 2 + 5, y, { align: "center" });
    doc.text("AMOUNT", pageW - margin, y, { align: "right" });
    y += 2;

    solidLine(y);
    y += 4;

    // ── ACCEPTED ITEMS ─────────────────────────────────────────
    let amountPaid = 0;
    acceptedItems.forEach((item) => {
      const itemName = item.itemId?.name || "Item";
      const amount = item.quantity * item.amountAtPayment;
      amountPaid += amount;

      const lines = doc.splitTextToSize(itemName, 38);
      doc
        .setFontSize(6.5)
        .setFont("helvetica", "normal")
        .setTextColor(...BLACK);
      doc.text(lines, margin, y);
      doc.text(`x${item.quantity}`, pageW / 2 + 5, y, { align: "center" });
      doc.text(formatCurrencyPDF(amount), pageW - margin, y, { align: "right" });
      y += lines.length * 4 + 1;
    });

    y += 2;
    solidLine(y);
    y += 5;

    // ── OUTSTANDING ITEMS (partial payments only) ──────────────
    let outstandingAmount = 0;
    if (isPartial && outstandingItems.length > 0) {
      // Section header
      doc
        .setFontSize(6.5)
        .setFont("helvetica", "bold")
        .setTextColor(220, 38, 38) // red
        .text("OUTSTANDING ITEMS", margin, y);
      y += 4;

      doc
        .setFontSize(6)
        .setFont("helvetica", "bold")
        .setTextColor(...GRAY);
      doc.text("DESCRIPTION", margin, y);
      doc.text("QTY", pageW / 2 + 5, y, { align: "center" });
      doc.text("AMOUNT", pageW - margin, y, { align: "right" });
      y += 2;

      solidLine(y, [220, 38, 38]);
      y += 4;

      outstandingItems.forEach((item) => {
        const itemName = item.itemId?.name || "Item";
        const amount = item.quantity * item.amountAtPayment;
        outstandingAmount += amount;

        const lines = doc.splitTextToSize(itemName, 38);
        doc
          .setFontSize(6.5)
          .setFont("helvetica", "normal")
          .setTextColor(...BLACK);
        doc.text(lines, margin, y);
        doc.text(`x${item.quantity}`, pageW / 2 + 5, y, { align: "center" });
        doc
          .setTextColor(220, 38, 38)
          .text(formatCurrencyPDF(amount), pageW - margin, y, { align: "right" });
        y += lines.length * 4 + 1;
      });

      y += 2;
      solidLine(y, [220, 38, 38]);
      y += 5;
    }

    // ── TOTALS ─────────────────────────────────────────────────
    const totalSubmitted = record.totalAmount;
    const actualAmountReceived = record.amountReceived ?? amountPaid;
    const outstandingBalance = Math.max(0, totalSubmitted - actualAmountReceived);

    if (isPartial || (record.amountReceived !== null && record.amountReceived !== undefined)) {
      // Three-line summary — shows when payment is partial OR amountReceived is recorded
      // Total Submitted row
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y - 1.5, pageW - margin * 2, 8, 1, 1, "F");
      doc
        .setFontSize(6.5)
        .setFont("helvetica", "normal")
        .setTextColor(...GRAY)
        .text("Total Fees", margin + 3, y + 4);
      doc
        .setFont("helvetica", "bold")
        .setTextColor(...BLACK)
        .text(formatCurrencyPDF(totalSubmitted), pageW - margin - 3, y + 4, { align: "right" });
      y += 10;

      // Amount Received row
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(margin, y - 1.5, pageW - margin * 2, 8, 1, 1, "F");
      doc
        .setFontSize(6.5)
        .setFont("helvetica", "normal")
        .setTextColor(...GRAY)
        .text("Amount Received", margin + 3, y + 4);
      doc
        .setFont("helvetica", "bold")
        .setTextColor(22, 163, 74)
        .text(formatCurrencyPDF(actualAmountReceived), pageW - margin - 3, y + 4, { align: "right" });
      y += 10;

      // Outstanding Balance row
      if (outstandingBalance > 0) {
        doc.setFillColor(254, 242, 242);
      } else {
        doc.setFillColor(240, 253, 244);
      }
      doc.roundedRect(margin, y - 1.5, pageW - margin * 2, 10, 1, 1, "F");
      doc
        .setFontSize(7)
        .setFont("helvetica", "bold")
        .setTextColor(outstandingBalance > 0 ? 220 : 22, outstandingBalance > 0 ? 38 : 163, outstandingBalance > 0 ? 38 : 74)
        .text("Outstanding Balance", margin + 3, y + 5);
      doc
        .setFontSize(7)
        .setFont("helvetica", "bold")
        .text(formatCurrencyPDF(outstandingBalance), pageW - margin - 3, y + 5, { align: "right" });
      y += 14;
    } else {
      // Single total for fully accepted payments with no outstanding
      doc.setFillColor(235, 244, 255);
      doc.roundedRect(margin, y - 1.5, pageW - margin * 2, 10, 1, 1, "F");
      doc
        .setFontSize(8)
        .setFont("helvetica", "bold")
        .setTextColor(...PRIMARY)
        .text("TOTAL PAID", margin + 3, y + 5);
      doc
        .setFontSize(8)
        .setFont("helvetica", "bold")
        .setTextColor(12, 85, 180)
        .text(formatCurrencyPDF(amountPaid), pageW - margin - 3, y + 5, { align: "right" });
      y += 14;
    }

    dashedLine(y);
    y += 6;

    // ── FOOTER ─────────────────────────────────────────────────
    doc
      .setFontSize(6.5)
      .setFont("helvetica", "bold")
      .setTextColor(...BLACK)
      .text("Thank you for your payment!", pageW / 2, y, {
        align: "center",
      });
    y += 4;
    doc
      .setFontSize(6)
      .setFont("helvetica", "normal")
      .setTextColor(...GRAY)
      .text("Please retain this receipt for your records.", pageW / 2, y, { align: "center" });
    y += 4;
    doc
      .setFontSize(6)
      .setFont("helvetica", "normal")
      .setTextColor(...GRAY)
      .text("Primary Colours School - Finance Dept.", pageW / 2, y, { align: "center" });

    // ──────────────────────────────────────────────────────────────
    // Build safe filename including parent/payer name
    // ──────────────────────────────────────────────────────────────
    const safePayer = (record.nameOfPayerOrCompany || "Payer").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const safeChild = record.nameOfChild.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const safeClass = (record.classId?.name || "Class").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const dateStr = new Date(record.dateOfPayment).toISOString().slice(0, 10);
    const filename = `Receipt_${safePayer}_${safeChild}_${safeClass}_${dateStr}.pdf`;

    if (mode === "download") {
      // Direct download — no share sheet
      doc.save(filename);
      toast.success("Receipt downloaded");
    } else {
      // Share via Web Share API with download fallback
      const file = pdfToFile(doc, filename);
      await sharePDF(file, filename);
    }
  };

  const handleExportPDF = () => {
    if (!paymentRecords.length) {
      toast.error("No records to export");
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;
    const contentW = pageW - margin * 2;

    const PRIMARY = [19, 109, 236];
    const PRIMARY_DARK = [12, 85, 180];
    const PRIMARY_LIGHT = [235, 244, 255];
    const SUCCESS = [22, 163, 74];
    const WARNING = [234, 179, 8];
    const DANGER = [220, 38, 38];
    const ORANGE = [249, 115, 22];
    const SLATE_900 = [15, 23, 42];
    const SLATE_600 = [71, 85, 105];
    const SLATE_400 = [148, 163, 184];
    const SLATE_200 = [226, 232, 240];
    const SLATE_50 = [248, 250, 252];
    const WHITE = [255, 255, 255];

    const filledRect = (x, y, w, h, r, color) => {
      doc.setFillColor(...color);
      doc.roundedRect(x, y, w, h, r, r, "F");
    };

    const formatCurrencyPDF = (amt) => {
      const num = typeof amt === "number" ? amt : 0;
      return `NGN ${num.toLocaleString("en-NG")}`;
    };

    const getStatusColor = (status) => {
      switch (status) {
        case "Accepted":
          return SUCCESS;
        case "Pending":
          return WARNING;
        case "Rejected":
          return DANGER;
        case "Partial":
          return ORANGE;
        default:
          return SLATE_600;
      }
    };

    filledRect(0, 0, pageW, 45, 0, PRIMARY_DARK);

    doc
      .setFontSize(18)
      .setFont("helvetica", "bold")
      .setTextColor(...WHITE)
      .text("Primary Colours School", margin, 20);
    doc.setFontSize(11).setFont("helvetica", "normal").setTextColor(220, 235, 255).text("Payment Responses Report", margin, 28);
    doc.setFontSize(7).setTextColor(220, 235, 255);
    doc.text(`Generated: ${new Date().toLocaleString("en-NG")}`, pageW - margin, 20, { align: "right" });
    doc.text(`Records: ${paymentRecords.length}`, pageW - margin, 27, { align: "right" });

    filledRect(margin, 38, contentW, 12, 2, PRIMARY_LIGHT);
    doc
      .setFontSize(7)
      .setFont("helvetica", "bold")
      .setTextColor(...PRIMARY);

    let filterParts = [];
    if (startDate || endDate) filterParts.push(`Date: ${startDate || "Any"} - ${endDate || "Any"}`);
    if (status !== "all") filterParts.push(`Status: ${formatStatus(status)}`);
    if (appliedSearch.trim()) filterParts.push(`Search: "${appliedSearch}"`);

    doc.text(filterParts.length > 0 ? `Filters: ${filterParts.join("  |  ")}` : "Filters: None", margin + 4, 45.5);

    doc
      .setDrawColor(...SLATE_200)
      .setLineWidth(0.3)
      .line(0, 52, pageW, 52);

    const tableStartY = 60;

    const columns = [
      { header: "Child Name", dataKey: "child", width: 32, align: "left" },
      { header: "Class", dataKey: "class", width: 20, align: "left" },
      { header: "Payer", dataKey: "payer", width: 30, align: "left" },
      { header: "Amount", dataKey: "amount", width: 24, align: "right" },
      { header: "Payment Date", dataKey: "paymentDate", width: 24, align: "center" },
      { header: "Date Submitted", dataKey: "submitted", width: 24, align: "center" },
      { header: "Status", dataKey: "status", width: 18, align: "center" },
    ];

    const rows = paymentRecords.map((record) => ({
      child: record.nameOfChild,
      class: record.classId?.name || "N/A",
      payer: record.nameOfPayerOrCompany,
      amount: formatCurrencyPDF(record.totalAmount),
      paymentDate: new Date(record.dateOfPayment).toLocaleDateString("en-NG"),
      submitted: new Date(record.createdAt).toLocaleDateString("en-NG"),
      status: formatStatus(record.status),
    }));

    autoTable(doc, {
      startY: tableStartY,
      head: [columns.map((col) => col.header)],
      body: rows.map((row) => columns.map((col) => row[col.dataKey])),
      theme: "striped",
      headStyles: {
        fillColor: PRIMARY,
        textColor: WHITE,
        fontSize: 7,
        fontStyle: "bold",
        cellPadding: 3,
        lineWidth: 0,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 6.5,
        cellPadding: 2.5,
        textColor: SLATE_900,
        lineWidth: 0.1,
        lineColor: SLATE_200,
      },
      alternateRowStyles: { fillColor: SLATE_50 },
      columnStyles: columns.reduce((acc, col, idx) => {
        acc[idx] = { cellWidth: col.width, halign: col.align, fontStyle: idx === 0 ? "bold" : "normal" };
        return acc;
      }, {}),
      styles: { overflow: "linebreak", halign: "left" },
      margin: { left: margin, right: margin },
      didParseCell: (hookData) => {
        if (hookData.column.index === 6 && hookData.section === "body") {
          hookData.cell.styles.textColor = getStatusColor(hookData.cell.raw);
          hookData.cell.styles.fontStyle = "bold";
        }
        if (hookData.column.index === 3) {
          hookData.cell.styles.halign = "right";
          hookData.cell.styles.fontStyle = "bold";
        }
      },
      didDrawPage: (data) => {
        const footerY = pageH - 15;
        doc
          .setDrawColor(...SLATE_400)
          .setLineWidth(0.2)
          .line(margin, footerY, pageW - margin, footerY);
        doc
          .setFontSize(6)
          .setFont("helvetica", "normal")
          .setTextColor(...SLATE_400);
        doc.text("Primary Colours School • Confidential", margin, footerY + 5);
        doc.text(`Page ${data.pageNumber} of ${data.pageCount}`, pageW - margin, footerY + 5, { align: "right" });
      },
    });

    doc.save(`Payment_Responses_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF exported successfully");
  };

  // ── Full-Page Loading State (Initial Load Only) ────────────────────────
  function ResponsesLoading({ stage }) {
    const messages = {
      initializing: "Initializing payment records...",
      connecting: "Connecting to server...",
      fetching: "Fetching payment records...",
      processing: "Processing records...",
      ready: "Finalizing...",
    };

    const progress = {
      initializing: 10,
      connecting: 25,
      fetching: 50,
      processing: 80,
      ready: 100,
    };

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 p-8">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-[#136dec] rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Database className="w-6 h-6 text-[#136dec] animate-pulse" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700 animate-pulse">{messages[stage] || "Loading payment records..."}</p>
          <p className="text-xs text-slate-400">Please wait while we fetch your payment data</p>
        </div>

        <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#136dec] rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress[stage] || 0}%`,
            }}
          />
        </div>
      </div>
    );
  }

  function InlineLoading() {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin text-[#136dec]" />
        <span className="text-sm font-medium">Updating records...</span>
      </div>
    );
  }

  function EmptyState() {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-4">
        {hasActiveFilters ? (
          <>
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <FilterX size={18} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No records match your filters</p>
              <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search or date range</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearAllFilters} className="text-xs h-8 mt-1">
              Clear all filters
            </Button>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Eye size={18} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No payment records yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Submitted payments will appear here</p>
            </div>
          </>
        )}
      </div>
    );
  }

  if (loading) {
    return <ResponsesLoading stage={loadingStage} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Payment Responses</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Review and accept parent payment submissions</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={paymentRecords.length === 0 || isRefetching}
            className="h-9 px-3 text-xs sm:text-sm border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <Download size={14} className="mr-1.5" />
            Export PDF
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input
                placeholder="Search by child or payer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                className="pl-9 w-full text-xs sm:text-sm"
                disabled={isRefetching}
              />
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSearch}
              disabled={isRefetching}
              className="h-9 px-4 text-xs sm:text-sm bg-[#136dec] hover:bg-[#0f5fce] text-white"
            >
              Search
            </Button>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              disabled={isRefetching}
            >
              <SelectTrigger className="w-full sm:w-[140px] text-xs sm:text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partially_accepted">Partial</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="flex-[1_1_120px] min-w-[120px]">
                <label htmlFor="responses-start-date" className="block text-[10px] sm:text-xs font-medium text-slate-600 mb-1">
                  Start Date
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  <Input
                    id="responses-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9 pr-2 w-full text-xs sm:text-sm bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    aria-label="Start date"
                    disabled={isRefetching}
                  />
                </div>
                {!startDate && <p className="mt-1 text-[10px] text-slate-400">Tap to choose start date</p>}
              </div>
              <span className="text-xs text-slate-400 shrink-0 hidden sm:inline mt-5">to</span>
              <div className="flex-[1_1_120px] min-w-[120px]">
                <label htmlFor="responses-end-date" className="block text-[10px] sm:text-xs font-medium text-slate-600 mb-1">
                  End Date
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  <Input
                    id="responses-end-date"
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9 pr-2 w-full text-xs sm:text-sm bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    aria-label="End date"
                    disabled={isRefetching}
                  />
                </div>
                {!endDate && <p className="mt-1 text-[10px] text-slate-400">Tap to choose end date</p>}
              </div>
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearDates}
                disabled={isRefetching}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 whitespace-nowrap underline underline-offset-2 w-full sm:w-auto text-left sm:text-right disabled:opacity-50"
              >
                Clear dates
              </button>
            )}
          </div>
        </div>

        {/* Mobile / Tablet Card List */}
        <div className="lg:hidden space-y-3">
          {isRefetching ? (
            <InlineLoading />
          ) : paymentRecords.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <EmptyState />
            </div>
          ) : (
            paymentRecords.map((record) => (
              <div
                key={record._id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4"
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{record.nameOfChild}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 truncate mt-0.5">{record.nameOfPayerOrCompany}</p>
                  </div>
                  <Badge className={`${getStatusBadge(record.status)} shrink-0 text-[10px] sm:text-xs px-2 py-0.5 h-auto`}>
                    {formatStatus(record.status)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-3">
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-400">Class</p>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 truncate">{record.classId?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-400">Payment Date</p>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      {new Date(record.dateOfPayment).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-400">Amount</p>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                      ₦{record.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-400">Submitted</p>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(record)}
                  className="w-full text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50 text-xs sm:text-sm h-9"
                  disabled={isRefetching}
                >
                  <Eye size={14} className="mr-2" />
                  View Details
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs whitespace-nowrap">Child Name</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Class</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Payer</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Amount</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Payment Date</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Submitted</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isRefetching ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12">
                      <InlineLoading />
                    </TableCell>
                  </TableRow>
                ) : paymentRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <EmptyState />
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentRecords.map((record) => (
                    <TableRow key={record._id}>
                      <TableCell className="font-medium text-sm whitespace-nowrap">{record.nameOfChild}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{record.classId?.name || "N/A"}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{record.nameOfPayerOrCompany}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">₦{record.totalAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                        {new Date(record.dateOfPayment).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(record.status)}>{formatStatus(record.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                        {new Date(record.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(record)}
                          className="text-blue-600 hover:text-blue-700 text-sm whitespace-nowrap"
                          disabled={isRefetching}
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-slate-500">
              Showing {paymentRecords.length} of {total} records
            </p>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                disabled={page === 1 || isRefetching}
                onClick={() => setPage(page - 1)}
                className="flex-1 sm:flex-none text-xs sm:text-sm h-9"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages || isRefetching}
                onClick={() => setPage(page + 1)}
                className="flex-1 sm:flex-none text-xs sm:text-sm h-9"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="w-[95vw] sm:w-[85vw] md:w-[70vw] max-w-3xl max-h-[90dvh] overflow-x-hidden overflow-y-auto p-3 sm:p-5 md:p-6">
          <DialogHeader className="mb-3 sm:mb-4 pb-2 sm:pb-3 border-b">
            <DialogTitle className="text-sm sm:text-base md:text-lg font-semibold">Payment Record Details</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Review and accept items from this payment submission</DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                {[
                  { label: "Child Name", value: selectedRecord.nameOfChild },
                  { label: "Class", value: selectedRecord.classId?.name || "N/A" },
                  { label: "Payer", value: selectedRecord.nameOfPayerOrCompany },
                  { label: "Session", value: selectedRecord.session },
                  { label: "Payment Date", value: new Date(selectedRecord.dateOfPayment).toLocaleDateString() },
                  { label: "Payment Mode", value: selectedRecord.modeOfPayment.replace(/-/g, " ") },
                ].map(({ label, value }) => (
                  <div key={label} className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">{label}</p>
                    <p className="text-xs sm:text-sm font-medium capitalize truncate">{value}</p>
                  </div>
                ))}
              </div>

              {selectedRecord.paymentEvidenceType && (
                <div className="p-2.5 sm:p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-slate-500 mb-2">Payment Evidence</p>
                  {selectedRecord.paymentEvidenceType === "text" ? (
                    <div className="flex items-start gap-2">
                      <FileText size={14} className="text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-xs sm:text-sm font-mono bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 break-all">
                        {selectedRecord.paymentEvidenceText || "No reference provided"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(() => {
                        const evidenceSrc = getEvidenceImageSrc(selectedRecord);
                        return (
                          <>
                      <div className="flex items-center gap-2">
                        <ImageIcon size={14} className="text-slate-400 shrink-0" />
                        <p className="text-xs text-slate-500">
                          Uploaded: {new Date(selectedRecord.paymentEvidenceUploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {evidenceSrc ? (
                        <img
                          src={evidenceSrc}
                          alt="Payment receipt"
                          className="w-full max-h-48 sm:max-h-60 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(evidenceSrc, "_blank")}
                        />
                      ) : (
                        <div className="flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                          <p className="text-xs text-slate-400">Image not available</p>
                        </div>
                      )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3 pb-2 border-b">
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Payment Items</h4>
                  {selectedRecord.items?.some((i) => i.status === "pending") && (
                    <button
                      type="button"
                      onClick={() => {
                        const ids = selectedRecord.items.filter((i) => i.status === "pending").map((i) => i._id);
                        setSelectedItemIds(ids);
                      }}
                      className="text-[10px] sm:text-xs text-[#136dec] hover:text-[#0f55c0] font-medium whitespace-nowrap"
                    >
                      Select All Pending
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2 max-h-[200px] sm:max-h-[250px] overflow-y-auto pr-1">
                  {selectedRecord.items.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <div className="w-4 h-4 shrink-0">
                        {item.status === "pending" && (
                          <Checkbox
                            checked={selectedItemIds.includes(item._id)}
                            onCheckedChange={(checked) => handleItemSelect(item._id, checked)}
                            className="w-4 h-4"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {item.itemId?.name || "Item"}
                        </p>
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Qty: {item.quantity}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1 min-w-[70px] sm:min-w-[80px]">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          ₦{item.amountAtPayment.toLocaleString()}
                        </p>
                        <Badge className={`${getItemStatusBadge(item.status)} text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 h-auto`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Total Amount</p>
                <p className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white whitespace-nowrap">
                  ₦{selectedRecord.totalAmount.toLocaleString()}
                </p>
              </div>

              {selectedRecord.status !== "pending" && (
                <div className="p-2.5 sm:p-3 md:p-4 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2">
                  <p className="text-[10px] sm:text-xs text-slate-500">Overall Status</p>
                  <Badge className={`${getStatusBadge(selectedRecord.status)} text-xs px-2 py-0.5 h-auto`}>
                    {formatStatus(selectedRecord.status)}
                  </Badge>
                  {(selectedRecord.status === "accepted" || selectedRecord.status === "partially_accepted") &&
                    selectedRecord.acceptedBy && (
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-2 break-words">
                        Accepted by {selectedRecord.acceptedBy.fullName} on {new Date(selectedRecord.acceptedAt).toLocaleDateString()}
                      </p>
                    )}
                  {selectedRecord.status === "rejected" && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] sm:text-xs text-slate-500 break-words">
                        Rejected by {selectedRecord.rejectedBy?.fullName} on {new Date(selectedRecord.rejectedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 break-words">
                        <span className="font-medium">Reason:</span> {selectedRecord.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2">
            {selectedRecord?.items?.some((item) => item.status === "pending") ? (
              <>
                {/* Amount Received input — only show if debt not cleared */}
                {!debtCleared && (
                  <div className="flex flex-col gap-2">
                    {/* Show previously received if any */}
                    {previouslyReceived > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-xs text-slate-500">Already received from this parent</span>
                        <span className="text-xs font-semibold text-slate-700">₦{previouslyReceived.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                      <label className="text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
                        How much did they pay now? (₦) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 25,000"
                        value={amountReceived}
                        onChange={handleAmountChange}
                        className="h-9 text-xs flex-1"
                      />
                    </div>
                    {/* Live preview */}
                    {showPreview && (
                      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 space-y-1">
                        <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">What this means</p>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">Paid now</span>
                          <span className="font-medium text-slate-800">₦{amountReceivedNum.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">Total received from this parent</span>
                          <span className="font-semibold text-green-700">₦{newTotalReceived.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">Still owed</span>
                          <span className={`font-semibold ${newOutstanding > 0 ? "text-red-600" : "text-green-600"}`}>
                            ₦{newOutstanding.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Debt cleared banner */}
                {debtCleared && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle size={14} className="text-green-600 shrink-0" />
                    <span className="text-xs text-green-700 font-medium">Full payment received — no outstanding balance</span>
                  </div>
                )}
                {/* Action buttons row */}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setDetailModalOpen(false)} className="text-xs sm:text-sm h-9">
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={openRejectModal}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs sm:text-sm h-9"
                  >
                    <XCircle size={14} className="mr-1 shrink-0" />
                    <span className="truncate">Reject All Pending</span>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {!debtCleared && (
                    <Button
                      variant="outline"
                      onClick={handleUpdateAmount}
                      disabled={actionLoading}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 text-xs sm:text-sm h-9"
                    >
                      <span className="truncate">Record Payment Only</span>
                    </Button>
                  )}
                  <Button
                    onClick={handleAccept}
                    disabled={selectedItemIds.length === 0 || actionLoading}
                    className={`bg-[#136dec] hover:bg-[#0f55c0] text-white text-xs sm:text-sm h-9 ${debtCleared ? "col-span-2" : ""}`}
                  >
                    {actionLoading
                      ? <Loader2 size={14} className="mr-1 shrink-0 animate-spin" />
                      : <CheckCircle size={14} className="mr-1 shrink-0" />}
                    <span className="truncate">{actionLoading ? "Processing..." : `Accept Items (${selectedItemIds.length})`}</span>
                  </Button>
                </div>
                {/* Receipt button for partially accepted records that still have pending items */}
                {selectedRecord?.status === "partially_accepted" && selectedRecord?.items?.some((item) => item.status === "accepted") && (
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={receiptLoading}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 text-xs sm:text-sm h-9"
                        >
                          {receiptLoading
                            ? <Loader2 size={14} className="mr-1.5 shrink-0 animate-spin" />
                            : <Receipt size={14} className="mr-1.5 shrink-0" />}
                          <span className="truncate">{receiptLoading ? "Preparing..." : "Receipt"}</span>
                          <ChevronDown size={13} className="ml-1.5 shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              setReceiptLoading(true);
                              await generateReceiptPDF(selectedRecord, "share");
                            } catch (err) {
                              console.error("Receipt generation failed:", err);
                              toast.error("Failed to generate receipt");
                            } finally {
                              setReceiptLoading(false);
                            }
                          }}
                        >
                          <Share2 size={13} className="mr-2" />
                          Send Receipt
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              setReceiptLoading(true);
                              await generateReceiptPDF(selectedRecord, "download");
                            } catch (err) {
                              console.error("Receipt generation failed:", err);
                              toast.error("Failed to generate receipt");
                            } finally {
                              setReceiptLoading(false);
                            }
                          }}
                        >
                          <Download size={13} className="mr-2" />
                          Download
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
                {selectedRecord?.items?.some((item) => item.status === "accepted") && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={receiptLoading}
                        className="w-full sm:w-auto text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 text-xs sm:text-sm h-9"
                      >
                        {receiptLoading
                          ? <Loader2 size={14} className="mr-1.5 shrink-0 animate-spin" />
                          : <Receipt size={14} className="mr-1.5 shrink-0" />}
                        <span className="truncate">{receiptLoading ? "Preparing..." : "Receipt"}</span>
                        <ChevronDown size={13} className="ml-1.5 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            setReceiptLoading(true);
                            await generateReceiptPDF(selectedRecord, "share");
                          } catch (err) {
                            console.error("Receipt generation failed:", err);
                            toast.error("Failed to generate receipt");
                          } finally {
                            setReceiptLoading(false);
                          }
                        }}
                      >
                        <Share2 size={13} className="mr-2" />
                        Send Receipt
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            setReceiptLoading(true);
                            await generateReceiptPDF(selectedRecord, "download");
                          } catch (err) {
                            console.error("Receipt generation failed:", err);
                            toast.error("Failed to generate receipt");
                          } finally {
                            setReceiptLoading(false);
                          }
                        }}
                      >
                        <Download size={13} className="mr-2" />
                        Download
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button variant="outline" onClick={() => setDetailModalOpen(false)} className="w-full sm:w-auto text-xs sm:text-sm h-9">
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="w-[95vw] sm:w-[85vw] max-w-md max-h-[90dvh] overflow-x-hidden overflow-y-auto p-3 sm:p-5 md:p-6">
          <DialogHeader className="mb-3 sm:mb-4 pb-2 sm:pb-3 border-b">
            <DialogTitle className="text-sm sm:text-base font-semibold">Reject Pending Items</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Provide a reason for rejecting the remaining pending items</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 mt-2">
            <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle className="text-yellow-600 mt-0.5 shrink-0" size={16} />
              <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400">
                This will reject ALL pending items in this payment record. Already accepted items will remain approved. This action cannot
                be undone.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Amount Received (₦) <span className="text-red-500">*</span></label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 2,000"
                value={amountReceived}
                onChange={handleAmountChange}
                className="text-xs sm:text-sm"
              />
              <p className="text-[10px] text-slate-400">Enter the exact amount received in the school's bank account</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Rejection Reason <span className="text-red-500">*</span></label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Payment amount does not match..."
                className="w-full min-h-[80px] sm:min-h-[100px] p-2.5 sm:p-3 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)} className="w-full sm:w-auto text-xs sm:text-sm h-9">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading} className="w-full sm:w-auto text-xs sm:text-sm h-9">
              {actionLoading ? "Processing..." : "Reject Pending Items"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={confirmModalOpen} onOpenChange={(open) => { if (!open) { setConfirmModalOpen(false); setPendingAction(null); } }}>
        <DialogContent className="w-[95vw] sm:w-[85vw] max-w-md p-4 sm:p-6">
          <DialogHeader className="mb-3 pb-3 border-b">
            <DialogTitle className="text-sm sm:text-base font-semibold">
              {pendingAction?.type === "accept" ? "Confirm Payment Acceptance" : "Confirm Payment Recording"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Please check the details below before confirming.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Payment breakdown — only show if amount was entered or debt was already cleared */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 divide-y divide-slate-200">
              {debtCleared ? (
                <div className="flex justify-between px-3 py-2 bg-green-50">
                  <span className="text-xs font-medium text-slate-700">Total received from this parent</span>
                  <span className="text-xs font-bold text-green-700">₦{previouslyReceived.toLocaleString()}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-xs text-slate-500">Amount paid now</span>
                    <span className="text-xs font-semibold text-slate-800">₦{amountReceivedNum.toLocaleString()}</span>
                  </div>
                  {previouslyReceived > 0 && (
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-xs text-slate-500">Previously received</span>
                      <span className="text-xs font-medium text-slate-600">₦{previouslyReceived.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 py-2 bg-green-50">
                    <span className="text-xs font-medium text-slate-700">Total received from this parent</span>
                    <span className="text-xs font-bold text-green-700">₦{newTotalReceived.toLocaleString()}</span>
                  </div>
                  <div className={`flex justify-between px-3 py-2 ${newOutstanding > 0 ? "bg-red-50" : "bg-green-50"}`}>
                    <span className="text-xs font-medium text-slate-700">Still owed</span>
                    <span className={`text-xs font-bold ${newOutstanding > 0 ? "text-red-600" : "text-green-600"}`}>
                      ₦{newOutstanding.toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Items being accepted */}
            {pendingAction?.type === "accept" && pendingAction.itemIds.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">Items being approved:</p>
                {selectedRecord?.items
                  ?.filter((item) => pendingAction.itemIds.includes(item._id))
                  .map((item) => (
                    <div key={item._id} className="flex justify-between px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                      <span className="text-xs text-slate-700">{item.itemId?.name || "Item"}</span>
                      <span className="text-xs font-medium text-slate-700">₦{item.amountAtPayment.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            )}

            {pendingAction?.type === "update-amount" && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-700">
                  No items will be approved. Only the payment amount will be updated on this record.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => { setConfirmModalOpen(false); setPendingAction(null); }}
              className="flex-1 text-xs sm:text-sm h-9"
            >
              Go Back
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={actionLoading}
              className="flex-1 bg-[#136dec] hover:bg-[#0f55c0] text-white text-xs sm:text-sm h-9"
            >
              {actionLoading
                ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Processing...</>
                : "Yes, Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-slate-200">
        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          © {new Date().getFullYear()} Findora · Primary Colours Schools
        </p>
        <div className="flex gap-4 sm:gap-5">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Privacy Policy</p>
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            System Status: <span className="text-emerald-500">Normal</span>
          </p>
        </div>
      </div>
    </div>
  );
}
