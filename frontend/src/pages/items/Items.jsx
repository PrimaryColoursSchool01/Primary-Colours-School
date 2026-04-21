import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Download,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  AlertTriangle,
  X,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAllItems, createItem, updateItem, deleteItem } from "@/services/itemfees.service";
import AddItemModal from "./AddItemModal";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "all", label: "All Items" },
  { key: "global", label: "School-Wide" },
  { key: "section", label: "By Section" },
  { key: "class", label: "By Class" },
];

// ─── Helper: Format class display (truncate if many) ─────────────────────────

function formatClassDisplay(classNames, scope, maxDisplay = 3) {
  if (scope === "global") {
    return { display: "All Classes", showCount: false };
  }

  if (scope === "section") {
    return {
      display: `All ${scope === "section" ? "" : ""}${classNames.length > 0 ? "" : "All Classes"}`,
      showCount: false,
    };
  }

  if (classNames.length === 0) {
    return { display: "All Classes", showCount: false };
  }

  if (classNames.length <= maxDisplay) {
    return { display: classNames.join(", "), showCount: false };
  }

  return {
    display: `${classNames.slice(0, maxDisplay).join(", ")}... +${classNames.length - maxDisplay} more`,
    showCount: true,
  };
}

// ─── Helper: Get class count text for mobile ─────────────────────────────────

function getClassCountText(classNames, scope) {
  if (scope === "global") {
    return "All classes";
  }

  if (scope === "section") {
    return "All classes in section";
  }

  if (classNames.length === 0) {
    return "All classes";
  }

  return `${classNames.length} class${classNames.length > 1 ? "es" : ""}`;
}

// ─── Scope badge ──────────────────────────────────────────────────────────────

function ScopeBadge({ scope }) {
  const config = {
    global: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      label: "School-Wide",
    },
    section: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
      label: "By Section",
    },
    class: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      label: "By Class",
    },
  };

  const style = config[scope];

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold ${style.bg} ${style.text} border ${style.border}`}
    >
      {style.label}
    </span>
  );
}

// ─── Compulsory badge ─────────────────────────────────────────────────────────

function CompulsoryBadge({ value }) {
  return value ? (
    <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
      Required
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
      Optional
    </span>
  );
}

// ─── Delete Confirmation Modal ───────────────────────────────────────────────

function DeleteConfirmationModal({ open, onOpenChange, itemName, onConfirm, isDeleting }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="pb-4 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-base font-bold text-slate-900">Delete Item?</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">This action cannot be undone.</DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 text-slate-400 hover:text-slate-600 shrink-0"
            >
              <X size={14} />
            </Button>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">
              Delete <span className="font-semibold">{itemName}</span>? This will remove it from all roles. Any role left with no items will
              also be deleted.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="w-full sm:w-auto text-slate-600 hover:bg-slate-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Enhanced Skeleton Loader with Meaningful Message & Motion ──────────────

function ItemsSkeleton() {
  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 animate-in fade-in duration-500">
      {/* Header with spinner and message */}
      <div className="text-center sm:text-left space-y-2">
        <div className="flex justify-center sm:justify-start items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#136dec] border-t-transparent" />
          <p className="text-slate-500 font-medium">Loading fee items...</p>
        </div>
        <p className="text-sm text-slate-400">Fetching fee structures and configurations, please wait.</p>
      </div>

      {/* Skeleton for action buttons and search */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <div className="h-6 w-48 bg-slate-200 rounded mb-2 animate-pulse" />
          <div className="h-4 w-72 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-9 w-28 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Search bar skeleton */}
      <div className="h-9 bg-slate-200 rounded-lg animate-pulse" />

      {/* Tabs skeleton */}
      <div className="flex gap-4 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 w-24 bg-slate-200 rounded animate-pulse" />
        ))}
      </div>

      {/* Table rows skeleton with stagger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-48 bg-slate-200 rounded" />
              </div>
              <div className="h-6 w-20 bg-slate-200 rounded" />
              <div className="h-8 w-8 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Subtle footer note */}
      <p className="text-center text-xs text-slate-400 animate-pulse">Preparing your fee items dashboard...</p>
    </div>
  );
}

// ─── Items ───────────────────────────────────────────────────────────────────

export default function Items() {
  // ─── Data State ────────────────────────────────────────────────────────────
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Filter State ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // ─── Modal State ───────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // ─── Delete Modal State ────────────────────────────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ ADDED: For reading ?id= parameter from Configuration page
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ─── Load Items on Mount ───────────────────────────────────────────────────
  useEffect(() => {
    loadItems();
  }, []);

  // ✅ ADDED: Highlight item when ?id= parameter is present
  useEffect(() => {
    const highlightId = searchParams.get("id");
    if (highlightId) {
      // Wait briefly for items to render, then highlight
      const timer = setTimeout(() => {
        const row = document.querySelector(`[data-item-id="${highlightId}"]`);
        if (row) {
          // Scroll to item
          row.scrollIntoView({ behavior: "smooth", block: "center" });
          // Add highlight styles
          row.classList.add("ring-2", "ring-[#136dec]", "bg-[#136dec]/5", "transition-all");
          // Remove highlight after 3 seconds
          setTimeout(() => {
            row.classList.remove("ring-2", "ring-[#136dec]", "bg-[#136dec]/5");
          }, 3000);
        }
      }, 300); // Small delay to ensure DOM is ready
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await getAllItems();
      setItems(response.data || []);
    } catch (error) {
      console.error("Failed to load items:", error);
      toast.error(error.response?.data?.message || "Failed to load items");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── CRUD Operations ───────────────────────────────────────────────────────

  const handleAddItem = async (itemData) => {
    try {
      await createItem(itemData);
      await loadItems();
      toast.success("Item created successfully");
      setModalOpen(false);
    } catch (error) {
      console.error("Failed to create item:", error);
      toast.error(error.response?.data?.message || "Failed to create item");
      throw error;
    }
  };

  const handleEditItem = async (itemData) => {
    try {
      await updateItem(editingItem._id, itemData);
      await loadItems();
      toast.success("Item updated successfully");
      setEditingItem(null);
      setModalOpen(false);
    } catch (error) {
      console.error("Failed to update item:", error);
      toast.error(error.response?.data?.message || "Failed to update item");
      throw error;
    }
  };

  const confirmDelete = (item) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      setIsDeleting(true);
      await deleteItem(itemToDelete._id);
      await loadItems();
      toast.success("Item deleted successfully");
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast.error(error.response?.data?.message || "Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  // ─── PDF Export Function ───────────────────────────────────────────────────

  const handleExportPDF = () => {
    if (!items.length) {
      toast.error("No items to export");
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = pageW - margin * 2;

    // ── Color Palette ─────────────────────────────────────────────────────
    const PRIMARY = [19, 109, 236]; // #136dec
    const PRIMARY_DARK = [12, 85, 180];
    const PRIMARY_LIGHT = [235, 244, 255];
    const SUCCESS = [22, 163, 74];
    const OPTIONAL = [100, 116, 139]; // slate-500
    const SLATE_900 = [15, 23, 42];
    const SLATE_600 = [71, 85, 105];
    const SLATE_400 = [148, 163, 184];
    const SLATE_200 = [226, 232, 240];
    const SLATE_50 = [248, 250, 252];
    const WHITE = [255, 255, 255];

    // ── Helpers ───────────────────────────────────────────────────────────
    const filledRect = (x, y, w, h, r, color) => {
      doc.setFillColor(...color);
      doc.roundedRect(x, y, w, h, r, r, "F");
    };

    // ✅ Use "NGN" instead of "₦" to avoid encoding issues in PDF
    const formatCurrencyPDF = (amt) => {
      const num = typeof amt === "number" ? amt : 0;
      return `NGN ${num.toLocaleString()}`;
    };

    const getScopeLabel = (scope) => {
      switch (scope) {
        case "global":
          return "School-Wide";
        case "section":
          return "By Section";
        case "class":
          return "By Class";
        default:
          return scope;
      }
    };

    // ── HEADER ────────────────────────────────────────────────────────────
    filledRect(0, 0, pageW, 45, 0, PRIMARY_DARK);

    doc
      .setFontSize(18)
      .setFont("helvetica", "bold")
      .setTextColor(...WHITE)
      .text("Primary Colours School", margin, 20);

    doc.setFontSize(11).setFont("helvetica", "normal").setTextColor(220, 235, 255).text("Fees & Items Master List", margin, 28);

    doc.setFontSize(7).setTextColor(220, 235, 255);
    doc.text(`Generated: ${new Date().toLocaleString("en-NG")}`, pageW - margin, 20, { align: "right" });
    doc.text(`Total Items: ${items.length}`, pageW - margin, 27, { align: "right" });

    // Filter summary bar
    filledRect(margin, 38, contentW, 12, 2, PRIMARY_LIGHT);
    doc
      .setFontSize(7)
      .setFont("helvetica", "bold")
      .setTextColor(...PRIMARY);

    let filterParts = [];
    if (activeTab !== "all") filterParts.push(`📋 ${TABS.find((t) => t.key === activeTab)?.label}`);
    if (search.trim()) filterParts.push(`🔍 "${search}"`);

    doc.text(filterParts.length > 0 ? `Filters: ${filterParts.join("  •  ")}` : "Filters: None", margin + 4, 45.5);

    doc
      .setDrawColor(...SLATE_200)
      .setLineWidth(0.3)
      .line(0, 52, pageW, 52);

    // ── TABLE SETUP ───────────────────────────────────────────────────────
    const tableStartY = 60;

    const columns = [
      { header: "Item Name", dataKey: "name", width: 45, align: "left" },
      { header: "Scope", dataKey: "scope", width: 22, align: "center" },
      { header: "Section", dataKey: "section", width: 28, align: "left" },
      { header: "Classes", dataKey: "classes", width: 35, align: "left" },
      { header: "Price", dataKey: "price", width: 24, align: "right" },
      { header: "Type", dataKey: "type", width: 18, align: "center" },
    ];

    const rows = items.map((item) => {
      const classDisplay = formatClassDisplay(item.classNames, item.scope);
      return {
        name: item.name,
        scope: getScopeLabel(item.scope),
        section: item.sectionName || "—",
        classes: classDisplay.display,
        price: formatCurrencyPDF(item.price),
        type: item.compulsory ? "Required" : "Optional",
      };
    });

    // ── AUTO TABLE ────────────────────────────────────────────────────────
    autoTable(doc, {
      startY: tableStartY,
      head: [columns.map((col) => col.header)],
      body: rows.map((row) => columns.map((col) => row[col.dataKey])),
      theme: "striped",
      headStyles: {
        fillColor: PRIMARY,
        textColor: WHITE,
        fontSize: 7.5,
        fontStyle: "bold",
        cellPadding: 4,
        lineWidth: 0,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 3,
        textColor: SLATE_900,
        lineWidth: 0.1,
        lineColor: SLATE_200,
      },
      alternateRowStyles: {
        fillColor: SLATE_50,
      },
      columnStyles: columns.reduce((acc, col, idx) => {
        acc[idx] = {
          cellWidth: col.width,
          halign: col.align,
          fontStyle: idx === 0 ? "bold" : "normal", // Item name bold
        };
        return acc;
      }, {}),
      styles: {
        overflow: "linebreak",
        halign: "left",
      },
      margin: { left: margin, right: margin },
      didParseCell: (hookData) => {
        // Color-code Type column
        if (hookData.column.index === 5 && hookData.section === "body") {
          const typeText = hookData.cell.raw;
          if (typeText === "Required") {
            hookData.cell.styles.textColor = SUCCESS;
            hookData.cell.styles.fontStyle = "bold";
          } else {
            hookData.cell.styles.textColor = OPTIONAL;
          }
        }
        // Right-align prices
        if (hookData.column.index === 4) {
          hookData.cell.styles.halign = "right";
          hookData.cell.styles.fontStyle = "bold";
        }
      },
      didDrawPage: (data) => {
        // Footer on every page
        const footerY = pageH - 15;
        doc
          .setDrawColor(...SLATE_400)
          .setLineWidth(0.2)
          .line(margin, footerY, pageW - margin, footerY);

        doc
          .setFontSize(6)
          .setFont("helvetica", "normal")
          .setTextColor(...SLATE_400);

        doc.text("Primary Colours School • Confidential", margin, footerY + 5);
        doc.text(`Page ${data.pageNumber} of ${data.pageCount}`, pageW - margin, footerY + 5, { align: "right" });
      },
    });

    const filename = `Items_Master_List_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    toast.success("PDF exported successfully");
  };

  // ─── Filter & Pagination ───────────────────────────────────────────────────

  const filtered = items.filter((item) => {
    const matchesTab = activeTab === "all" || item.scope === activeTab;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Show meaningful loading state while fetching data
  if (loading) {
    return <ItemsSkeleton />;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 animate-in fade-in duration-500">
        {/* ── Page header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">Fees & Items</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage fees, levies, and items across the school.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* ✅ Export PDF Button */}
            <button
              onClick={handleExportPDF}
              className="h-9 px-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button
              onClick={() => {
                setEditingItem(null);
                setModalOpen(true);
              }}
              className="h-9 px-3 flex items-center gap-2 rounded-lg bg-[#136dec] text-white text-xs font-bold hover:opacity-90 transition-all shadow-sm shadow-[#136dec]/30"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Add Item</span>
            </button>
          </div>
        </div>

        {/* ✅ NEW: IMPORTANT NOTICE BANNER - Remind admins to assign items to roles */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900 mb-1">⚠️ Important: Prevent Stuck Transactions</h3>
              <p className="text-xs text-amber-800 mb-2">
                After creating or editing an item, you <strong>must</strong> complete these steps to prevent payment transactions from
                getting stuck:
              </p>
              <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside">
                <li>
                  Go to{" "}
                  <button onClick={() => navigate("/roles")} className="underline font-bold hover:text-amber-900">
                    Roles page
                  </button>{" "}
                  and assign this item to a role
                </li>
                <li>
                  Go to{" "}
                  <button onClick={() => navigate("/users")} className="underline font-bold hover:text-amber-900">
                    Users page
                  </button>{" "}
                  and assign staff to that role
                </li>
              </ol>
              <p className="text-xs text-amber-700 mt-2 italic">
                Without these steps, items will have no staff assigned and transactions will remain stuck with status "no_role" or
                "no_staff".
              </p>
            </div>
          </div>
        </div>

        {/* ── Search Bar ──────────────────────────────────────────────────────── */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-9 pl-9 pr-4 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#136dec]/20 focus:border-[#136dec] transition-all"
          />
        </div>

        {/* ── Table card ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex overflow-x-auto scrollbar-none border-b border-slate-200">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setCurrentPage(1);
                }}
                className={`flex-shrink-0 px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.key ? "border-[#136dec] text-[#136dec]" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Mobile Card List (< sm) ───────────────────────────────────────── */}
          <div className="sm:hidden divide-y divide-slate-100">
            {paginatedItems.length === 0 ? (
              <div className="text-center py-12">
                <Filter size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No items found</p>
              </div>
            ) : (
              paginatedItems.map((item) => {
                const classCountText = getClassCountText(item.classNames, item.scope);

                return (
                  // ✅ ADDED: data-item-id attribute for highlight logic
                  <div key={item._id} data-item-id={item._id} className="p-3">
                    {/* Top row: Name + Price */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-bold text-slate-900 truncate flex-1">{item.name}</p>
                      <span className="text-sm font-bold text-slate-900 whitespace-nowrap">₦{item.price.toLocaleString()}</span>
                    </div>

                    {/* Middle row: Scope + Compulsory */}
                    <div className="flex items-center gap-2 mb-2">
                      <ScopeBadge scope={item.scope} />
                      <CompulsoryBadge value={item.compulsory} />
                    </div>

                    {/* Bottom row: Section + Class Count */}
                    <p className="text-[10px] text-slate-500 mb-2.5">
                      {item.sectionName} · {classCountText}
                    </p>

                    {/* Divider + Actions */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })
                          : ""}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 text-slate-400 hover:text-[#136dec] hover:bg-slate-50 rounded transition-colors">
                            <MoreVertical size={14} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(item)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-rose-600" onClick={() => confirmDelete(item)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Desktop Table (sm+) ───────────────────────────────────────────── */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 lg:px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item Name</th>
                  <th className="px-4 lg:px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scope</th>
                  <th className="px-4 lg:px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Section
                  </th>
                  <th className="px-4 lg:px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                    Classes
                  </th>
                  <th className="px-4 lg:px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Price (₦)</th>
                  <th className="px-4 lg:px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Type</th>
                  <th className="px-4 lg:px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <Filter size={32} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500">No items found</p>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => {
                    const classDisplay = formatClassDisplay(item.classNames, item.scope);

                    return (
                      // ✅ ADDED: data-item-id attribute for highlight logic
                      <tr key={item._id} data-item-id={item._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 lg:px-5 py-3.5">
                          <span className="text-sm font-bold text-slate-900">{item.name}</span>
                        </td>
                        <td className="px-4 lg:px-5 py-3.5">
                          <ScopeBadge scope={item.scope} />
                        </td>
                        <td className="px-4 lg:px-5 py-3.5 hidden md:table-cell">
                          <span className="text-xs text-slate-500">{item.sectionName}</span>
                        </td>
                        <td className="px-4 lg:px-5 py-3.5 hidden lg:table-cell">
                          <span className="text-xs text-slate-500" title={classDisplay.showCount ? item.classNames.join(", ") : undefined}>
                            {classDisplay.display}
                          </span>
                        </td>
                        <td className="px-4 lg:px-5 py-3.5">
                          <span className="text-sm font-bold text-slate-900">₦{item.price.toLocaleString()}</span>
                        </td>
                        <td className="px-4 lg:px-5 py-3.5 text-center">
                          <CompulsoryBadge value={item.compulsory} />
                        </td>
                        <td className="px-4 lg:px-5 py-3.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 text-slate-400 hover:text-[#136dec] hover:bg-slate-50 rounded transition-colors">
                                <MoreVertical size={14} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(item)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-rose-600" onClick={() => confirmDelete(item)}>
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ────────────────────────────────────────────────────── */}
          {totalPages > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of{" "}
                {filtered.length} items
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="p-1.5 rounded border border-slate-200 bg-white text-slate-400 hover:text-[#136dec] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                      currentPage === p
                        ? "bg-[#136dec] text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:border-[#136dec] hover:text-[#136dec]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-1.5 rounded border border-slate-200 bg-white text-slate-400 hover:text-[#136dec] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Scope Legend (Helper for Admin) ─────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs font-bold text-blue-900 mb-2">Scope Guide</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-blue-900">School-Wide</p>
                <p className="text-[9px] text-blue-700">Applies to all students across all sections</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-1 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-orange-900">By Section</p>
                <p className="text-[9px] text-orange-700">Applies to specific section only (e.g., Primary)</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-1 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-purple-900">By Class</p>
                <p className="text-[9px] text-purple-700">Applies to specific classes only (e.g., JSS 1-A, JSS 1-B)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add/Edit Item Modal ─────────────────────────────────────────────── */}
      <AddItemModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={editingItem ? handleEditItem : handleAddItem}
        editingItem={editingItem}
      />

      {/* ── Delete Confirmation Modal ───────────────────────────────────────── */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        itemName={itemToDelete?.name}
        onConfirm={handleDeleteItem}
        isDeleting={isDeleting}
      />
    </>
  );
}
