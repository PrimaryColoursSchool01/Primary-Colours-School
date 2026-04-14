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
} from "lucide-react";
import { Link } from "react-router-dom";
import { getDashboardData, getRecentResponses } from "@/services/dashboard.service";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// ─── Helpers ───────────────────────────────────────────────────────────────
const formatCurrency = (amount) => `₦${amount?.toLocaleString() ?? "0"}`;

const getStatusBadgeConfig = (status) => {
  const configs = {
    accepted: { bg: "bg-emerald-50 text-emerald-700", border: "border-emerald-200", label: "Accepted" },
    pending: { bg: "bg-amber-50 text-amber-700", border: "border-amber-200", label: "Pending" },
    rejected: { bg: "bg-rose-50 text-rose-600", border: "border-rose-200", label: "Rejected" },
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

// ─── PDF Export Handler (Same pattern as Reports.jsx) ──────────────────────
const handleExportPDF = (dashboardData, filters) => {
  if (!dashboardData) return toast.error("No data to export");

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

  // Header
  filledRect(0, 0, pageW, 42, 0, BLUE_DARK);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text("Primary Colours School", margin, 15);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 235, 255);
  doc.text("Admin Dashboard Report", margin, 22);
  doc.setFontSize(7.5);
  doc.setTextColor(220, 235, 255);
  doc.text(`Generated: ${format(new Date(), "PPp")}`, pageW - margin, 15, { align: "right" });
  doc.text(`Period: All Time`, pageW - margin, 21, { align: "right" });
  doc.setDrawColor(...BLUE_LIGHT);
  doc.setLineWidth(0.3);
  doc.line(0, 42, pageW, 42);

  let y = 50;

  // Section 1: Financial Summary
  y = sectionHeading("1.  Financial Summary", y);
  const stats = dashboardData.stats || {};
  const cardW = (contentW - 9) / 4;
  statCard(margin, y, cardW, "Total Responses", stats.total || 0, BLUE);
  statCard(margin + cardW + 3, y, cardW, "Accepted", stats.accepted || 0, GREEN);
  statCard(margin + (cardW + 3) * 2, y, cardW, "Pending", stats.pending || 0, AMBER);
  statCard(margin + (cardW + 3) * 3, y, cardW, "Rejected", stats.rejected || 0, RED);
  y += 28;

  // Section 2: Revenue Breakdown (Pie Chart Data)
  if (dashboardData.revenueBreakdown?.length > 0) {
    y = sectionHeading("2.  Revenue Breakdown", y);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_900);
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
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...SLATE_600);
      doc.text(`${item.name}`, cx + 3, cy + 4.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SLATE_900);
      doc.text(`${formatCurrencyPDF(item.totalAmount)} • ${item.value}%`, cx + colW - 5, cy + 4.5, { align: "right" });
    });
    y += Math.ceil(modes.length / 2) * 8 + 8;
  }

  // Section 3: Pipeline Status
  if (dashboardData.pipelineStatus?.length > 0) {
    y = sectionHeading("3.  Item Fulfillment Pipeline", y);
    dashboardData.pipelineStatus.forEach((stage) => {
      filledRect(margin, y, contentW, 7, 1.5, SLATE_50);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...SLATE_900);
      doc.text(`${stage.stage} (${stage.percentage}%)`, margin + 3, y + 4.8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(stage.color === "#10b981" ? GREEN : stage.color === "#f59e0b" ? AMBER : RED);
      doc.text(`${stage.count.toLocaleString()} items`, pageW - margin - 3, y + 4.8, { align: "right" });
      y += 9;
    });
    y += 4;
  }

  // Section 4: Recent Responses Table
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
      alternateRowStyles: { fillColor: SLATE_50 },
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
    doc.setDrawColor(...SLATE_400);
    doc.setLineWidth(0.2);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_400);
    doc.text("Primary Colours School • Confidential", margin, pageH - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 7, { align: "right" });
  }

  doc.save(`AdminDashboard_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  toast.success("Report downloaded successfully");
};

// ─── Skeleton Loader ────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex justify-between">
        <div>
          <div className="h-8 w-48 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-72 bg-slate-200 rounded" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-200 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="h-72 lg:col-span-2 bg-slate-200 rounded-xl" />
        <div className="h-72 bg-slate-200 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="h-64 bg-slate-200 rounded-xl" />
        <div className="h-64 lg:col-span-2 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
      <Package size={32} className="mb-2 opacity-50" />
      <p className="text-xs font-medium">{message}</p>
    </div>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────────
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false); // Default to live mode
  const [dashboardData, setDashboardData] = useState(null);
  const [recentResponses, setRecentResponses] = useState([]);
  const [error, setError] = useState(null);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (useMockData) {
        // Mock data for testing only
        await new Promise((r) => setTimeout(r, 800));
        setDashboardData({
          stats: { total: 1284, pending: 38, accepted: 1196, rejected: 50, totalRevenue: 12400000 },
          monthlySubmissions: [
            { month: "Apr", count: 142 },
            { month: "May", count: 188 },
            { month: "Jun", count: 165 },
            { month: "Jul", count: 256 },
            { month: "Aug", count: 210 },
            { month: "Sep", count: 289 },
            { month: "Oct", count: 240 },
            { month: "Nov", count: 312 },
            { month: "Dec", count: 195 },
            { month: "Jan", count: 278 },
            { month: "Feb", count: 230 },
            { month: "Mar", count: 5 },
          ],
          revenueBreakdown: [
            { name: "Tuition Fees", value: 70, totalAmount: 8680000, count: 290, color: "#136dec" },
            { name: "Exam Fees", value: 16, totalAmount: 1984000, count: 90, color: "#fbbf24" },
            { name: "Sports/Clubs", value: 8, totalAmount: 992000, count: 50, color: "#10b981" },
            { name: "Others", value: 6, totalAmount: 744000, count: 20, color: "#6366f1" },
          ],
          pipelineStatus: [
            {
              stage: "Pending Verification",
              count: 38,
              description: "Awaiting admin review",
              percentage: 3,
              color: "#f59e0b",
              icon: Clock,
            },
            { stage: "Items Assigned", count: 156, description: "Staff yet to hand over", percentage: 12, color: "#136dec", icon: Package },
            {
              stage: "Fully Completed",
              count: 1090,
              description: "All items handed over",
              percentage: 85,
              color: "#10b981",
              icon: CheckCircle2,
            },
          ],
        });
        setRecentResponses([
          {
            _id: "1",
            nameOfChild: "Chukwudi Okafor",
            classId: { name: "JSS 1" },
            nameOfPayerOrCompany: "Mr. Emeka Okafor",
            totalAmount: 145000,
            status: "accepted",
            createdAt: "2023-10-24T10:00:00.000Z",
          },
          {
            _id: "2",
            nameOfChild: "Amina Bello",
            classId: { name: "Primary 4" },
            nameOfPayerOrCompany: "Mrs. Bello",
            totalAmount: 82500,
            status: "pending",
            createdAt: "2023-10-24T10:00:00.000Z",
          },
          {
            _id: "3",
            nameOfChild: "Tunde Adeyemi",
            classId: { name: "JSS 3" },
            nameOfPayerOrCompany: "Tunde Adeyemi Sr.",
            totalAmount: 120000,
            status: "accepted",
            createdAt: "2023-10-23T10:00:00.000Z",
          },
          {
            _id: "4",
            nameOfChild: "Nneka Nwosu",
            classId: { name: "Primary 2" },
            nameOfPayerOrCompany: "Chief Nwosu",
            totalAmount: 75000,
            status: "rejected",
            createdAt: "2023-10-23T10:00:00.000Z",
          },
        ]);
        toast.success("Mock data loaded");
      } else {
        // Real API calls
        const [dashboard, recent] = await Promise.all([getDashboardData(), getRecentResponses(1, 10)]);
        setDashboardData(dashboard.data);
        setRecentResponses(recent.data?.recentResponses || []);
        toast.success("Dashboard data loaded");
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      setError(err.message || "Failed to load dashboard data");
      toast.error("Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Prepare chart data from API response
  const monthlySubmissions = useMemo(() => {
    if (useMockData) return dashboardData?.monthlySubmissions || [];
    return (
      dashboardData?.monthlySubmissions?.map((item) => ({
        month: item.month,
        count: item.count,
      })) || []
    );
  }, [dashboardData, useMockData]);

  const revenueBreakdown = useMemo(() => {
    if (useMockData) return dashboardData?.revenueBreakdown || [];
    return (
      dashboardData?.revenueBreakdown?.map((item) => ({
        name: item.name,
        value: item.value, // Percentage for pie chart
        totalAmount: item.totalAmount, // Actual amount for display
        count: item.count, // Number of payments
        color: item.color || "#64748b",
      })) || []
    );
  }, [dashboardData, useMockData]);

  const pipelineStatus = useMemo(() => {
    if (useMockData) return dashboardData?.pipelineStatus || [];
    return (
      dashboardData?.pipelineStatus?.map((item) => ({
        stage: item.stage,
        count: item.count,
        description: item.description,
        percentage: item.percentage,
        color: item.color,
        icon: item.icon || Clock,
      })) || []
    );
  }, [dashboardData, useMockData]);

  const stats = dashboardData?.stats || { total: 0, pending: 0, accepted: 0, rejected: 0, totalRevenue: 0 };

  const statCards = [
    {
      label: "Total Responses",
      value: stats.total.toLocaleString(),
      badge: "+12.5%",
      badgeColor: "text-emerald-600 bg-emerald-50",
      iconBg: "bg-[#136dec]/10",
      iconColor: "text-[#136dec]",
      icon: BarChart2,
    },
    {
      label: "Pending Review",
      value: stats.pending.toLocaleString(),
      badge: "Action Req.",
      badgeColor: "text-amber-600 bg-amber-50",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      icon: Clock,
    },
    {
      label: "Accepted",
      value: stats.accepted.toLocaleString(),
      badge: stats.total > 0 ? `${Math.round((stats.accepted / stats.total) * 100)}% Rate` : "0% Rate",
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

  const displayResponses = recentResponses.length > 0 ? recentResponses : useMockData ? [] : [];

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-red-700 mb-1">Failed to load dashboard</h3>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
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
          {/* Export PDF Button - Now Working */}
          <button
            onClick={() => handleExportPDF(dashboardData, {})}
            disabled={!dashboardData}
            className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm font-bold text-white bg-[#136dec] rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm shadow-[#136dec]/30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
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
              <EmptyState message="No submission data available" />
            )}
          </div>
        </div>

        {/* Donut chart */}
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
                    {formatCurrency(stats.totalRevenue || 0)}
                  </p>
                </div>
              </>
            ) : (
              <EmptyState message="No revenue data available" />
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
                    <span className="font-bold text-slate-900 text-[11px] sm:text-xs block">{formatCurrency(item.totalAmount || 0)}</span>
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
        {/* Payment-to-Handover Pipeline */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 lg:p-6">
          <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-0.5">Item Fulfillment Pipeline</h4>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-5 sm:mb-6 lg:mb-8">Track items through verification to collection</p>
          <div className="space-y-6 sm:space-y-7 lg:space-y-8">
            {pipelineStatus.length > 0 ? (
              pipelineStatus.map((stage) => <PipelineStage key={stage.stage} stage={stage} />)
            ) : (
              <EmptyState message="No pipeline data available" />
            )}
          </div>
        </div>

        {/* Recent responses */}
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
          {/* Card list — phones only */}
          <div className="md:hidden divide-y divide-slate-100">
            {displayResponses.length > 0 ? (
              displayResponses.map((row) => (
                <div key={row._id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{row.nameOfChild}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {row.classId?.name || "N/A"} · {row.nameOfPayerOrCompany}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-bold text-slate-900">₦{row.totalAmount?.toLocaleString()}</span>
                    <StatusBadge status={row.status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No recent responses</div>
            )}
          </div>
          {/* Table — md and above */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Child Name</th>
                  <th className="px-5 py-3.5">Class</th>
                  <th className="px-5 py-3.5">Payer</th>
                  <th className="px-5 py-3.5">Amount (₦)</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayResponses.length > 0 ? (
                  displayResponses.map((row) => (
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
                        <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{row.totalAmount?.toLocaleString()}</span>
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

      {/* ── Data Source Toggle ────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-slate-900 text-white rounded-xl shadow-2xl shadow-slate-900/50 p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg transition-colors ${useMockData ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-400"}`}
              >
                <Database size={16} />
              </div>
              <div
                className={`p-2 rounded-lg transition-colors ${!useMockData ? "bg-[#136dec]/20 text-[#136dec]" : "bg-slate-700 text-slate-400"}`}
              >
                <Cloud size={16} />
              </div>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Data Source</span>
              <span className="text-xs font-semibold">{useMockData ? "Mock Data" : "Live API"}</span>
            </div>
            <button
              onClick={() => setUseMockData(!useMockData)}
              className={`relative w-12 h-6 rounded-full transition-colors ${useMockData ? "bg-amber-500" : "bg-[#136dec]"}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${useMockData ? "left-1" : "left-7"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-slate-200">
        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          © 2025 Findora · Primary Colours Schools
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
