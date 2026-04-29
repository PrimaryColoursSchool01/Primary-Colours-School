// src/pages/staff/StaffAssignments.jsx
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { getStaffAssignments, markCollected } from "@/services/staff.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Package, CheckCircle2, Loader2, AlertCircle, Search, ChevronLeft, ChevronRight, X, ClipboardList, Calendar } from "lucide-react";

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap');

  .asgn-page * { font-family: 'DM Sans', sans-serif; }
  .asgn-page .df { font-family: 'Bricolage Grotesque', sans-serif; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
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
  @keyframes rowIn {
    from { opacity: 0; transform: translateX(-6px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .fade-up   { animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1) both; }
  .fade-up-1 { animation: fadeUp 0.4s 0.06s cubic-bezier(.22,1,.36,1) both; }
  .fade-up-2 { animation: fadeUp 0.4s 0.12s cubic-bezier(.22,1,.36,1) both; }
  .fade-in   { animation: fadeIn 0.25s ease both; }

  .skeleton {
    background: linear-gradient(90deg, #f1f5f9 25%, #e8edf4 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 10px;
  }

  .row-item {
    animation: rowIn 0.3s cubic-bezier(.22,1,.36,1) both;
    transition: background 0.15s ease, box-shadow 0.15s ease;
  }
  .row-item:hover {
    background: #f5f9ff !important;
    box-shadow: inset 3px 0 0 #136dec;
  }

  .tbl-row {
    transition: background 0.12s ease;
  }
  .tbl-row:hover { background: #f5f9ff; }
  .tbl-row:hover .collect-chip {
    background: #136dec !important;
    color: white !important;
  }

  .collect-chip {
    transition: all 0.15s ease;
  }

  .page-btn {
    transition: all 0.15s ease;
  }
  .page-btn:hover:not(:disabled) {
    border-color: #136dec;
    color: #136dec;
  }
  .page-btn-active {
    background: #136dec !important;
    color: white !important;
    border-color: #136dec !important;
  }

  .search-wrap:focus-within .search-icon { color: #136dec; }
`;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function avatarColor(name = "") {
  return `hsl(${(name.charCodeAt(0) * 37) % 360}, 52%, 50%)`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ─── Enhanced Skeleton Loader with Meaningful Message & Motion ──────────── */
function PageSkeleton() {
  return (
    <div className="asgn-page p-3 sm:p-5 lg:p-8 space-y-4 fade-in">
      {/* Spinner + messages */}
      <div className="text-center sm:text-left space-y-2 mb-4">
        <div className="flex justify-center sm:justify-start items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#136dec] border-t-transparent" />
          <p className="text-slate-500 font-medium">Loading assignments...</p>
        </div>
        <p className="text-sm text-slate-400">Fetching your distribution list, please wait.</p>
      </div>

      {/* Header skeleton */}
      <div className="skeleton h-24 rounded-2xl" />
      {/* Search bar skeleton */}
      <div className="skeleton h-14 rounded-xl" />
      {/* Table rows skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>

      {/* Subtle footer note */}
      <p className="text-center text-xs text-slate-400 animate-pulse pt-4">Preparing your assignments...</p>
    </div>
  );
}

/* ─── Empty State ─────────────────────────────────────────────────────────── */
function EmptyState({ filtered, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div
        className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl"
        style={{ background: "linear-gradient(135deg, #f0f6ff, #e8f0fe)" }}
      >
        <ClipboardList className="h-9 w-9 text-[#136dec] opacity-60" />
      </div>
      <p className="df text-base font-bold text-slate-800">{filtered ? "No matching assignments" : "All caught up!"}</p>
      <p className="mt-1.5 text-sm text-slate-400 max-w-xs leading-relaxed">
        {filtered ? "Try adjusting your filters or clearing the search." : "You have no pending assignments right now. Check back later."}
      </p>
      {filtered && (
        <button
          onClick={onClear}
          className="mt-4 flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-[#136dec] hover:text-[#136dec] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Clear filters
        </button>
      )}
    </div>
  );
}

/* ─── Collect Modal ───────────────────────────────────────────────────────── */
function CollectModal({ item, open, onClose, onConfirm, submitting }) {
  const [note, setNote] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent
        className="w-[calc(100vw-24px)] sm:w-full sm:max-w-md rounded-2xl border-0 p-0 overflow-hidden"
        style={{ boxShadow: "0 32px 80px -20px rgba(0,0,0,0.22)" }}
      >
        {/* Gradient header */}
        <div className="px-6 pt-6 pb-5" style={{ background: "linear-gradient(135deg, #0d4fad, #136dec)" }}>
          <DialogTitle className="df text-xl font-bold text-white">Confirm Collection</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-blue-100">Verify the details before confirming handover.</DialogDescription>
        </div>

        {item && (
          <div className="px-6 py-5 space-y-4 bg-white">
            {/* Detail card */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: avatarColor(item.studentName) }}
                >
                  {item.studentName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{item.studentName}</p>
                  <p className="text-xs text-slate-400">{item.className}</p>
                </div>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#136dec]" />
                  <span className="text-sm font-medium text-slate-700">{item.itemName}</span>
                </div>
                <span className="rounded-lg px-3 py-1 text-xs font-bold text-[#136dec]" style={{ background: "rgba(19,109,236,0.08)" }}>
                  Qty: {item.quantity}
                </span>
              </div>
              {item.dateOfPayment && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  Payment date: {formatDate(item.dateOfPayment)}
                </div>
              )}
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Note <span className="text-xs font-normal text-slate-400">(Optional)</span>
              </label>
              <Input
                placeholder="e.g., Parent picked up, Student collected in person…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={submitting}
                className="h-11 rounded-xl border-slate-200 text-sm placeholder:text-slate-300 focus:ring-2 focus:ring-[#136dec]/20 focus:border-[#136dec]"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <DialogClose asChild>
                <Button variant="outline" disabled={submitting} className="flex-1 h-11 rounded-xl border-slate-200 font-semibold">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                className="flex-1 h-11 rounded-xl font-semibold text-white"
                style={{
                  background: submitting ? "#7ab0f7" : "linear-gradient(135deg, #136dec, #2f88ff)",
                  boxShadow: submitting ? "none" : "0 8px 20px -8px rgba(19,109,236,0.5)",
                }}
                onClick={() => onConfirm(note)}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Pagination ──────────────────────────────────────────────────────────── */
function Pagination({ page, pages, total, limit, onPage }) {
  if (pages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const range = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
      range.push(i);
    } else if (range[range.length - 1] !== "...") {
      range.push("...");
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 pb-1">
      <p className="text-xs text-slate-400 font-medium">
        Showing{" "}
        <span className="text-slate-700 font-semibold">
          {start}–{end}
        </span>{" "}
        of <span className="text-slate-700 font-semibold">{total}</span> assignments
      </p>
      <div className="flex items-center gap-1.5">
        <button
          className="page-btn flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {range.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-slate-300 text-sm">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`page-btn flex h-8 min-w-8 px-2 items-center justify-center rounded-lg border text-xs font-semibold ${
                p === page
                  ? "page-btn-active border-[#136dec] bg-[#136dec] text-white"
                  : "border-slate-200 text-slate-600 hover:border-[#136dec] hover:text-[#136dec]"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          className="page-btn flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={() => onPage(page + 1)}
          disabled={page === pages}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
const LIMIT = 20;

export default function StaffAssignments() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [collecting, setCollecting] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAssignments = useCallback(
    async (pg = 1, silent = false) => {
      try {
        silent ? setRefreshing(true) : setLoading(true);
        setError(null);

        const params = { page: pg, limit: LIMIT };
        if (appliedSearch.trim()) params.search = appliedSearch;

        const res = await getStaffAssignments(params);
        setTransactions(res.data.transactions || []);
        setTotal(res.data.total || 0);
        setPage(res.data.page || 1);
        setPages(res.data.pages || 0);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load assignments");
        toast.error("Could not load assignments");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [appliedSearch],
  );

  useEffect(() => {
    fetchAssignments(1);
  }, [appliedSearch, fetchAssignments]);

  const handlePage = (p) => {
    fetchAssignments(p, true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCollect = async (note) => {
    if (!collecting || submitting) return;
    setSubmitting(true);
    try {
      await markCollected(collecting.id, note);
      toast.success("Item marked as collected");
      fetchAssignments(page, true);
      setCollecting(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark as collected");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = () => {
    setAppliedSearch(search.trim());
  };
  const clearSearch = () => {
    setSearch("");
    setAppliedSearch("");
  };
  const hasSearch = !!appliedSearch;

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <>
        <style>{styles}</style>
        <div className="asgn-page flex h-[70vh] flex-col items-center justify-center gap-5 p-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
          <div>
            <h2 className="df text-xl font-bold text-slate-900">Something went wrong</h2>
            <p className="mt-1 text-sm text-slate-500 max-w-xs">{error}</p>
          </div>
          <Button onClick={() => fetchAssignments(1)} className="bg-[#136dec] hover:bg-[#0f5bbd] text-white px-6 rounded-xl h-11">
            Try Again
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="asgn-page min-h-screen bg-slate-50/60 p-3 sm:p-5 lg:p-8 xl:p-10 space-y-4 sm:space-y-5">
        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="fade-up flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#136dec] uppercase mb-1">Staff Portal</p>
            <h1 className="df text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">Assignments</h1>
            <p className="mt-1 text-sm text-slate-500">
              {total > 0 ? (
                <>
                  <span className="font-semibold text-slate-800">{total}</span> pending item
                  {total !== 1 ? "s" : ""} to distribute
                </>
              ) : (
                "No pending assignments"
              )}
            </p>
          </div>

          {refreshing && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating…
            </div>
          )}
        </div>

        {/* ── Search Bar Only (No Filters) ───────────────────────────── */}
        <div className="fade-up-1">
          <div className="flex gap-2">
            <div className="search-wrap relative flex-1">
              <Search className="search-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors" />
              <Input
                placeholder="Search student, item, or class…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                className="h-11 pl-10 pr-10 rounded-xl border-slate-200 bg-white text-sm placeholder:text-slate-300 focus:ring-2 focus:ring-[#136dec]/20 focus:border-[#136dec]"
              />
              {search && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button onClick={handleSearch} className="h-11 rounded-xl bg-[#136dec] hover:bg-[#0f5bbd] text-white px-4">
              Search
            </Button>
          </div>

          {hasSearch && (
            <div className="fade-in flex items-center gap-2 mt-2">
              <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                "{appliedSearch}"
                <button onClick={clearSearch}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          )}
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}
        <div className="fade-up-2">
          {transactions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <EmptyState filtered={hasSearch} onClear={clearSearch} />
            </div>
          ) : (
            <>
              {/* Desktop Table (md+) */}
              <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Student</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Class</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Item</th>
                      <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Qty</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Payment Date</th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transactions.map((tx, idx) => (
                      <tr key={tx.id} className="tbl-row" style={{ animationDelay: `${idx * 30}ms` }}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ background: avatarColor(tx.studentName) }}
                            >
                              {tx.studentName?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-900 truncate max-w-[160px]">{tx.studentName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-slate-600 font-medium">{tx.className}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold"
                            style={{ background: "rgba(19,109,236,0.07)", color: "#136dec" }}
                          >
                            <Package className="h-3 w-3" />
                            {tx.itemName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-bold text-slate-800">{tx.quantity}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-slate-500 text-xs">{formatDate(tx.dateOfPayment)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            className="collect-chip inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"
                            onClick={() => setCollecting(tx)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Collect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {pages > 1 && (
                  <div className="border-t border-slate-100 px-5 py-3">
                    <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPage={handlePage} />
                  </div>
                )}
              </div>

              {/* Mobile Cards (< md) */}
              <div className="md:hidden space-y-2">
                {transactions.map((tx, idx) => (
                  <div
                    key={tx.id}
                    className="row-item rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ background: avatarColor(tx.studentName) }}
                      >
                        {tx.studentName?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{tx.studentName}</p>
                        <p className="text-xs text-slate-400 font-medium">{tx.className}</p>
                      </div>
                      <Button
                        size="sm"
                        className="flex-shrink-0 h-9 rounded-xl px-3 text-xs font-semibold text-white"
                        style={{ background: "#136dec" }}
                        onClick={() => setCollecting(tx)}
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Collect
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 pl-[52px]">
                      <span
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold"
                        style={{ background: "rgba(19,109,236,0.07)", color: "#136dec" }}
                      >
                        <Package className="h-3 w-3" />
                        {tx.itemName}
                      </span>
                      <span className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{ background: "#f1f5f9", color: "#475569" }}>
                        × {tx.quantity}
                      </span>
                      {tx.dateOfPayment && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Calendar className="h-3 w-3" />
                          {formatDate(tx.dateOfPayment)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {pages > 1 && (
                  <div className="pt-2">
                    <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPage={handlePage} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <CollectModal
        item={collecting}
        open={!!collecting}
        onClose={() => setCollecting(null)}
        onConfirm={handleCollect}
        submitting={submitting}
      />
    </>
  );
}
