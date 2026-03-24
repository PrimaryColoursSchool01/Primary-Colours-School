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
  ArrowUpRight,
  ArrowRight,
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

const collectionStatus = [
  { section: "Primary Section", collected: 82, amount: "₦4.2M", due: "₦0.9M" },
  { section: "Secondary Section", collected: 68, amount: "₦5.1M", due: "₦2.4M" },
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

// ─── Stat cards config ────────────────────────────────────────────────────────

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

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const styles = {
    accepted: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    rejected: "bg-rose-50 text-rose-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[status]}`}
    >
      {status}
    </span>
  );
}

// ─── Custom bar tooltip ───────────────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-xl">
      <p className="text-slate-400 mb-0.5">{label}</p>
      <p>{payload[0].value} submissions</p>
    </div>
  );
}

// ─── Custom pie tooltip ───────────────────────────────────────────────────────

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-xl">
      <p>{payload[0].name}</p>
      <p className="text-slate-300">{payload[0].value}%</p>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  return (
    <div className="p-6 sm:p-8 space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time school financial performance and response tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-4 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Last 30 Days
            </span>
          </button>
          <button className="h-9 px-4 text-sm font-bold text-white bg-[#136dec] rounded-lg hover:opacity-90 transition-all flex items-center gap-2 shadow-sm shadow-[#136dec]/30">
            <Download size={14} />
            Export Report
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200/80 p-5 hover:border-[#136dec]/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg ${card.iconBg}`}>
                <card.icon size={18} className={card.iconColor} strokeWidth={2} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
              {card.label}
            </p>
            <h3 className="text-3xl font-extrabold text-slate-900">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h4 className="font-bold text-slate-900 text-base">Payment Submissions</h4>
              <p className="text-xs text-slate-500 mt-0.5">Weekly volume for the last 8 weeks</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#136dec]" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Submissions
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklySubmissions} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="count" fill="#136dec" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6">
          <h4 className="font-bold text-slate-900 text-base mb-0.5">Revenue Breakdown</h4>
          <p className="text-xs text-slate-500 mb-4">Distribution by Fee Type</p>
          <div className="relative flex items-center justify-center mb-6">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
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
                >
                  {revenueBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total</p>
              <p className="text-xl font-black text-slate-900">₦12.4M</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {revenueBreakdown.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium text-slate-500">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name}
                </div>
                <span className="font-bold text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Collection status */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6">
          <h4 className="font-bold text-slate-900 text-base mb-0.5">Collection Status</h4>
          <p className="text-xs text-slate-500 mb-8">Paid vs Outstanding by Section</p>
          <div className="space-y-8">
            {collectionStatus.map((item) => (
              <div key={item.section} className="space-y-2.5">
                <div className="flex items-end justify-between">
                  <span className="text-sm font-bold text-slate-900">{item.section}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {item.collected}% Collected
                  </span>
                </div>
                <div className="h-5 w-full flex rounded-lg overflow-hidden bg-slate-100">
                  <div
                    className="bg-[#136dec] h-full rounded-lg transition-all"
                    style={{ width: `${item.collected}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                  <div className="flex items-center gap-1.5 text-[#136dec]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#136dec]" />
                    PAID: {item.amount}
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    DUE: {item.due}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent responses table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-base">Recent Responses</h4>
            <Link
              to="/responses"
              className="text-xs font-bold text-[#136dec] hover:underline flex items-center gap-1"
            >
              View All
              <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Child Name</th>
                  <th className="px-5 py-3.5">Class</th>
                  <th className="px-5 py-3.5 hidden sm:table-cell">Payer</th>
                  <th className="px-5 py-3.5">Amount (₦)</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentResponses.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-slate-900">{row.child}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-slate-500">{row.class}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="text-xs text-slate-400">{row.payer}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-slate-900">{row.amount}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-slate-400">{row.date}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer meta */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-slate-200">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          © 2025 Findora · Primary Colours Schools
        </p>
        <div className="flex gap-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Privacy Policy
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            System Status: <span className="text-emerald-500">Normal</span>
          </p>
        </div>
      </div>
    </div>
  );
}
