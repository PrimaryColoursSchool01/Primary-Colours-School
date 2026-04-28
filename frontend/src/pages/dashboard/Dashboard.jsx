/* eslint-disable no-unused-vars */
// src/pages/admin/Dashboard.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  BarChart2,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  ArrowRight,
  Package,
  Database,
  Cloud,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getDashboardData, getRecentResponses } from "@/services/dashboard.service";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

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
    accepted: {
      bg: "bg-emerald-50 text-emerald-700",
      border: "border-emerald-200",
      label: "Accepted",
    },
    pending: {
      bg: "bg-amber-50 text-amber-700",
      border: "border-amber-200",
      label: "Pending",
    },
    rejected: {
      bg: "bg-rose-50 text-rose-600",
      border: "border-rose-200",
      label: "Rejected",
    },
    partially_accepted: {
      bg: "bg-orange-50 text-orange-700",
      border: "border-orange-200",
      label: "Partial",
    },
  };
  return configs[status] || configs.pending;
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

// ─── Sub-components ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const config = getStatusBadgeConfig(status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap border ${config.bg} ${config.border}`}
    >
      {config.label}
    </span>
  );
}

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-xl">
      <p className="text-slate-400 mb-0.5">{label}</p>
      <p>{payload[0].value} submissions</p>
    </div>
  );
}

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-xl">
      <p>{payload[0].name}</p>
      <p className="text-slate-300">{payload[0].value}%</p>
    </div>
  );
}

function PipelineStage({ stage }) {
  const Icon = stage.icon || Clock;
  return (
    <div className="space-y-2 sm:space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${stage.color}20` }}>
            <Icon size={12} className="sm:hidden" style={{ color: stage.color }} strokeWidth={2.5} />
            <Icon size={14} className="hidden sm:block" style={{ color: stage.color }} strokeWidth={2} />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">{stage.stage}</span>
        </div>
        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase shrink-0">{stage.percentage}%</span>
      </div>
      <div className="h-4 sm:h-5 w-full rounded-lg overflow-hidden bg-slate-100">
        <div
          className="h-full rounded-lg transition-all duration-500"
          style={{ width: `${stage.percentage}%`, backgroundColor: stage.color }}
        />
      </div>
      <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-bold">
        <div className="flex items-center gap-1 sm:gap-1.5" style={{ color: stage.color }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
          {stage.count.toLocaleString()} items
        </div>
        <span className="text-slate-400 font-medium">{stage.description}</span>
      </div>
    </div>
  );
}

// ─── PDF Export Handler (FIXED) ──────────────────────────────────────────────
const handleExportPDF = (dashboardData) => {
  if (!dashboardData) return toast.error("No data to export");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  // Color constants as individual RGB values for jsPDF compatibility
  const BLUE = { r: 19, g: 109, b: 236 };
  const BLUE_DARK = { r: 12, g: 85, b: 180 };
  const BLUE_LIGHT = { r: 235, g: 244, b: 255 };
  const SLATE_900 = { r: 15, g: 23, b: 42 };
  const SLATE_600 = { r: 71, g: 85, b: 105 };
  const SLATE_400 = { r: 148, g: 163, b: 184 };
  const SLATE_50 = { r: 248, g: 250, b: 252 };
  const WHITE = { r: 255, g: 255, b: 255 };
  const GREEN = { r: 22, g: 163, b: 74 };
  const AMBER = { r: 217, g: 119, b: 6 };
  const RED = { r: 220, g: 38, b: 38 };
  const ORANGE = { r: 249, g: 115, b: 22 }; // For partially_accepted

  // Helper to set text color safely
  const setTextColorSafe = (color) => {
    doc.setTextColor(color.r, color.g, color.b);
  };

  const filledRect = (x, y, w, h, r, c) => {
    doc.setFillColor(c.r, c.g, c.b);
    doc.roundedRect(x, y, w, h, r, r, "F");
  };

  const sectionHeading = (label, y) => {
    filledRect(margin, y, contentW, 8, 2, BLUE_LIGHT);
    doc.setFontSize(9).setFont("helvetica", "bold");
    setTextColorSafe(BLUE);
    doc.text(label, margin + 4, y + 5.5);
    return y + 13;
  };

  const formatCurrencyPDF = (amt) => {
    const num = typeof amt === "number" ? amt : 0;
    return `NGN ${num.toLocaleString()}`;
  };

  const statCard = (x, y, w, label, value, accent, isCurrency = false) => {
    filledRect(x, y, w, 22, 3, SLATE_50);
    doc.setDrawColor(accent.r, accent.g, accent.b).setLineWidth(0.8);
    doc.line(x + 0.4, y + 2, x + 0.4, y + 20);
    doc.setFontSize(7).setFont("helvetica", "normal");
    setTextColorSafe(SLATE_600);
    doc.text(label, x + 4, y + 8);
    doc.setFontSize(11).setFont("helvetica", "bold");
    setTextColorSafe(accent);
    doc.text(isCurrency ? formatCurrencyPDF(value) : String(value), x + 4, y + 17);
  };

  // Header
  filledRect(0, 0, pageW, 42, 0, BLUE_DARK);
  doc.setFontSize(15).setFont("helvetica", "bold");
  setTextColorSafe(WHITE);
  doc.text("Primary Colours School", margin, 15);
  doc.setFontSize(9).setFont("helvetica", "normal");
  setTextColorSafe({ r: 220, g: 235, b: 255 });
  doc.text("Admin Dashboard Report", margin, 22);
  doc.setFontSize(7.5);
  setTextColorSafe({ r: 220, g: 235, b: 255 });
  doc.text(`Generated: ${format(new Date(), "PPp")}`, pageW - margin, 15, {
    align: "right",
  });
  doc.text(`Period: All Time`, pageW - margin, 21, { align: "right" });
  doc.setDrawColor(BLUE_LIGHT.r, BLUE_LIGHT.g, BLUE_LIGHT.b).setLineWidth(0.3);
  doc.line(0, 42, pageW, 42);

  let y = 50;
  const stats = dashboardData.stats || {};
  const cardW = (contentW - 9) / 4;

  // Section 1: Financial Summary (5 cards)
  y = sectionHeading("1.  Financial Summary", y);
  statCard(margin, y, cardW, "Total", stats.total || 0, BLUE);
  statCard(margin + cardW + 3, y, cardW, "Pending", stats.pending || 0, AMBER);
  statCard(margin + (cardW + 3) * 2, y, cardW, "Partial", stats.partially_accepted || 0, ORANGE);
  statCard(margin + (cardW + 3) * 3, y, cardW, "Rejected", stats.rejected || 0, RED);
  y += 28;

  // Revenue summary row
  filledRect(margin, y, contentW, 10, 2, SLATE_50);
  doc.setFontSize(7.5).setFont("helvetica", "normal");
  setTextColorSafe(SLATE_600);
  doc.text(`Recognized: ${formatCurrencyPDF(stats.totalRevenue || 0)}`, margin + 4, y + 6.5);
  doc.text(`Pending: ${formatCurrencyPDF(stats.pendingRevenue || 0)}`, pageW / 2, y + 6.5, { align: "center" });
  doc.text(`Total Potential: ${formatCurrencyPDF((stats.totalRevenue || 0) + (stats.pendingRevenue || 0))}`, pageW - margin - 4, y + 6.5, {
    align: "right",
  });
  y += 16;

  // Section 2: Revenue Breakdown
  if (dashboardData.revenueBreakdown?.length > 0) {
    y = sectionHeading("2.  Revenue Breakdown", y);
    doc.setFontSize(8).setFont("helvetica", "bold");
    setTextColorSafe(SLATE_900);
    doc.text("Fee Categories", margin, y);
    y += 5;

    const modes = dashboardData.revenueBreakdown.filter((m) => m.value > 0);
    const colW = contentW / 2;
    modes.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cx = margin + col * colW;
      const cy = y + row * 8;
      filledRect(cx, cy, colW - 3, 7, 1.5, SLATE_50);
      doc.setFontSize(7).setFont("helvetica", "normal");
      setTextColorSafe(SLATE_600);
      doc.text(`${item.name}`, cx + 3, cy + 4.5);
      doc.setFont("helvetica", "bold");
      setTextColorSafe(SLATE_900);
      // Use full currency format in PDF for clarity
      doc.text(`${formatCurrencyPDF(item.totalAmount)} • ${item.value}%`, cx + colW - 5, cy + 4.5, { align: "right" });
    });
    y += Math.ceil(modes.length / 2) * 8 + 8;
  }

  // Section 3: Pipeline
  if (dashboardData.pipelineStatus?.length > 0) {
    y = sectionHeading("3.  Item Fulfillment Pipeline", y);
    dashboardData.pipelineStatus.forEach((stage) => {
      filledRect(margin, y, contentW, 7, 1.5, SLATE_50);
      doc.setFontSize(7).setFont("helvetica", "normal");
      setTextColorSafe(SLATE_900);
      doc.text(`${stage.stage} (${stage.percentage}%)`, margin + 3, y + 4.8);
      doc.setFont("helvetica", "bold");
      // Set color based on stage
      if (stage.color === "#10b981") setTextColorSafe(GREEN);
      else if (stage.color === "#f59e0b") setTextColorSafe(AMBER);
      else setTextColorSafe(RED);
      doc.text(`${stage.count.toLocaleString()} items`, pageW - margin - 3, y + 4.8, { align: "right" });
      y += 9;
    });
    y += 4;
  }

  // Section 4: Recent Responses
  if (dashboardData.recentResponses?.length > 0) {
    y = sectionHeading("4.  Recent Responses", y);
    autoTable(doc, {
      startY: y,
      head: [["Child Name", "Class", "Payer", "Amount", "Status", "Date"]],
      body: dashboardData.recentResponses
        .slice(0, 10)
        .map((row) => [
          row.nameOfChild || "N/A",
          row.classId?.name || "N/A",
          row.nameOfPayerOrCompany || "N/A",
          formatCurrencyPDF(row.totalAmount),
          row.status || "N/A",
          row.createdAt ? format(new Date(row.createdAt), "PP") : "N/A",
        ]),
      theme: "striped",
      headStyles: {
        fillColor: [BLUE.r, BLUE.g, BLUE.b],
        textColor: [WHITE.r, WHITE.g, WHITE.b],
        fontSize: 7.5,
        fontStyle: "bold",
        cellPadding: 3,
        lineWidth: 0,
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 2.5,
        textColor: [SLATE_900.r, SLATE_900.g, SLATE_900.b],
        lineWidth: 0,
      },
      alternateRowStyles: { fillColor: [SLATE_50.r, SLATE_50.g, SLATE_50.b] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 35 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { halign: "right", fontStyle: "bold", cellWidth: 25 },
        4: { halign: "center", cellWidth: 20 },
        5: { cellWidth: 25 },
      },
      styles: {
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
        overflow: "linebreak",
        halign: "left",
      },
      margin: { left: margin, right: margin },
    });
  }

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(SLATE_400.r, SLATE_400.g, SLATE_400.b).setLineWidth(0.2);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    doc.setFontSize(6.5).setFont("helvetica", "normal");
    setTextColorSafe(SLATE_400);
    doc.text("Primary Colours School • Confidential", margin, pageH - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 7, {
      align: "right",
    });
  }

  doc.save(`AdminDashboard_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  toast.success("Report downloaded successfully");
};

// ─── Enhanced Loading State with Meaningful Messages ────────────────────────
function DashboardLoading({ stage }) {
  const messages = {
    initializing: "Connecting to server...",
    financial: "Fetching financial data...",
    charts: "Loading analytics...",
    pipeline: "Fetching fulfillment data...",
    responses: "Loading recent responses...",
    finalizing: "Preparing dashboard...",
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 p-8">
      {/* Animated loader */}
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-[#136dec] rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Database className="w-6 h-6 text-[#136dec] animate-pulse" />
        </div>
      </div>

      {/* Meaningful message with motion */}
      <div className="text-center space-y-2">
        <p className="text-sm font-semibold text-slate-700 animate-pulse">{messages[stage] || "Loading dashboard..."}</p>
        <p className="text-xs text-slate-400">Please wait while we fetch your data</p>
      </div>

      {/* Progress indicator */}
      <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#136dec] rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${
              {
                initializing: 10,
                financial: 30,
                charts: 50,
                pipeline: 70,
                responses: 90,
                finalizing: 100,
              }[stage] || 0
            }%`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────
function EmptyState({ message, onRetry }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8">
      <Package size={32} className="mb-3 opacity-50" />
      <p className="text-sm font-medium text-center mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#136dec] bg-[#136dec]/10 rounded-lg hover:bg-[#136dec]/20 transition-colors"
        >
          <RefreshCw size={12} />
          Try Again
        </button>
      )}
    </div>
  );
}

// ─── Error State with Retry ────────────────────────────────────────────────
function DashboardError({ error, onRetry }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md mx-auto">
        <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-red-700 mb-1">Failed to load dashboard</h3>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Retry
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────────
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState("initializing");
  const [dashboardData, setDashboardData] = useState(null);
  const [recentResponses, setRecentResponses] = useState([]);
  const [error, setError] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Stage 1: Financial data
      setLoadingStage("financial");
      const dashboard = await getDashboardData();

      // Stage 2: Charts & analytics
      setLoadingStage("charts");

      // Stage 3: Pipeline data
      setLoadingStage("pipeline");

      // Stage 4: Recent responses
      setLoadingStage("responses");
      const recent = await getRecentResponses(1, 10);

      // Stage 5: Finalize
      setLoadingStage("finalizing");

      setDashboardData(dashboard.data);
      setRecentResponses(recent.data?.recentResponses || []);
      toast.success("Dashboard loaded successfully");
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      setError(err.message || "Failed to connect to server. Please check your connection.");
      toast.error("Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const monthlySubmissions = useMemo(
    () =>
      dashboardData?.monthlySubmissions?.map((item) => ({
        month: item.month,
        count: item.count,
      })) || [],
    [dashboardData],
  );

  const revenueBreakdown = useMemo(
    () =>
      dashboardData?.revenueBreakdown?.map((item) => ({
        name: item.name,
        value: item.value,
        totalAmount: item.totalAmount,
        count: item.count,
        color: item.color || "#64748b",
      })) || [],
    [dashboardData],
  );

  const pipelineStatus = useMemo(
    () =>
      dashboardData?.pipelineStatus?.map((item) => ({
        stage: item.stage,
        count: item.count,
        description: item.description,
        percentage: item.percentage,
        color: item.color,
        icon: item.icon || Clock,
      })) || [],
    [dashboardData],
  );

  const stats = dashboardData?.stats || {
    total: 0,
    pending: 0,
    partially_accepted: 0,
    accepted: 0,
    rejected: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
  };

  const statCards = [
    {
      label: "Total",
      value: stats.total.toLocaleString(),
      badge: "+12.5%",
      badgeColor: "text-emerald-600 bg-emerald-50",
      iconBg: "bg-[#136dec]/10",
      iconColor: "text-[#136dec]",
      icon: BarChart2,
    },
    {
      label: "Pending",
      value: stats.pending.toLocaleString(),
      badge: "Review",
      badgeColor: "text-amber-600 bg-amber-50",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      icon: Clock,
    },
    {
      label: "Partial",
      value: stats.partially_accepted.toLocaleString(),
      badge: "Follow-up",
      badgeColor: "text-orange-600 bg-orange-50",
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
      icon: TrendingUp,
    },
    {
      label: "Accepted",
      value: stats.accepted.toLocaleString(),
      badge: stats.total > 0 ? `${Math.round((stats.accepted / stats.total) * 100)}%` : "0%",
      badgeColor: "text-emerald-600 bg-emerald-50",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      icon: CheckCircle2,
    },
    {
      label: "Rejected",
      value: stats.rejected.toLocaleString(),
      badge: "-2%",
      badgeColor: "text-rose-600 bg-rose-50",
      iconBg: "bg-rose-50",
      iconColor: "text-rose-500",
      icon: XCircle,
    },
  ];

  // Show loading state with meaningful messages
  if (loading) {
    return <DashboardLoading stage={loadingStage} />;
  }

  // Show error state
  if (error) {
    return <DashboardError error={error} onRetry={loadDashboardData} />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
            Track payment verification and item handover progress in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleExportPDF(dashboardData)}
            disabled={!dashboardData}
            className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm font-bold text-white bg-[#136dec] rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm shadow-[#136dec]/30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* ── Stat cards (5 cards for Option A) ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 lg:p-5 hover:border-[#136dec]/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between mb-2.5 sm:mb-4">
              <div className={`p-1.5 sm:p-2 rounded-lg ${card.iconBg}`}>
                <card.icon size={14} className={`sm:hidden ${card.iconColor}`} strokeWidth={2} />
                <card.icon size={18} className={`hidden sm:block ${card.iconColor}`} strokeWidth={2} />
              </div>
              <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded leading-tight ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5 sm:mb-1 leading-tight">
              {card.label}
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* ── Charts row 1 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 lg:p-6">
          <div className="flex items-start justify-between mb-4 sm:mb-5 lg:mb-6">
            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">Payment Submissions</h4>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Monthly volume for the last 12 months</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm bg-[#136dec]" />
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Submissions</span>
            </div>
          </div>
          <div className="h-36 sm:h-44 lg:h-[220px]">
            {monthlySubmissions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySubmissions} barCategoryGap="35%" margin={{ top: 4, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fontWeight: 700, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={26} />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="count" fill="#136dec" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No submission data available" onRetry={loadDashboardData} />
            )}
          </div>
        </div>

        {/* Donut chart with compact currency */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 lg:p-6">
          <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-0.5">Revenue Breakdown</h4>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-3 sm:mb-4">Distribution by Fee Type</p>
          <div className="relative h-[150px] sm:h-[165px] lg:h-[180px] mb-4 sm:mb-5 lg:mb-6">
            {revenueBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      className="sm:hidden"
                    >
                      {revenueBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Pie
                      data={revenueBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      className="hidden sm:block"
                    >
                      {revenueBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">
                    Total Revenue
                  </p>
                  <p className="text-base sm:text-lg lg:text-xl font-black text-slate-900 leading-none">
                    {formatCompactCurrency(stats.totalRevenue || 0)}
                  </p>
                </div>
              </>
            ) : (
              <EmptyState message="No revenue data available" onRetry={loadDashboardData} />
            )}
          </div>
          {revenueBreakdown.length > 0 && (
            <div className="space-y-2 sm:space-y-2.5">
              {revenueBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-500">
                    <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] sm:text-xs">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-[11px] sm:text-xs block">
                      {formatCompactCurrency(item.totalAmount || 0)}
                    </span>
                    <span className="text-[9px] text-slate-400">{item.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Charts row 2 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Pipeline */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 lg:p-6">
          <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-0.5">Item Processing Stages</h4>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-5 sm:mb-6 lg:mb-8">
            Shows how many items are waiting, approved, or already collected.
          </p>
          <div className="space-y-6 sm:space-y-7 lg:space-y-8">
            {pipelineStatus.length > 0 ? (
              pipelineStatus.map((stage) => <PipelineStage key={stage.stage} stage={stage} />)
            ) : (
              <EmptyState message="No pipeline data available" onRetry={loadDashboardData} />
            )}
          </div>
        </div>

        {/* Recent responses with compact amounts */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="px-4 sm:px-5 lg:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm sm:text-base">Recent Responses</h4>
            <Link
              to="/responses"
              className="text-[11px] sm:text-xs font-bold text-[#136dec] hover:underline flex items-center gap-1 shrink-0"
            >
              View All <ArrowRight size={11} />
            </Link>
          </div>
          <div className="md:hidden divide-y divide-slate-100">
            {recentResponses.length > 0 ? (
              recentResponses.map((row) => (
                <div key={row._id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{row.nameOfChild}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {row.classId?.name || "N/A"} · {row.nameOfPayerOrCompany}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-bold text-slate-900">{formatCompactCurrency(row.totalAmount)}</span>
                    <StatusBadge status={row.status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No recent responses</div>
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Child Name</th>
                  <th className="px-5 py-3.5">Class</th>
                  <th className="px-5 py-3.5">Payer</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentResponses.length > 0 ? (
                  recentResponses.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{row.nameOfChild}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{row.classId?.name || "N/A"}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-slate-400 whitespace-nowrap">{row.nameOfPayerOrCompany}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{formatCompactCurrency(row.totalAmount)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {row.createdAt ? format(new Date(row.createdAt), "PP") : "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-sm text-slate-400">
                      No recent responses
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
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
