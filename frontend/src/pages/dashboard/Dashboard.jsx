import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
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
} from "lucide-react";
import { Link } from "react-router-dom";
import { getDashboardData, getRecentResponses } from "@/services/dashboard.service";

// ─── Mock Data (For Demo/Screenshots) ────────────────────────────────────────

const mockMonthlySubmissions = [
  { month: "Apr 25", count: 142 },
  { month: "May 25", count: 188 },
  { month: "Jun 25", count: 165 },
  { month: "Jul 25", count: 256 },
  { month: "Aug 25", count: 210 },
  { month: "Sep 25", count: 289 },
  { month: "Oct 25", count: 240 },
  { month: "Nov 25", count: 312 },
  { month: "Dec 25", count: 195 },
  { month: "Jan 26", count: 278 },
  { month: "Feb 26", count: 230 },
  { month: "Mar 26", count: 5 },
];

const mockRevenueBreakdown = [
  { name: "Tuition Fees", value: 70, color: "#136dec" },
  { name: "Exam Fees", value: 16, color: "#fbbf24" },
  { name: "Sports/Clubs", value: 8, color: "#10b981" },
  { name: "Others", value: 6, color: "#6366f1" },
];

const mockPipelineStatus = [
  {
    stage: "Pending Verification",
    count: 38,
    description: "Awaiting admin review",
    percentage: 3,
    color: "#f59e0b",
    icon: Clock,
  },
  {
    stage: "Items Assigned",
    count: 156,
    description: "Staff yet to hand over",
    percentage: 12,
    color: "#136dec",
    icon: Package,
  },
  {
    stage: "Fully Completed",
    count: 1090,
    description: "All items handed over",
    percentage: 85,
    color: "#10b981",
    icon: CheckCircle2,
  },
];

const mockRecentResponses = [
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
];

const mockStats = {
  total: 1284,
  pending: 38,
  accepted: 1196,
  rejected: 50,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const styles = {
    accepted: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    rejected: "bg-rose-50 text-rose-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${styles[status]}`}
    >
      {status}
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
          <div
            className="p-1.5 rounded-lg shrink-0"
            style={{ backgroundColor: `${stage.color}20` }}
          >
            <Icon
              size={12}
              className="sm:hidden"
              style={{ color: stage.color }}
              strokeWidth={2.5}
            />
            <Icon
              size={14}
              className="hidden sm:block"
              style={{ color: stage.color }}
              strokeWidth={2}
            />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
            {stage.stage}
          </span>
        </div>
        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase shrink-0">
          {stage.percentage}%
        </span>
      </div>
      <div className="h-4 sm:h-5 w-full rounded-lg overflow-hidden bg-slate-100">
        <div
          className="h-full rounded-lg transition-all duration-500"
          style={{ width: `${stage.percentage}%`, backgroundColor: stage.color }}
        />
      </div>
      <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-bold">
        <div className="flex items-center gap-1 sm:gap-1.5" style={{ color: stage.color }}>
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          {stage.count.toLocaleString()} submissions
        </div>
        <span className="text-slate-400 font-medium">{stage.description}</span>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [recentResponses, setRecentResponses] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [useMockData]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      if (useMockData) {
        // Use mock data
        setDashboardData({
          stats: mockStats,
          monthlySubmissions: mockMonthlySubmissions,
          revenueBreakdown: mockRevenueBreakdown,
          pipelineStatus: mockPipelineStatus,
        });
        setRecentResponses(mockRecentResponses);
      } else {
        // Fetch from API
        const [dashboard, recent] = await Promise.all([
          getDashboardData(),
          getRecentResponses(1, 10),
        ]);
        setDashboardData(dashboard.data);
        setRecentResponses(recent.data.recentResponses || []);
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // Format stats for stat cards
  const stats = dashboardData?.stats || mockStats;
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
      badge:
        stats.total > 0 ? `${Math.round((stats.accepted / stats.total) * 100)}% Rate` : "0% Rate",
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

  const monthlySubmissions = dashboardData?.monthlySubmissions || mockMonthlySubmissions;
  const revenueBreakdown = dashboardData?.revenueBreakdown || mockRevenueBreakdown;
  const pipelineStatus = dashboardData?.pipelineStatus || mockPipelineStatus;
  const displayResponses = recentResponses.length > 0 ? recentResponses : mockRecentResponses;

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
            Track payment verification and item handover progress in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap">
            Last 30 Days
          </button>
          <button className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm font-bold text-white bg-[#136dec] rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm shadow-[#136dec]/30 whitespace-nowrap">
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
                <card.icon
                  size={18}
                  className={`hidden sm:block ${card.iconColor}`}
                  strokeWidth={2}
                />
              </div>
              <span
                className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded leading-tight ${card.badgeColor}`}
              >
                {card.badge}
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5 sm:mb-1 leading-tight">
              {card.label}
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
              {card.value}
            </h3>
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
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Monthly volume for the last 12 months
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm bg-[#136dec]" />
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Submissions
              </span>
            </div>
          </div>
          <div className="h-36 sm:h-44 lg:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlySubmissions}
                barCategoryGap="35%"
                margin={{ top: 4, right: 0, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 9, fontWeight: 700, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fontWeight: 700, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  width={26}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="count" fill="#136dec" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut chart */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 lg:p-6">
          <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-0.5">
            Revenue Breakdown
          </h4>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-3 sm:mb-4">
            Distribution by Fee Type
          </p>

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
                    Total
                  </p>
                  <p className="text-base sm:text-lg lg:text-xl font-black text-slate-900 leading-none">
                    ₦12.4M
                  </p>
                </div>
              </>
            ) : (
              <EmptyState message="No accepted payments yet" />
            )}
          </div>

          {/* Legend */}
          {revenueBreakdown.length > 0 && (
            <div className="space-y-2 sm:space-y-2.5">
              {revenueBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-500">
                    <span
                      className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[11px] sm:text-xs">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 text-[11px] sm:text-xs">
                    {item.value}%
                  </span>
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
          <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-0.5">
            Payment-to-Handover Pipeline
          </h4>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-5 sm:mb-6 lg:mb-8">
            Track submissions through verification to completion
          </p>
          <div className="space-y-6 sm:space-y-7 lg:space-y-8">
            {pipelineStatus.map((stage) => (
              <PipelineStage key={stage.stage} stage={stage} />
            ))}
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
              View All
              <ArrowRight size={11} />
            </Link>
          </div>

          {/* Card list — phones only */}
          <div className="md:hidden divide-y divide-slate-100">
            {displayResponses.map((row) => (
              <div key={row._id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{row.nameOfChild}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {row.classId?.name || "N/A"} · {row.nameOfPayerOrCompany}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-sm font-bold text-slate-900">
                    ₦{row.totalAmount?.toLocaleString()}
                  </span>
                  <StatusBadge status={row.status} />
                </div>
              </div>
            ))}
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
                {displayResponses.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                        {row.nameOfChild}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                        {row.classId?.name || "N/A"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {row.nameOfPayerOrCompany}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                        {row.totalAmount?.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Data Source Toggle (NEW) ────────────────────────────────────────── */}
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Data Source
              </span>
              <span className="text-xs font-semibold">
                {useMockData ? "Mock Data" : "Live API"}
              </span>
            </div>
            <button
              onClick={() => setUseMockData(!useMockData)}
              className={`relative w-12 h-6 rounded-full transition-colors ${useMockData ? "bg-amber-500" : "bg-[#136dec]"}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${useMockData ? "left-1" : "left-7"}`}
              />
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
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Privacy Policy
          </p>
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            System Status: <span className="text-emerald-500">Normal</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex justify-between">
        <div>
          <div className="h-8 w-48 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-72 bg-slate-200 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-slate-200 rounded" />
          <div className="h-9 w-32 bg-slate-200 rounded" />
        </div>
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

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
      <Package size={32} className="mb-2 opacity-50" />
      <p className="text-xs font-medium">{message}</p>
    </div>
  );
}
