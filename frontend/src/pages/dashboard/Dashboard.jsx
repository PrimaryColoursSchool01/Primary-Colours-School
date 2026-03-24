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
  UserCheck,
  ClipboardCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

// ─── Mock data ────────────────────────────────────────────────────────────────

const weeklySubmissions = [
  { week: "Wk 01", count: 142 },
  { week: "Wk 02", count: 188 },
  { week: "Wk 03", count: 165 },
  { week: "Wk 04", count: 256 },
  { week: "Wk 05", count: 210 },
  { week: "Wk 06", count: 289 },
  { week: "Wk 07", count: 240 },
  { week: "Wk 08", count: 312 },
];

const revenueBreakdown = [
  { name: "Tuition Fees", value: 70, color: "#136dec" },
  { name: "Exam Fees", value: 16, color: "#fbbf24" },
  { name: "Sports/Clubs", value: 8, color: "#10b981" },
  { name: "Others", value: 6, color: "#6366f1" },
];

// NEW: Payment-to-Handover Pipeline (replaces collectionStatus)
const pipelineStatus = [
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

const recentResponses = [
  {
    id: 1,
    child: "Chukwudi Okafor",
    class: "JSS 1",
    payer: "Mr. Emeka Okafor",
    amount: "145,000",
    status: "accepted",
    date: "Oct 24, 2023",
  },
  {
    id: 2,
    child: "Amina Bello",
    class: "Primary 4",
    payer: "Mrs. Bello",
    amount: "82,500",
    status: "pending",
    date: "Oct 24, 2023",
  },
  {
    id: 3,
    child: "Tunde Adeyemi",
    class: "JSS 3",
    payer: "Tunde Adeyemi Sr.",
    amount: "120,000",
    status: "accepted",
    date: "Oct 23, 2023",
  },
  {
    id: 4,
    child: "Nneka Nwosu",
    class: "Primary 2",
    payer: "Chief Nwosu",
    amount: "75,000",
    status: "rejected",
    date: "Oct 23, 2023",
  },
];

const statCards = [
  {
    label: "Total Responses",
    value: "1,284",
    badge: "+12.5%",
    badgeColor: "text-emerald-600 bg-emerald-50",
    iconBg: "bg-[#136dec]/10",
    iconColor: "text-[#136dec]",
    icon: BarChart2,
  },
  {
    label: "Pending Review",
    value: "38",
    badge: "Action Req.",
    badgeColor: "text-amber-600 bg-amber-50",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    icon: Clock,
  },
  {
    label: "Accepted",
    value: "1,196",
    badge: "93% Rate",
    badgeColor: "text-emerald-600 bg-emerald-50",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    icon: CheckCircle2,
  },
  {
    label: "Rejected",
    value: "50",
    badge: "-2%",
    badgeColor: "text-rose-600 bg-rose-50",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    icon: XCircle,
  },
];

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

// NEW: Pipeline Stage Component (replaces collection status)
function PipelineStage({ stage }) {
  const Icon = stage.icon;
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
                Weekly volume for the last 8 weeks
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
                data={weeklySubmissions}
                barCategoryGap="35%"
                margin={{ top: 4, right: 0, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="week"
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
          </div>

          {/* Legend */}
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
        </div>
      </div>

      {/* ── Charts row 2 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* NEW: Payment-to-Handover Pipeline (replaces Collection Status) */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 lg:p-6">
          <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-0.5">
            Payment-to-Handover Pipeline
          </h4>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-5 sm:mb-6 lg:mb-8">
            Track submissions through verification to completion
          </p>
          <div className="space-y-6 sm:space-y-7 lg:space-y-8">
            {pipelineStatus.map((stage, index) => (
              <PipelineStage key={stage.stage} stage={stage} index={index} />
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
            {recentResponses.map((row) => (
              <div key={row.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{row.child}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {row.class} · {row.payer}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-sm font-bold text-slate-900">₦{row.amount}</span>
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
                {recentResponses.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                        {row.child}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                        {row.class}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-400 whitespace-nowrap">{row.payer}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                        {row.amount}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-slate-400 whitespace-nowrap">{row.date}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
