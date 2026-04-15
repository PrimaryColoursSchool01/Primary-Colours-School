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

// ─── Helpers ───────────────────────────────────────────────────────────────
const formatCompactCurrency = (amount, currency = "₦") => {
  if (!amount && amount !== 0) return `${currency}0`;
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${currency}${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (abs >= 1_000_000) return `${currency}${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${currency}${(amount / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${currency}${amount.toLocaleString()}`;
};

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
  const [filters, setFilters] = useState({ startDate: "", endDate: "", classId: "all", status: "all" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);

  // Fetch classes from API
  useEffect(() => {
    const fetchClasses = async () => {
      setClassesLoading(true);
      try {
        const res = await getAllClasses();
        const classList = res?.classes || res?.data?.classes || [];
        setClasses(classList);
      } catch (err) {
        console.error("Failed to fetch classes:", err);
        toast.error("Could not load classes");
      } finally {
        setClassesLoading(false);
      }
    };
    fetchClasses();
  }, []);

  // Fetch report from API
  const fetchReport = useCallback(async () => {
    if (!filters.startDate || !filters.endDate) {
      toast.error("Please select a date range");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
      if (filters.classId && filters.classId !== "all") params.classId = filters.classId;
      if (filters.status && filters.status !== "all") params.status = filters.status;

      const res = await getPaymentSummary(params);
      setData(res.data);
      toast.success("Report generated successfully");
    } catch (err) {
      setError(err.message || "Failed to fetch report");
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // PDF Export
  const handleExportPDF = useCallback(async () => {
    if (!data) return toast.error("Generate a report first");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentW = pageW - margin * 2;

    const BLUE = [19, 109, 236],
      BLUE_DARK = [12, 85, 180],
      BLUE_LIGHT = [235, 244, 255];
    const SLATE_900 = [15, 23, 42],
      SLATE_600 = [71, 85, 105],
      SLATE_400 = [148, 163, 184],
      SLATE_50 = [248, 250, 252],
      WHITE = [255, 255, 255];
    const GREEN = [22, 163, 74],
      AMBER = [217, 119, 6],
      RED = [220, 38, 38],
      ORANGE = [249, 115, 22];

    const filledRect = (x, y, w, h, r, c) => {
      doc.setFillColor(...c);
      doc.roundedRect(x, y, w, h, r, r, "F");
    };
    const sectionHeading = (label, y) => {
      filledRect(margin, y, contentW, 8, 2, BLUE_LIGHT);
      doc
        .setFontSize(9)
        .setFont("helvetica", "bold")
        .setTextColor(...BLUE);
      doc.text(label, margin + 4, y + 5.5);
      return y + 13;
    };
    const formatCurrencyPDF = (amt) => `NGN ${typeof amt === "number" ? amt.toLocaleString() : "0"}`;
    const statCard = (x, y, w, label, value, accent) => {
      filledRect(x, y, w, 22, 3, SLATE_50);
      doc
        .setDrawColor(...accent)
        .setLineWidth(0.8)
        .line(x + 0.4, y + 2, x + 0.4, y + 20);
      doc
        .setFontSize(7)
        .setFont("helvetica", "normal")
        .setTextColor(...SLATE_600)
        .text(label, x + 4, y + 8);
      doc
        .setFontSize(11)
        .setFont("helvetica", "bold")
        .setTextColor(...accent);
      doc.text(String(value), x + 4, y + 17);
    };

    // Header
    filledRect(0, 0, pageW, 42, 0, BLUE_DARK);
    doc
      .setFontSize(15)
      .setFont("helvetica", "bold")
      .setTextColor(...WHITE)
      .text("Primary Colours School", margin, 15);
    doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(220, 235, 255).text("Payment & Fulfillment Report", margin, 22);
    doc.setFontSize(7.5).setTextColor(220, 235, 255);
    doc.text(`Period: ${format(new Date(filters.startDate), "PP")} – ${format(new Date(filters.endDate), "PP")}`, pageW - margin, 15, {
      align: "right",
    });
    doc.text(`Generated: ${format(new Date(), "PPp")}`, pageW - margin, 21, { align: "right" });
    doc
      .setDrawColor(...BLUE_LIGHT)
      .setLineWidth(0.3)
      .line(0, 42, pageW, 42);

    let y = 50;
    const pdfSummary = data.summary || {};

    // Section 1: Financial Summary
    y = sectionHeading("1.  Financial Summary", y);
    const cardW = (contentW - 12) / 5;
    statCard(margin, y, cardW, "Total", pdfSummary.totalCount || 0, BLUE);
    statCard(margin + cardW + 3, y, cardW, "Accepted", pdfSummary.acceptedCount || 0, GREEN);
    statCard(margin + (cardW + 3) * 2, y, cardW, "Partial", pdfSummary.partiallyAcceptedCount || 0, ORANGE);
    statCard(margin + (cardW + 3) * 3, y, cardW, "Pending", pdfSummary.pendingCount || 0, AMBER);
    statCard(margin + (cardW + 3) * 4, y, cardW, "Rejected", pdfSummary.rejectedCount || 0, RED);
    y += 28;

    // Revenue summary row
    filledRect(margin, y, contentW, 10, 2, SLATE_50);
    doc
      .setFontSize(7.5)
      .setFont("helvetica", "normal")
      .setTextColor(...SLATE_600);
    doc.text(`Recognized: ${formatCurrencyPDF(pdfSummary.totalAmount || 0)}`, margin + 4, y + 6.5);
    doc.text(`Pending: ${formatCurrencyPDF(pdfSummary.pendingRevenue || 0)}`, pageW / 2, y + 6.5, { align: "center" });
    doc.text(
      `Total Potential: ${formatCurrencyPDF((pdfSummary.totalAmount || 0) + (pdfSummary.pendingRevenue || 0))}`,
      pageW - margin - 4,
      y + 6.5,
      { align: "right" },
    );
    y += 16;

    // Payment modes
    if (pdfSummary.paymentModes) {
      const modes = Object.entries(pdfSummary.paymentModes).filter(([, v]) => v.count > 0);
      if (modes.length > 0) {
        doc
          .setFontSize(8)
          .setFont("helvetica", "bold")
          .setTextColor(...SLATE_900)
          .text("Payment Methods", margin, y);
        y += 5;
        const colW = contentW / 2;
        modes.forEach(([mode, info], idx) => {
          const col = idx % 2,
            row = Math.floor(idx / 2);
          const cx = margin + col * colW,
            cy = y + row * 8;
          filledRect(cx, cy, colW - 3, 7, 1.5, SLATE_50);
          doc
            .setFontSize(7)
            .setFont("helvetica", "normal")
            .setTextColor(...SLATE_600)
            .text(`${PAYMENT_MODE_LABELS[mode] || mode}`, cx + 3, cy + 4.5);
          doc.setFont("helvetica", "bold").setTextColor(...SLATE_900);
          doc.text(`${info.count} • ${info.percentage}% • ${formatCurrencyPDF(info.amount)}`, cx + colW - 5, cy + 4.5, { align: "right" });
        });
        y += Math.ceil(modes.length / 2) * 8 + 8;
      }
    }

    // Section 2: Item Fulfillment
    if (data.itemFulfillment) {
      y = sectionHeading("2.  Item Fulfillment", y);
      const fW = (contentW - 6) / 3;
      statCard(margin, y, fW, "Total Items", data.itemFulfillment.totalItems || 0, BLUE);
      statCard(
        margin + fW + 3,
        y,
        fW,
        "Collected",
        `${data.itemFulfillment.collected || 0} (${data.itemFulfillment.collectionRate || 0}%)`,
        GREEN,
      );
      statCard(margin + fW * 2 + 6, y, fW, "Pending", data.itemFulfillment.pending || 0, AMBER);
      y += 28;
    }

    // Section 3: Class Breakdown
    if (data.byClass?.length > 0) {
      y = sectionHeading("3.  Class Breakdown", y);
      autoTable(doc, {
        startY: y,
        head: [["Class", "Accepted", "Partial", "Pending", "Rejected", "Items", "Rate", "Amount"]],
        body: data.byClass.map((row) => [
          row.className || "N/A",
          row.paymentsAccepted ?? "—",
          row.paymentsPartiallyAccepted ?? "—",
          row.paymentsPending ?? "—",
          row.paymentsRejected ?? "—",
          `${row.itemsCollected ?? "—"} / ${row.itemsAccepted ?? "—"}`,
          `${row.completionRate ?? 0}%`,
          formatCurrencyPDF(row.totalAmount ?? 0),
        ]),
        theme: "striped",
        headStyles: { fillColor: BLUE, textColor: WHITE, fontSize: 7, fontStyle: "bold", cellPadding: 2.5, lineWidth: 0 },
        bodyStyles: { fontSize: 6.5, cellPadding: 2, textColor: SLATE_900, lineWidth: 0 },
        alternateRowStyles: { fillColor: SLATE_50 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 35 },
          1: { halign: "center", cellWidth: 15 },
          2: { halign: "center", cellWidth: 15 },
          3: { halign: "center", cellWidth: 15 },
          4: { halign: "center", cellWidth: 15 },
          5: { halign: "center", cellWidth: 20 },
          6: { halign: "center", cellWidth: 15 },
          7: { halign: "right", fontStyle: "bold", cellWidth: 22 },
        },
        styles: { lineColor: [226, 232, 240], lineWidth: 0.1, overflow: "linebreak", halign: "left" },
        margin: { left: margin, right: margin },
        didParseCell: (hookData) => {
          if (hookData.column.index === 6 && hookData.section === "body") {
            const val = parseFloat(hookData.cell.raw);
            if (val >= 80) hookData.cell.styles.textColor = GREEN;
            else if (val >= 40) hookData.cell.styles.textColor = AMBER;
            else hookData.cell.styles.textColor = RED;
          }
        },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc
        .setDrawColor(...SLATE_400)
        .setLineWidth(0.2)
        .line(margin, pageH - 12, pageW - margin, pageH - 12);
      doc
        .setFontSize(6)
        .setFont("helvetica", "normal")
        .setTextColor(...SLATE_400);
      doc.text("Primary Colours School • Confidential", margin, pageH - 7);
      doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 7, { align: "right" });
    }
    doc.save(
      `PrimaryColours_Report_${format(new Date(filters.startDate), "yyyy-MM-dd")}_to_${format(new Date(filters.endDate), "yyyy-MM-dd")}.pdf`,
    );
    toast.success("Report downloaded successfully");
  }, [data, filters]);

  // Pie chart data
  const paymentModeChartData = useMemo(() => {
    if (!data?.summary?.paymentModes) return [];
    return Object.entries(data.summary.paymentModes)
      .filter(([, info]) => info.count > 0)
      .map(([mode, info]) => ({
        name: PAYMENT_MODE_LABELS[mode],
        value: info.percentage,
        color: PAYMENT_MODE_COLORS[mode],
      }));
  }, [data]);

  // Declare summary for JSX
  const summary = data?.summary || {};

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
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

        {/* Filters */}
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
              <Select value={filters.classId} onValueChange={(v) => setFilters({ ...filters, classId: v })} disabled={classesLoading}>
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder={classesLoading ? "Loading..." : "All Classes"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partially_accepted">Partial</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
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

        {/* Error State */}
        {error && (
          <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-400">Failed to load report</p>
              <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* SECTION 1: Financial Summary */}
        {data && !loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {[
                { label: "Total", value: summary.totalCount?.toLocaleString(), icon: BarChart3, color: "text-[#136dec]" },
                {
                  label: "Accepted",
                  value: summary.acceptedCount?.toLocaleString(),
                  sub: formatCompactCurrency(summary.totalAmount),
                  icon: CheckCircle,
                  color: "text-green-600",
                },
                {
                  label: "Partial",
                  value: summary.partiallyAcceptedCount?.toLocaleString(),
                  sub: "Follow-up",
                  icon: TrendingUp,
                  color: "text-orange-600",
                },
                {
                  label: "Pending",
                  value: summary.pendingCount?.toLocaleString(),
                  sub: formatCompactCurrency(summary.pendingRevenue),
                  icon: Clock,
                  color: "text-yellow-600",
                },
                {
                  label: "Rejected",
                  value: summary.rejectedCount?.toLocaleString(),
                  sub: "No revenue",
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
                  {Object.entries(summary.paymentModes || {}).map(([mode, info]) => (
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

        {/* SECTION 2: Item Fulfillment */}
        {data && !loading && data.itemFulfillment && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Package size={14} className="text-[#136dec]" />
              Item Fulfillment
            </h3>
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

        {/* SECTION 3: Class Breakdown */}
        {data && !loading && data.byClass?.length > 0 && (
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
                    <TableHead className="text-[10px] sm:text-xs text-center whitespace-nowrap">Accepted</TableHead>
                    <TableHead className="text-[10px] sm:text-xs text-center whitespace-nowrap">Partial</TableHead>
                    <TableHead className="text-[10px] sm:text-xs text-center whitespace-nowrap">Pending</TableHead>
                    <TableHead className="text-[10px] sm:text-xs text-center whitespace-nowrap">Rejected</TableHead>
                    <TableHead className="text-[10px] sm:text-xs text-center whitespace-nowrap">Items</TableHead>
                    <TableHead className="text-[10px] sm:text-xs text-center whitespace-nowrap">Rate</TableHead>
                    <TableHead className="text-[10px] sm:text-xs text-right whitespace-nowrap">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byClass.map((row) => {
                    const badge = getStatusBadgeConfig(row.statusBadge);
                    return (
                      <TableRow key={row._id}>
                        <TableCell className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {row.className || "N/A"}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-center font-medium">{row.paymentsAccepted ?? "—"}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-center text-orange-600">
                          {row.paymentsPartiallyAccepted ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-center text-yellow-600">{row.paymentsPending ?? "—"}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-center text-red-600">{row.paymentsRejected ?? "—"}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-center">
                          <span className="font-medium">{row.itemsCollected ?? "—"}</span>
                          <span className="text-[10px] text-slate-400">/{row.itemsAccepted ?? "—"}</span>
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
                        <TableCell className="text-xs sm:text-sm text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatCompactCurrency(row.totalAmount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
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
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 h-48" />
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
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded mb-2" />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
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
