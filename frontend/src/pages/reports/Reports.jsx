/* eslint-disable no-unused-vars */
import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Download,
  Calendar,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  Package,
  TrendingUp,
  Percent,
  RefreshCw,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { getPaymentSummary } from "@/services/reports.service";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getAllClasses } from "@/services/classes.service";

// ─── Mock Data ─────────────────────────────────────────────────────────────
const MOCK_DATA = {
  summary: {
    totalAmount: 12500000,
    acceptedCount: 450,
    pendingCount: 32,
    rejectedCount: 8,
    acceptedAmount: 11800000,
    pendingAmount: 450000,
    rejectedAmount: 250000,
    totalCount: 490,
    paymentModes: {
      bank: { count: 290, amount: 8100000, percentage: 65 },
      cash: { count: 90, amount: 1500000, percentage: 12 },
      pos: { count: 50, amount: 600000, percentage: 5 },
      other: { count: 20, amount: 250000, percentage: 2 },
    },
  },
  itemFulfillment: {
    totalItems: 1240,
    collected: 980,
    pending: 210,
    unassigned: 50,
    collectionRate: 79,
  },
  topPendingItems: [
    { name: "Uniform SS1", count: 45 },
    { name: "Textbooks JSS2", count: 32 },
    { name: "School Meals", count: 28 },
    { name: "Sports Kit", count: 19 },
    { name: "Lab Coat", count: 15 },
  ],
  byClass: [
    {
      _id: "1",
      className: "Infant - Baby",
      paymentsAccepted: 45,
      paymentsPending: 3,
      paymentsRejected: 1,
      totalAmount: 2400000,
      itemsAccepted: 180,
      itemsCollected: 160,
      itemsPending: 15,
      completionRate: 88.9,
      statusBadge: "good",
    },
    {
      _id: "2",
      className: "Primary - JSS1",
      paymentsAccepted: 38,
      paymentsPending: 4,
      paymentsRejected: 2,
      totalAmount: 1900000,
      itemsAccepted: 152,
      itemsCollected: 120,
      itemsPending: 25,
      completionRate: 78.9,
      statusBadge: "follow-up",
    },
    {
      _id: "3",
      className: "Secondary - SS2",
      paymentsAccepted: 22,
      paymentsPending: 18,
      paymentsRejected: 5,
      totalAmount: 1100000,
      itemsAccepted: 88,
      itemsCollected: 60,
      itemsPending: 20,
      completionRate: 68.2,
      statusBadge: "urgent",
    },
    {
      _id: "4",
      className: "Primary - JSS2",
      paymentsAccepted: 30,
      paymentsPending: 2,
      paymentsRejected: 0,
      totalAmount: 1500000,
      itemsAccepted: 120,
      itemsCollected: 115,
      itemsPending: 3,
      completionRate: 95.8,
      statusBadge: "good",
    },
    {
      _id: "5",
      className: "Infant - Nursery",
      paymentsAccepted: 28,
      paymentsPending: 5,
      paymentsRejected: 0,
      totalAmount: 1400000,
      itemsAccepted: 112,
      itemsCollected: 95,
      itemsPending: 12,
      completionRate: 84.8,
      statusBadge: "good",
    },
  ],
  totalRecords: 490,
};

// ─── Mock Classes (for Mock Mode) ──────────────────────────────────────────
const MOCK_CLASSES = [
  { _id: "1", name: "Infant - Baby" },
  { _id: "2", name: "Primary - JSS1" },
  { _id: "3", name: "Secondary - SS2" },
  { _id: "4", name: "Primary - JSS2" },
  { _id: "5", name: "Infant - Nursery" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
const formatCurrency = (amount) => `₦${amount?.toLocaleString() ?? "0"}`;

const getStatusBadgeConfig = (status) => {
  const configs = {
    good: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", label: "On Track" },
    "follow-up": { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "Follow-up" },
    urgent: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Urgent" },
  };
  return configs[status] || configs["follow-up"];
};

const PAYMENT_MODE_COLORS = {
  bank: "#136dec",
  cash: "#22c55e",
  pos: "#f59e0b",
  other: "#64748b",
};

const PAYMENT_MODE_LABELS = {
  bank: "Bank Transfer",
  cash: "Cash",
  pos: "POS",
  other: "Other",
};

export default function Reports() {
  const [useMockData, setUseMockData] = useState(true);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", classId: "all", status: "all" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ← NEW: Classes state
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  // ── Fetch Classes (Live Mode Only) ───────────────────────────────────────
  useEffect(() => {
    if (!useMockData) {
      const fetchClasses = async () => {
        setClassesLoading(true);
        try {
          // ← Use your existing function name
          const res = await getAllClasses();

          // ← Handle YOUR response shape: { message, classes: [...] }
          const classList = res?.classes || res?.data?.classes || [];
          setClasses(classList);
        } catch (err) {
          console.error("Failed to fetch classes:", err);
          toast.error("Could not load classes");
          setClasses(MOCK_CLASSES); // Fallback
        } finally {
          setClassesLoading(false);
        }
      };
      fetchClasses();
    } else {
      setClasses(MOCK_CLASSES);
    }
  }, [useMockData]);

  // ── Fetch Report ─────────────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    if (!filters.startDate || !filters.endDate) {
      toast.error("Please select a date range");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (useMockData) {
        await new Promise((r) => setTimeout(r, 800));
        setData(MOCK_DATA);
        toast.success("Mock report generated");
      } else {
        const params = {
          startDate: filters.startDate,
          endDate: filters.endDate,
        };
        if (filters.classId && filters.classId !== "all") params.classId = filters.classId;
        if (filters.status && filters.status !== "all") params.status = filters.status;

        const res = await getPaymentSummary(params);
        setData(res);
        toast.success("Report generated successfully");
      }
    } catch (err) {
      setError(err.message || "Failed to fetch report");
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [filters, useMockData]);

  const handleExportPDF = useCallback(async () => {
    if (!data) return toast.error("Generate a report first");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentW = pageW - margin * 2;

    const BLUE = [19, 109, 236];
    const BLUE_DARK = [12, 85, 180];
    const BLUE_LIGHT = [235, 244, 255];
    const SLATE_900 = [15, 23, 42];
    const SLATE_600 = [71, 85, 105];
    const SLATE_400 = [148, 163, 184];
    const SLATE_50 = [248, 250, 252];
    const WHITE = [255, 255, 255];
    const GREEN = [22, 163, 74];
    const AMBER = [217, 119, 6];
    const RED = [220, 38, 38];

    const loadImage = (src) =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext("2d").drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => resolve(null);
        img.src = src;
      });

    const filledRect = (x, y, w, h, r, fillColor) => {
      doc.setFillColor(...fillColor);
      doc.roundedRect(x, y, w, h, r, r, "F");
    };

    const sectionHeading = (label, y) => {
      filledRect(margin, y, contentW, 8, 2, BLUE_LIGHT);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BLUE);
      doc.text(label, margin + 4, y + 5.5);
      return y + 13;
    };

    const formatCurrencyPDF = (amount) => {
      const num = typeof amount === "number" ? amount : 0;
      return `NGN ${num.toLocaleString()}`;
    };

    const statCard = (x, y, w, label, value, accentColor, isCurrency = false) => {
      filledRect(x, y, w, 22, 3, SLATE_50);
      doc.setDrawColor(...accentColor);
      doc.setLineWidth(0.8);
      doc.line(x + 0.4, y + 2, x + 0.4, y + 20);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...SLATE_600);
      doc.text(label, x + 4, y + 8);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...accentColor);
      const displayValue = isCurrency ? formatCurrencyPDF(value) : String(value);
      doc.text(displayValue, x + 4, y + 17);
    };

    const badgeData = await loadImage("/primarcoloursbadge.png");

    filledRect(0, 0, pageW, 42, 0, BLUE_DARK);

    if (badgeData) {
      doc.addImage(badgeData, "PNG", margin, 6, 22, 22);
    }

    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text("Primary Colours School", margin + 26, 15);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 235, 255);
    doc.text("Payment & Fulfillment Report", margin + 26, 22);

    const dateStr = `${format(new Date(filters.startDate), "PP")} – ${format(new Date(filters.endDate), "PP")}`;
    doc.setFontSize(7.5);
    doc.setTextColor(220, 235, 255);
    doc.text(`Period: ${dateStr}`, pageW - margin, 15, { align: "right" });
    doc.text(`Status: ${filters.status === "all" ? "All" : filters.status}`, pageW - margin, 21, { align: "right" });
    doc.text(`Generated: ${format(new Date(), "PPp")}`, pageW - margin, 27, { align: "right" });

    doc.setDrawColor(...BLUE_LIGHT);
    doc.setLineWidth(0.3);
    doc.line(0, 42, pageW, 42);

    let y = 50;

    y = sectionHeading("1.  Financial Summary", y);

    const cardW = (contentW - 9) / 4;
    statCard(margin, y, cardW, "Total Collected", data.summary.totalAmount, BLUE, true);
    statCard(margin + cardW + 3, y, cardW, "Accepted", data.summary.acceptedCount, GREEN);
    statCard(margin + (cardW + 3) * 2, y, cardW, "Pending", data.summary.pendingCount, AMBER);
    statCard(margin + (cardW + 3) * 3, y, cardW, "Rejected", data.summary.rejectedCount, RED);
    y += 28;

    filledRect(margin, y, contentW, 10, 2, SLATE_50);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_600);
    doc.text(`Accepted: ${formatCurrencyPDF(data.summary.acceptedAmount)}`, margin + 4, y + 6.5);
    doc.text(`Pending: ${formatCurrencyPDF(data.summary.pendingAmount)}`, pageW / 2, y + 6.5, { align: "center" });
    doc.text(`Rejected: ${formatCurrencyPDF(data.summary.rejectedAmount)}`, pageW - margin - 4, y + 6.5, { align: "right" });
    y += 16;

    if (data.summary.paymentModes) {
      const modes = Object.entries(data.summary.paymentModes).filter(([, v]) => v.count > 0);
      if (modes.length > 0) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...SLATE_900);
        doc.text("Payment Methods", margin, y);
        y += 5;

        const colW = contentW / 2;
        modes.forEach(([mode, info], idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const cx = margin + col * colW;
          const cy = y + row * 8;

          filledRect(cx, cy, colW - 3, 7, 1.5, SLATE_50);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...SLATE_600);
          doc.text(`${PAYMENT_MODE_LABELS[mode] || mode}`, cx + 3, cy + 4.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...SLATE_900);
          doc.text(`${info.count} • ${info.percentage}% • ${formatCurrencyPDF(info.amount)}`, cx + colW - 5, cy + 4.5, { align: "right" });
        });
        y += Math.ceil(modes.length / 2) * 8 + 8;
      }
    }

    y = sectionHeading("2.  Item Fulfillment", y);

    const fW = (contentW - 6) / 3;
    statCard(margin, y, fW, "Total Items", data.itemFulfillment.totalItems, BLUE);
    statCard(margin + fW + 3, y, fW, "Collected", `${data.itemFulfillment.collected} (${data.itemFulfillment.collectionRate}%)`, GREEN);
    statCard(margin + fW * 2 + 6, y, fW, "Pending", data.itemFulfillment.pending, AMBER);
    y += 28;

    if (data.topPendingItems?.length > 0) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SLATE_900);
      doc.text("Items Pending Distribution", margin, y);
      y += 5;

      data.topPendingItems.slice(0, 5).forEach((item, idx) => {
        const barMaxW = contentW - 60;
        const barW = Math.max(2, (item.count / data.topPendingItems[0].count) * barMaxW);

        filledRect(margin, y, contentW, 7, 1.5, SLATE_50);

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...SLATE_900);
        doc.text(`${idx + 1}.  ${item.name}`, margin + 3, y + 4.8);

        filledRect(margin + contentW - 55, y + 2, 40, 3, 1, [219, 234, 254]);
        filledRect(margin + contentW - 55, y + 2, Math.min(40, barW * 0.6), 3, 1, BLUE);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BLUE);
        doc.text(`${item.count} pending`, pageW - margin - 3, y + 4.8, { align: "right" });

        y += 9;
      });
      y += 4;
    }

    y = sectionHeading("3.  Class Breakdown", y);

    autoTable(doc, {
      startY: y,
      head: [["Class", "Accepted", "Pending", "Rejected", "Items", "Rate", "Amount"]],
      body: data.byClass.map((row) => [
        row.className || "N/A",
        row.paymentsAccepted ?? "—",
        row.paymentsPending ?? "—",
        row.paymentsRejected ?? "—",
        `${row.itemsCollected ?? "—"} / ${row.itemsAccepted ?? "—"}`,
        `${row.completionRate ?? 0}%`,
        formatCurrencyPDF(row.totalAmount ?? 0),
      ]),
      theme: "striped",
      headStyles: {
        fillColor: BLUE,
        textColor: WHITE,
        fontSize: 7.5,
        fontStyle: "bold",
        cellPadding: 3,
        lineWidth: 0,
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 2.5,
        textColor: SLATE_900,
        lineWidth: 0,
      },
      alternateRowStyles: {
        fillColor: SLATE_50,
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 40 },
        1: { halign: "center", cellWidth: 18 },
        2: { halign: "center", cellWidth: 18 },
        3: { halign: "center", cellWidth: 18 },
        4: { halign: "center", cellWidth: 22 },
        5: { halign: "center", cellWidth: 18 },
        6: { halign: "right", fontStyle: "bold", cellWidth: 25 },
      },
      styles: {
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
        overflow: "linebreak",
        halign: "left",
      },
      margin: { left: margin, right: margin },
      didParseCell: (hookData) => {
        if (hookData.column.index === 5 && hookData.section === "body") {
          const val = parseFloat(hookData.cell.raw);
          if (val >= 80) hookData.cell.styles.textColor = GREEN;
          else if (val >= 40) hookData.cell.styles.textColor = AMBER;
          else hookData.cell.styles.textColor = RED;
        }
      },
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(...SLATE_400);
      doc.setLineWidth(0.2);
      doc.line(margin, pageH - 12, pageW - margin, pageH - 12);

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...SLATE_400);
      doc.text("Primary Colours School • Confidential", margin, pageH - 7);
      doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 7, { align: "right" });
    }

    doc.save(
      `PrimaryColours_Report_${format(new Date(filters.startDate), "yyyy-MM-dd")}_to_${format(new Date(filters.endDate), "yyyy-MM-dd")}.pdf`,
    );
    toast.success("Report downloaded successfully");
  }, [data, filters]);

  // ── Pie Chart Data ───────────────────────────────────────────────────────
  const paymentModeChartData = useMemo(() => {
    if (!data?.summary?.paymentModes) return [];
    return Object.entries(data.summary.paymentModes)
      .filter(([_, info]) => info.count > 0)
      .map(([mode, info]) => ({
        name: PAYMENT_MODE_LABELS[mode],
        value: info.percentage,
        color: PAYMENT_MODE_COLORS[mode],
      }));
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* ── Header & Controls ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="text-[#136dec]" size={24} />
              Reports
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Payment collection, item fulfillment & class performance
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Mock/Live Toggle */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setUseMockData(true)}
                className={`px-2.5 py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
                  useMockData ? "bg-[#136dec] text-white" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Mock
              </button>
              <button
                onClick={() => setUseMockData(false)}
                className={`px-2.5 py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
                  !useMockData ? "bg-[#136dec] text-white" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Live
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchReport}
              disabled={loading}
              className="h-8 px-3 text-[10px] sm:text-xs border-slate-200 dark:border-slate-700"
            >
              <RefreshCw size={12} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            {/* ── MOVED HERE: Export PDF (only shows when data exists) ── */}
            {data && !loading && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="h-8 px-3 text-[10px] sm:text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Download size={14} className="mr-1.5" />
                Export PDF
              </Button>
            )}
          </div>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full h-9 px-3 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#136dec]/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full h-9 px-3 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#136dec]/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">Class</label>
              <Select
                value={filters.classId}
                onValueChange={(v) => setFilters({ ...filters, classId: v })}
                disabled={classesLoading && !useMockData}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder={classesLoading && !useMockData ? "Loading..." : "All Classes"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {/* ← DYNAMIC CLASS OPTIONS */}
                  {classes.map((cls) => (
                    <SelectItem key={cls._id} value={cls._id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button
              onClick={fetchReport}
              disabled={loading}
              className="h-9 px-4 bg-[#136dec] hover:bg-[#0f55c0] text-white text-xs sm:text-sm"
            >
              <Filter size={14} className="mr-1.5" />
              {loading ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </div>

        {/* ── Error State ─────────────────────────────────────────────────── */}
        {error && (
          <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-400">Failed to load report</p>
              <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── SECTION 1: Financial Summary ────────────────────────────────── */}
        {data && !loading && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: "Total Collected", value: formatCurrency(data.summary.totalAmount), icon: BarChart3, color: "text-[#136dec]" },
                {
                  label: "Accepted",
                  value: data.summary.acceptedCount,
                  sub: `₦${data.summary.acceptedAmount.toLocaleString()}`,
                  icon: CheckCircle,
                  color: "text-green-600",
                },
                {
                  label: "Pending",
                  value: data.summary.pendingCount,
                  sub: `₦${data.summary.pendingAmount.toLocaleString()}`,
                  icon: Clock,
                  color: "text-yellow-600",
                },
                {
                  label: "Rejected",
                  value: data.summary.rejectedCount,
                  sub: `₦${data.summary.rejectedAmount.toLocaleString()}`,
                  icon: XCircle,
                  color: "text-red-600",
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 flex items-center gap-3"
                >
                  <div className={`w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${card.color}`}>
                    <card.icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">{card.value}</p>
                    {card.sub && <p className="text-[10px] text-slate-400">{card.sub}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Mode Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Percent size={14} className="text-[#136dec]" />
                  Payment Mode Breakdown
                </h3>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentModeChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2} dataKey="value">
                        {paymentModeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value) => [`${value}%`, "Percentage"]}
                        contentStyle={{ fontSize: "11px", borderRadius: "6px", border: "1px solid #e2e8f0" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "10px" }} verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(data.summary.paymentModes).map(([mode, info]) => (
                    <div key={mode} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PAYMENT_MODE_COLORS[mode] }} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{PAYMENT_MODE_LABELS[mode]}</p>
                        <p className="text-[10px] text-slate-400">
                          {info.count} payments • {info.percentage}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 2: Item Fulfillment ─────────────────────────────────── */}
        {data && !loading && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Package size={14} className="text-[#136dec]" />
              Item Fulfillment
            </h3>

            {/* Progress Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Total Items", value: data.itemFulfillment.totalItems, color: "text-slate-600" },
                {
                  label: "Collected",
                  value: data.itemFulfillment.collected,
                  percent: data.itemFulfillment.collectionRate,
                  color: "text-green-600",
                },
                { label: "Pending", value: data.itemFulfillment.pending, color: "text-yellow-600" },
              ].map((stat, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-slate-500">{stat.label}</p>
                  <p className={`text-lg sm:text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  {stat.percent !== undefined && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Collection Rate</span>
                        <span>{stat.percent}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${Math.min(stat.percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Top Pending Items */}
            {data.topPendingItems?.length > 0 && (
              <div>
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-2">Top Pending Items</p>
                <div className="flex flex-wrap gap-2">
                  {data.topPendingItems.slice(0, 5).map((item, i) => (
                    <Badge
                      key={i}
                      className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-[10px] sm:text-xs px-2 py-1 h-auto"
                    >
                      {item.name}: {item.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 3: Class Breakdown ──────────────────────────────────── */}
        {data && !loading && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp size={14} className="text-[#136dec]" />
                Class Breakdown
              </h3>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] sm:text-xs whitespace-nowrap">Class</TableHead>
                    <TableHead className="text-[10px] sm:text-xs text-center whitespace-nowrap">Payments</TableHead>
                    <TableHead className="text-[10px] sm:text-xs text-center whitespace-nowrap">Items Collected</TableHead>
                    <TableHead className="text-[10px] sm:text-xs text-center whitespace-nowrap">Completion</TableHead>
                    <TableHead className="text-[10px] sm:text-xs text-center whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-[10px] sm:text-xs text-right whitespace-nowrap">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byClass.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs sm:text-sm text-slate-400">
                        No data found for selected filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.byClass.map((row) => {
                      const badge = getStatusBadgeConfig(row.statusBadge);
                      return (
                        <TableRow key={row._id}>
                          <TableCell className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {row.className || "N/A"}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-center">
                            <span className="font-medium">{row.paymentsAccepted}</span>
                            {row.paymentsPending > 0 && (
                              <span className="text-[10px] text-yellow-600 ml-1">+{row.paymentsPending} pending</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-center">
                            <span className="font-medium">{row.itemsCollected}</span>
                            <span className="text-[10px] text-slate-400">/{row.itemsAccepted}</span>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-center">
                            <div className="flex items-center justify-center gap-1">
                              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${row.completionRate >= 80 ? "bg-green-500" : row.completionRate >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                                  style={{ width: `${Math.min(row.completionRate, 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-medium">{row.completionRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-center">
                            <Badge className={`${badge?.bg} ${badge?.text} ${badge?.border} text-[10px] sm:text-xs px-2 py-0.5 h-auto`}>
                              {badge?.label || row.statusBadge}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {formatCurrency(row.totalAmount)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                Showing {data.byClass.length} classes • {data.totalRecords} total records
              </p>
              <p className="text-[10px] sm:text-xs text-slate-400">
                Period:{" "}
                {filters.startDate && filters.endDate
                  ? `${format(new Date(filters.startDate), "PP")} - ${format(new Date(filters.endDate), "PP")}`
                  : "All"}
              </p>
            </div>
          </div>
        )}

        {/* ── Loading Skeleton ───────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            {/* Summary Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 flex items-center gap-3"
                >
                  <div className="w-9 h-9 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <div className="h-2 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
            {/* Chart Skeleton */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 h-48" />
            {/* Item Fulfillment Skeleton */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2">
                    <div className="h-2 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-5 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                ))}
              </div>
            </div>
            {/* Table Skeleton */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded mb-2" />
              ))}
            </div>
          </div>
        )}

        {/* ── Empty State (Initial) ──────────────────────────────────────── */}
        {!data && !loading && !error && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 sm:p-12 text-center">
            <Calendar className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
            <h3 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">No report generated yet</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Select a date range and click "Generate Report" to view payment summaries, item fulfillment, and class breakdowns.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
