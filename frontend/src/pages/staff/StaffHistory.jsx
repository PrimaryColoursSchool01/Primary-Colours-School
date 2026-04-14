// src/pages/staff/StaffHistory.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { getStaffHistory } from "@/services/staff.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  History,
  Calendar,
  Package,
  User,
  SlidersHorizontal,
  FileX,
  Database,
} from "lucide-react";

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap');

  .hist-page * { font-family: 'DM Sans', sans-serif; }
  .hist-page .df { font-family: 'Bricolage Grotesque', sans-serif; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes rowIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }

  .fade-up { animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1) both; }
  .fade-up-1 { animation: fadeUp 0.4s 0.06s cubic-bezier(.22,1,.36,1) both; }
  .fade-up-2 { animation: fadeUp 0.4s 0.12s cubic-bezier(.22,1,.36,1) both; }
  .fade-in { animation: fadeIn 0.25s ease both; }

  .skeleton { background: linear-gradient(90deg, #f1f5f9 25%, #e8edf4 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 10px; }
  .row-item { animation: rowIn 0.3s cubic-bezier(.22,1,.36,1) both; transition: background 0.15s ease, box-shadow 0.15s ease; }
  .row-item:hover { background: #f0fdf9 !important; box-shadow: inset 3px 0 0 #10b981; }
  .tbl-row { transition: background 0.12s ease; }
  .tbl-row:hover { background: #f0fdf9; }
  .page-btn { transition: all 0.15s ease; }
  .page-btn:hover:not(:disabled) { border-color: #10b981; color: #10b981; }
  .page-btn-active { background: #10b981 !important; color: white !important; border-color: #10b981 !important; }
  .date-input:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.12); }
  .search-wrap:focus-within .search-icon { color: #10b981; }
  .filter-pill { transition: all 0.15s ease; }
  .filter-pill:hover { border-color: #10b981; color: #10b981; }
`;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function avatarColor(name = "") {
  return `hsl(${(name.charCodeAt(0) * 37) % 360}, 52%, 50%)`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ─── Mock Data Generator ─────────────────────────────────────────────────── */
function generateMockHistory(count = 100) {
  const students = [
    "Ahmad Ibrahim",
    "Fatima Musa",
    "Umar Dayyib",
    "Aisha Bello",
    "Yusuf Aliyu",
    "Zainab Sani",
    "Ibrahim Musa",
    "Hauwa Garba",
    "Abubakar Tanko",
    "Maryam Adamu",
  ];
  const classes = ["JSS 1A", "JSS 1B", "JSS 2A", "JSS 2B", "JSS 3A", "SS 1A", "SS 1B", "SS 2A", "SS 3A", "SS 3B"];
  const items = [
    "Mathematics Textbook",
    "English Textbook",
    "School Uniform",
    "Sports Kit",
    "Science Lab Coat",
    "School Bus Fee",
    "Library Fee",
    "ICT Fee",
    "Exam Fee",
    "PTA Levy",
  ];
  const staff = ["John Doe", "Jane Smith", "Ahmad Ibrahim", "Fatima Musa"];
  const notes = ["Parent picked up", "Student collected", "Office delivery", "Via class rep", null, null];

  return Array.from({ length: count }, (_, i) => ({
    id: `mock-hist-${i + 1}`,
    studentName: students[Math.floor(Math.random() * students.length)],
    className: classes[Math.floor(Math.random() * classes.length)],
    itemName: items[Math.floor(Math.random() * items.length)],
    quantity: Math.floor(Math.random() * 3) + 1,
    handedOverBy: staff[Math.floor(Math.random() * staff.length)],
    handedOverAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000).toISOString(),
    note: notes[Math.floor(Math.random() * notes.length)],
  }));
}

/* ─── Skeleton ────────────────────────────────────────────────────────────── */
function PageSkeleton() {
  return (
    <div className="hist-page p-3 sm:p-5 lg:p-8 space-y-4 fade-in">
      <div className="skeleton h-24 rounded-2xl" />
      <div className="skeleton h-20 rounded-xl" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Empty State ─────────────────────────────────────────────────────────── */
function EmptyState({ filtered, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div
        className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl"
        style={{ background: "linear-gradient(135deg, #f0fdf9, #d1fae5)" }}
      >
        {filtered ? <FileX className="h-9 w-9 text-emerald-500 opacity-60" /> : <History className="h-9 w-9 text-emerald-500 opacity-60" />}
      </div>
      <p className="df text-base font-bold text-slate-800">{filtered ? "No matching records" : "No history yet"}</p>
      <p className="mt-1.5 text-sm text-slate-400 max-w-xs leading-relaxed">
        {filtered ? "Try adjusting your date range or search term." : "Collected items will appear here once you start handing them over."}
      </p>
      {filtered && (
        <button
          onClick={onClear}
          className="mt-4 flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Clear filters
        </button>
      )}
    </div>
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
    } else if (range[range.length - 1] !== "…") {
      range.push("…");
    }
  }
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 pb-1">
      <p className="text-xs text-slate-400 font-medium">
        Showing{" "}
        <span className="text-slate-700 font-semibold">
          {start}–{end}
        </span>{" "}
        of <span className="text-slate-700 font-semibold">{total}</span> records
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
          p === "…" ? (
            <span key={`e${i}`} className="px-1 text-slate-300 text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`page-btn flex h-8 min-w-8 px-2 items-center justify-center rounded-lg border text-xs font-semibold ${p === page ? "page-btn-active" : "border-slate-200 text-slate-600"}`}
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

/* ─── Note Badge ─────────────────────────────────────────────────────────── */
function NoteBadge({ note }) {
  // Show dash for empty or default system notes
  if (!note || note === "Marked as collected") return <span className="text-slate-300">—</span>;

  return (
    <span
      className="block max-w-[150px] truncate text-xs italic text-slate-500 cursor-help"
      title={note} // Native browser tooltip shows full text on hover
    >
      "{note}"
    </span>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
const LIMIT = 20;

function defaultDates() {
  const today = new Date();
  const prior = new Date();
  prior.setDate(today.getDate() - 30);
  return { end: today.toISOString().split("T")[0], start: prior.toISOString().split("T")[0] };
}

export default function StaffHistory() {
  const [loading, setLoading] = useState(true); // Full-page loading (initial mount only)
  const [refreshing, setRefreshing] = useState(false); // Subtle refresh indicator (search/pagination/filter updates)
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);

  // Filters
  const defaults = defaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(""); // Debounced search value
  const [showFilters, setShowFilters] = useState(false);

  // Applied filters (only update when user clicks Apply)
  const [appliedStart, setAppliedStart] = useState(defaults.start);
  const [appliedEnd, setAppliedEnd] = useState(defaults.end);

  // Mock data toggle
  const [useMockData, setUseMockData] = useState(false);
  const [mockData, setMockData] = useState([]);

  // Refs
  const searchInputRef = useRef(null);

  // Generate mock data once on mount
  useEffect(() => {
    setMockData(generateMockHistory(100));
  }, []);

  // Debounce search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchHistory = useCallback(
    async (pg = 1, isInitialLoad = false) => {
      try {
        // Only set full-page loading on initial mount
        if (isInitialLoad) {
          setLoading(true);
        } else {
          // For search/pagination/filter updates, use subtle refreshing indicator
          setRefreshing(true);
        }
        setError(null);

        if (useMockData) {
          // Mock data mode with independent filters (mirrors backend logic)
          let filtered = [...mockData];

          // Date range filter: ONLY if custom range applied (not default)
          const hasCustomDateRange = appliedStart !== defaults.start || appliedEnd !== defaults.end;
          if (hasCustomDateRange && (appliedStart || appliedEnd)) {
            filtered = filtered.filter((t) => {
              const tDate = new Date(t.handedOverAt);
              if (appliedStart && tDate < new Date(appliedStart)) return false;
              if (appliedEnd) {
                const end = new Date(appliedEnd);
                end.setHours(23, 59, 59, 999);
                if (tDate > end) return false;
              }
              return true;
            });
          }

          // Search filter: ALWAYS independent (only if provided)
          if (debouncedSearch.trim()) {
            const q = debouncedSearch.toLowerCase();
            filtered = filtered.filter(
              (t) =>
                t.studentName?.toLowerCase().includes(q) ||
                t.itemName?.toLowerCase().includes(q) ||
                t.className?.toLowerCase().includes(q) ||
                t.handedOverBy?.toLowerCase().includes(q),
            );
          }

          const totalFiltered = filtered.length;
          const startIdx = (pg - 1) * LIMIT;
          const paginated = filtered.slice(startIdx, startIdx + LIMIT);

          setTransactions(paginated);
          setTotal(totalFiltered);
          setPage(pg);
          setPages(Math.ceil(totalFiltered / LIMIT));
        } else {
          // Real API mode - INDEPENDENT FILTERS (Stripe/HubSpot style)
          const params = { page: pg, limit: LIMIT };

          // Search: ALWAYS send if provided (independent)
          if (debouncedSearch.trim()) params.search = debouncedSearch;

          // Date range: ONLY send if user explicitly applied a custom range (not default)
          const hasCustomDateRange = appliedStart !== defaults.start || appliedEnd !== defaults.end;
          if (hasCustomDateRange) {
            if (appliedStart) params.startDate = appliedStart;
            if (appliedEnd) params.endDate = appliedEnd;
          }

          const res = await getStaffHistory(params);
          setTransactions(res.data.transactions || []);
          setTotal(res.data.total || 0);
          setPage(res.data.page || 1);
          setPages(res.data.pages || 0);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load history");
        toast.error("Could not load history");
      } finally {
        // Always clear both loading states
        setLoading(false);
        setRefreshing(false);
      }
    },
    [useMockData, mockData, appliedStart, appliedEnd, debouncedSearch, defaults],
  );

  // Initial fetch (full-page loading)
  useEffect(() => {
    fetchHistory(1, true);
  }, []);

  // Fetch when applied filters or debounced search change (subtle refreshing)
  useEffect(() => {
    if (!loading) {
      // Skip if still doing initial load
      fetchHistory(1, false);
    }
  }, [appliedStart, appliedEnd, debouncedSearch, useMockData]);

  const handleApplyFilters = () => {
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const d = defaultDates();
    setStartDate(d.start);
    setEndDate(d.end);
    setAppliedStart(d.start);
    setAppliedEnd(d.end);
    setSearch("");
  };

  const handlePage = (p) => {
    fetchHistory(p, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Client-side search for mock data only (real API handles it server-side)
  const visible =
    useMockData && debouncedSearch.trim()
      ? transactions.filter((t) => {
          const q = debouncedSearch.toLowerCase();
          return (
            t.studentName?.toLowerCase().includes(q) ||
            t.itemName?.toLowerCase().includes(q) ||
            t.className?.toLowerCase().includes(q) ||
            t.handedOverBy?.toLowerCase().includes(q)
          );
        })
      : transactions;

  // Only show date filter chip if custom range is applied (not default)
  const hasCustomDateRange = appliedStart !== defaults.start || appliedEnd !== defaults.end;
  const hasActiveFilters = hasCustomDateRange || debouncedSearch;

  /* ── Render ── */
  // Only show full-page skeleton on initial load
  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <>
        <style>{styles}</style>
        <div className="hist-page flex h-[70vh] flex-col items-center justify-center gap-5 p-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
          <div>
            <h2 className="df text-xl font-bold text-slate-900">Something went wrong</h2>
            <p className="mt-1 text-sm text-slate-500 max-w-xs">{error}</p>
          </div>
          <Button onClick={() => fetchHistory(1, true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-xl h-11">
            Try Again
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="hist-page min-h-screen bg-slate-50/60 p-3 sm:p-5 lg:p-8 xl:p-10 space-y-4 sm:space-y-5">
        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="fade-up flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-emerald-600 uppercase mb-1">Staff Portal</p>
            <h1 className="df text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">Collection History</h1>
            <p className="mt-1 text-sm text-slate-500">
              {total > 0 ? (
                <>
                  <span className="font-semibold text-slate-800">{total}</span> record
                  {total !== 1 ? "s" : ""} collected
                  {hasCustomDateRange && (
                    <span className="text-slate-400">
                      {" "}
                      · {formatDate(appliedStart)} – {formatDate(appliedEnd)}
                    </span>
                  )}
                </>
              ) : (
                "No records found"
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Mock data toggle */}
            <Button
              variant={useMockData ? "default" : "outline"}
              size="sm"
              onClick={() => setUseMockData((v) => !v)}
              className={`h-9 text-xs font-semibold ${useMockData ? "bg-emerald-600 hover:bg-emerald-700" : "hover:border-emerald-500 hover:text-emerald-600"}`}
            >
              <Database className="mr-1.5 h-3.5 w-3.5" />
              {useMockData ? "Mock Data" : "Use Mock"}
            </Button>

            {/* Subtle refreshing indicator - only shows during search/pagination/filter updates */}
            {refreshing && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating…
              </div>
            )}
          </div>
        </div>

        {/* ── Search + Filter Bar ──────────────────────────────────── */}
        <div className="fade-up-1 space-y-2">
          <div className="flex gap-2">
            {/* Search */}
            <div className="search-wrap relative flex-1">
              <Search className="search-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors" />
              <Input
                ref={searchInputRef}
                placeholder="Search student, item, class, staff…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 pl-10 pr-10 rounded-xl border-slate-200 bg-white text-sm placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Date filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`filter-pill flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-all ${showFilters || hasCustomDateRange ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-white text-slate-600"}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Date Range</span>
              {hasCustomDateRange && !showFilters && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/30 text-xs font-bold">✓</span>
              )}
            </button>
          </div>

          {/* Date Range Panel */}
          {showFilters && (
            <div className="fade-in rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filter by Date Range</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                    From
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="date-input h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                    To
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="date-input h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleClearFilters}
                  className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:border-slate-300 transition-colors"
                >
                  Reset to default
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="flex-1 h-10 rounded-lg text-sm font-semibold text-white transition-colors"
                  style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="fade-in flex flex-wrap items-center gap-2">
              {hasCustomDateRange && (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <Calendar className="h-3 w-3" />
                  {formatDate(appliedStart)} – {formatDate(appliedEnd)}
                  <button onClick={handleClearFilters}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {debouncedSearch && (
                <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  "{debouncedSearch}"
                  <button onClick={() => setSearch("")}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mock data banner */}
        {useMockData && (
          <div className="fade-in rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 flex items-center gap-2 text-sm text-emerald-700">
            <Database className="h-4 w-4" />
            Showing mock data for testing. Toggle off to use real API.
          </div>
        )}

        {/* ── Content ─────────────────────────────────────────────── */}
        <div className="fade-up-2">
          {visible.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <EmptyState filtered={hasActiveFilters} onClear={handleClearFilters} />
            </div>
          ) : (
            <>
              {/* ── Desktop Table (md+) ─────────────────────────────── */}
              <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Student</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Class</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Item</th>
                      <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Qty</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Handed Over By</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Date & Time</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 w-[180px]">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {visible.map((tx, idx) => (
                      <tr key={tx.id} className="tbl-row" style={{ animationDelay: `${idx * 25}ms` }}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ background: avatarColor(tx.studentName) }}
                            >
                              {tx.studentName?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-900 truncate max-w-[140px]">{tx.studentName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-slate-600 font-medium text-xs">{tx.className}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold"
                            style={{ background: "rgba(16,185,129,0.08)", color: "#059669" }}
                          >
                            <Package className="h-3 w-3" />
                            {tx.itemName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-bold text-slate-800">{tx.quantity}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                            <span className="text-slate-600 text-xs truncate max-w-[120px]">{tx.handedOverBy}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="text-slate-500 text-xs whitespace-nowrap">{formatDateTime(tx.handedOverAt)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="max-w-[150px] truncate">
                            <NoteBadge note={tx.note} />
                          </div>
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

              {/* ── Mobile Cards (< md) ─────────────────────────────── */}
              <div className="md:hidden space-y-2">
                {visible.map((tx, idx) => (
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
                      <span
                        className="flex-shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ background: "#d1fae5", color: "#065f46" }}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Collected
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 pl-[52px]">
                      <span
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold"
                        style={{ background: "rgba(16,185,129,0.08)", color: "#059669" }}
                      >
                        <Package className="h-3 w-3" />
                        {tx.itemName}
                      </span>
                      <span className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{ background: "#f1f5f9", color: "#475569" }}>
                        × {tx.quantity}
                      </span>
                    </div>
                    <div className="mt-2.5 pl-[52px] space-y-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <User className="h-3 w-3" />
                          {tx.handedOverBy}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(tx.handedOverAt)}
                        </span>
                      </div>
                      {tx.note && tx.note !== "Marked as collected" && (
                        <p className="text-xs italic text-slate-400 truncate max-w-full cursor-help" title={tx.note}>
                          "{tx.note}"
                        </p>
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
    </>
  );
}
