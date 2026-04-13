// src/pages/staff/StaffDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getStaffDashboard, markCollected } from "@/services/staff.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Package, CheckCircle2, ArrowRight, Loader2, AlertCircle, ClipboardList, History, Sparkles, User } from "lucide-react";

/* ─── Animations ──────────────────────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap');

  .staff-dash * { font-family: 'DM Sans', sans-serif; }
  .staff-dash .display-font { font-family: 'Bricolage Grotesque', sans-serif; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(19,109,236,0.25); }
    70%  { box-shadow: 0 0 0 10px rgba(19,109,236,0); }
    100% { box-shadow: 0 0 0 0 rgba(19,109,236,0); }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .animate-fade-up          { animation: fadeUp 0.45s cubic-bezier(.22,1,.36,1) both; }
  .animate-fade-up-1        { animation: fadeUp 0.45s 0.05s cubic-bezier(.22,1,.36,1) both; }
  .animate-fade-up-2        { animation: fadeUp 0.45s 0.10s cubic-bezier(.22,1,.36,1) both; }
  .animate-fade-up-3        { animation: fadeUp 0.45s 0.15s cubic-bezier(.22,1,.36,1) both; }
  .animate-fade-up-4        { animation: fadeUp 0.45s 0.20s cubic-bezier(.22,1,.36,1) both; }
  .animate-fade-in          { animation: fadeIn 0.3s ease both; }

  .stat-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px -8px rgba(0,0,0,0.12);
  }

  .action-row {
    transition: background 0.15s ease, transform 0.15s ease;
  }
  .action-row:hover {
    background: #f0f6ff;
    transform: translateX(2px);
  }

  .collect-btn {
    animation: pulse-ring 2.5s ease infinite;
  }

  .nav-card {
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  .nav-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 60%, rgba(19,109,236,0.06));
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .nav-card:hover {
    border-color: #136dec;
    box-shadow: 0 0 0 3px rgba(19,109,236,0.08);
    transform: translateY(-1px);
  }
  .nav-card:hover::after { opacity: 1; }

  .skeleton {
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
  }

  .banner-noise {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    background: #fef3c7;
    color: #92400e;
  }

  .empty-state-icon {
    animation: spin-slow 8s linear infinite;
  }

  /* Responsive table-to-card for priority list */
  @media (max-width: 480px) {
    .priority-meta { flex-direction: column; gap: 2px; }
  }
`;

/* ─── Skeleton Loader ────────────────────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="staff-dash p-4 sm:p-6 lg:p-8 space-y-5 animate-fade-in">
      <div className="skeleton h-36 sm:h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <div className="skeleton h-28 rounded-xl" />
        <div className="skeleton h-28 rounded-xl" />
      </div>
      <div className="skeleton h-64 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="skeleton h-14 rounded-xl" />
        <div className="skeleton h-14 rounded-xl" />
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function StaffDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [collecting, setCollecting] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getStaffDashboard();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard");
      toast.error("Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCollect = (item) => {
    setCollecting(item);
    setNote("");
  };

  const handleConfirmCollect = async () => {
    if (!collecting || submitting) return;
    setSubmitting(true);
    try {
      await markCollected(collecting.transactionId, note);
      toast.success("Item marked as collected successfully");
      setCollecting(null);
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark item as collected");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── States ── */
  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <>
        <style>{styles}</style>
        <div className="staff-dash flex h-[70vh] flex-col items-center justify-center gap-5 p-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
          <div>
            <h2 className="display-font text-xl font-bold text-slate-900">Something went wrong</h2>
            <p className="mt-1 text-sm text-slate-500 max-w-xs">{error}</p>
          </div>
          <Button onClick={fetchDashboard} className="bg-[#136dec] hover:bg-[#0f5bbd] text-white px-6 rounded-xl h-11">
            Try Again
          </Button>
        </div>
      </>
    );
  }

  if (!data) return null;

  const { welcome, stats, priorityActions } = data;

  /* ── Format date nicely ── */
  const formattedDate = new Date(welcome.date).toLocaleDateString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <style>{styles}</style>
      <div className="staff-dash min-h-screen bg-slate-50/60 p-3 sm:p-5 lg:p-8 xl:p-10 space-y-4 sm:space-y-5 lg:space-y-6">
        {/* ── Welcome Banner ────────────────────────────────────────── */}
        <div
          className="animate-fade-up relative overflow-hidden rounded-2xl p-5 sm:p-7 lg:p-8 text-white shadow-xl"
          style={{
            background: "linear-gradient(135deg, #0d4fad 0%, #136dec 45%, #2f88ff 100%)",
            boxShadow: "0 20px 60px -20px rgba(19,109,236,0.5)",
          }}
        >
          {/* Noise texture overlay */}
          <div className="banner-noise absolute inset-0 pointer-events-none" />

          {/* Decorative circles */}
          <div
            className="absolute -right-10 -top-10 h-48 w-48 rounded-full pointer-events-none"
            style={{ background: "rgba(255,255,255,0.08)", filter: "blur(1px)" }}
          />
          <div
            className="absolute -bottom-12 right-24 h-36 w-36 rounded-full pointer-events-none"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
          <div
            className="absolute top-4 right-1/3 h-3 w-3 rounded-full pointer-events-none"
            style={{ background: "rgba(255,255,255,0.3)" }}
          />
          <div
            className="absolute bottom-6 right-1/4 h-2 w-2 rounded-full pointer-events-none"
            style={{ background: "rgba(255,255,255,0.2)" }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-blue-200 opacity-80" />
                <span className="text-xs font-medium tracking-widest text-blue-200 uppercase">Staff Portal</span>
              </div>
              <h1 className="display-font text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
                Welcome back,
                <br className="sm:hidden" /> <span className="text-white">{welcome.name}</span> 👋
              </h1>
              <p className="mt-2 text-sm text-blue-100 font-medium">{formattedDate}</p>
            </div>

            {/* Mini stat pill */}
            <div
              className="flex-shrink-0 self-start sm:self-center rounded-xl px-4 py-3 text-center"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
            >
              <p className="display-font text-3xl font-bold text-white leading-none">{stats.pending}</p>
              <p className="text-xs text-blue-100 mt-1 font-medium">Pending Today</p>
            </div>
          </div>
        </div>

        {/* ── Stats Grid ────────────────────────────────────────────── */}
        <div className="animate-fade-up-1 grid grid-cols-2 gap-3 sm:gap-4">
          {/* Pending card */}
          <div className="stat-card rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Pending</p>
                <p className="display-font mt-2 text-4xl sm:text-5xl font-extrabold text-slate-900 leading-none">{stats.pending}</p>
                <p className="mt-1.5 text-xs text-slate-500 font-medium">Items to distribute</p>
              </div>
              <div
                className="flex-shrink-0 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl"
                style={{ background: "#fffbeb" }}
              >
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
              </div>
            </div>
            {/* Bottom accent bar */}
            <div className="mt-3 h-1 rounded-full bg-amber-100">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-700"
                style={{ width: stats.pending > 0 ? "100%" : "0%" }}
              />
            </div>
          </div>

          {/* Collected Today card */}
          <div className="stat-card rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Collected</p>
                <p className="display-font mt-2 text-4xl sm:text-5xl font-extrabold text-slate-900 leading-none">{stats.collectedToday}</p>
                <p className="mt-1.5 text-xs text-slate-500 font-medium">Today's handovers</p>
              </div>
              <div
                className="flex-shrink-0 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl"
                style={{ background: "#f0fdf4" }}
              >
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-3 h-1 rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                style={{ width: stats.collectedToday > 0 ? "100%" : "0%" }}
              />
            </div>
          </div>
        </div>

        {/* ── Priority Actions ──────────────────────────────────────── */}
        <div className="animate-fade-up-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(19,109,236,0.08)" }}>
                <ClipboardList className="h-4 w-4 text-[#136dec]" />
              </div>
              <div>
                <h2 className="display-font text-base sm:text-lg font-bold text-slate-900 leading-none">Priority Actions</h2>
                <p className="text-xs text-slate-400 mt-0.5">Pending distributions</p>
              </div>
            </div>
            {priorityActions.length > 0 && (
              <span
                className="flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold text-white"
                style={{ background: "#136dec" }}
              >
                {priorityActions.length}
              </span>
            )}
          </div>

          {/* Body */}
          <div className="p-3 sm:p-4">
            {priorityActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "#f8fafc" }}>
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="display-font text-base font-bold text-slate-800">All caught up!</p>
                <p className="mt-1 text-sm text-slate-400 max-w-xs">No pending items to distribute right now. Check back later.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {priorityActions.map((item, idx) => (
                  <div
                    key={item.transactionId}
                    className="action-row flex flex-row items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 sm:p-4"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    {/* Avatar */}
                    <div
                      className="flex-shrink-0 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{
                        background: `hsl(${(item.studentName.charCodeAt(0) * 37) % 360}, 55%, 52%)`,
                      }}
                    >
                      {item.studentName.charAt(0).toUpperCase()}
                    </div>

                    {/* Details — takes all remaining space */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm sm:text-base leading-snug truncate">{item.studentName}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-xs text-slate-500 font-medium">{item.className}</span>
                        <span className="text-slate-300 text-xs">•</span>
                        <span className="text-xs text-[#136dec] font-semibold">{item.itemName}</span>
                        <span className="text-slate-300 text-xs">×</span>
                        <span className="text-xs font-bold text-slate-700">{item.quantity}</span>
                      </div>
                    </div>

                    {/* Right: action button — never grows, never wraps */}
                    <Button
                      size="sm"
                      className="collect-btn flex-shrink-0 h-9 rounded-lg px-3 sm:px-4 text-xs font-semibold text-white"
                      style={{ background: "#136dec" }}
                      onClick={() => handleOpenCollect(item)}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 hidden sm:inline-block" />
                      <span className="hidden sm:inline">Mark Collected</span>
                      <span className="sm:hidden">Collect</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Navigation ──────────────────────────────────────── */}
        <div className="animate-fade-up-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            className="nav-card group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm"
            onClick={() => navigate("/staff/assignments")}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors"
                style={{ background: "rgba(19,109,236,0.07)" }}
              >
                <ClipboardList className="h-5 w-5 text-[#136dec]" />
              </div>
              <div>
                <p className="display-font text-sm font-bold text-slate-900 group-hover:text-[#136dec] transition-colors">
                  All Assignments
                </p>
                <p className="text-xs text-slate-400 mt-0.5">View full queue</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#136dec] group-hover:translate-x-1 transition-all" />
          </button>

          <button
            className="nav-card group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm"
            onClick={() => navigate("/staff/history")}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors"
                style={{ background: "rgba(16,185,129,0.07)" }}
              >
                <History className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="display-font text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Collection History
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Past handovers</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        {/* ── Confirmation Modal ────────────────────────────────────── */}
        <Dialog open={!!collecting} onOpenChange={(open) => !open && !submitting && setCollecting(null)}>
          <DialogContent
            className="w-[calc(100vw-24px)] sm:w-full sm:max-w-md rounded-2xl border-0 p-0 overflow-hidden shadow-2xl"
            style={{ boxShadow: "0 32px 80px -20px rgba(0,0,0,0.25)" }}
          >
            {/* Modal header with color bar */}
            <div className="px-6 pt-6 pb-5" style={{ background: "linear-gradient(135deg, #0d4fad, #136dec)" }}>
              <DialogTitle className="display-font text-xl font-bold text-white">Confirm Collection</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-blue-100">Verify the details before confirming handover.</DialogDescription>
            </div>

            {collecting && (
              <div className="px-6 py-5 space-y-4 bg-white">
                {/* Student info card */}
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                  {/* Avatar row */}
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{
                        background: `hsl(${(collecting.studentName.charCodeAt(0) * 37) % 360}, 55%, 52%)`,
                      }}
                    >
                      {collecting.studentName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{collecting.studentName}</p>
                      <p className="text-xs text-slate-400">{collecting.className}</p>
                    </div>
                  </div>

                  <div className="h-px bg-slate-200" />

                  {/* Item detail */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-[#136dec]" />
                      <span className="text-sm font-medium text-slate-700">{collecting.itemName}</span>
                    </div>
                    <span className="rounded-lg px-3 py-1 text-xs font-bold text-[#136dec]" style={{ background: "rgba(19,109,236,0.08)" }}>
                      Qty: {collecting.quantity}
                    </span>
                  </div>
                </div>

                {/* Note input */}
                <div className="space-y-1.5">
                  <label htmlFor="collection-note" className="text-sm font-semibold text-slate-700">
                    Note <span className="text-xs font-normal text-slate-400">(Optional)</span>
                  </label>
                  <Input
                    id="collection-note"
                    placeholder="e.g., Parent picked up, Student collected in person…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={submitting}
                    className="h-11 rounded-xl border-slate-200 bg-white text-sm placeholder:text-slate-300 focus:ring-2 focus:ring-[#136dec]/20 focus:border-[#136dec]"
                  />
                </div>

                {/* Footer buttons */}
                <div className="flex gap-2.5 pt-1">
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      disabled={submitting}
                      className="flex-1 h-11 rounded-xl border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    className="flex-1 h-11 rounded-xl font-semibold text-white shadow-lg"
                    style={{
                      background: submitting ? "#7ab0f7" : "linear-gradient(135deg, #136dec, #2f88ff)",
                      boxShadow: submitting ? "none" : "0 8px 20px -8px rgba(19,109,236,0.6)",
                    }}
                    onClick={handleConfirmCollect}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Confirm
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
