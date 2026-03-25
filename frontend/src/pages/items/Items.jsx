import { useState, useEffect } from "react";
import { Plus, Download, MoreVertical, ChevronLeft, ChevronRight, Search, Filter, AlertTriangle, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAllItems, createItem, updateItem, deleteItem } from "@/services/itemfees.service";
import AddItemModal from "./AddItemModal";
import { toast } from "sonner";

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
      display: `All ${scope === "section" ? "" : ""}${classNames.length > 0 ? "" : "Classes"}`,
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

// ─── Items ────────────────────────────────────────────────────────────────────

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

  // ─── Load Items on Mount ───────────────────────────────────────────────────
  useEffect(() => {
    loadItems();
  }, []);

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

  // ─── Filter & Pagination ───────────────────────────────────────────────────

  const filtered = items.filter((item) => {
    const matchesTab = activeTab === "all" || item.scope === activeTab;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return <ItemsSkeleton />;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
        {/* ── Page header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">Fees & Items</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage fees, levies, and items across the school.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="h-9 px-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors">
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
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
                  <div key={item._id} className="p-3">
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
                      <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
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

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function ItemsSkeleton() {
  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex justify-between">
        <div>
          <div className="h-6 w-48 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-72 bg-slate-200 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-slate-200 rounded" />
          <div className="h-9 w-28 bg-slate-200 rounded" />
        </div>
      </div>

      <div className="h-9 bg-slate-200 rounded-lg" />

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex gap-4 mb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 w-24 bg-slate-200 rounded" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
