import { useState, useEffect } from "react";
import { Plus, Search, MoreVertical, Edit2, Trash2, BookOpen, AlertTriangle, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getAllClasses, createClass, updateClass, deleteClass, getAllSections } from "@/services/classes.service";

// ─── Section Badge Colors ────────────────────────────────────────────────────

const SECTION_COLORS = {
  Nursery: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  Primary: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  Secondary: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
};

// ─── Add/Edit Class Modal ────────────────────────────────────────────────────

function ClassModal({ open, onOpenChange, onSubmit, editingClass, sections }) {
  const [name, setName] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingClass) {
      setName(editingClass.name);
      setSectionId(editingClass.sectionId || "");
    } else {
      setName("");
      setSectionId("");
    }
  }, [editingClass, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Class name is required");
      return;
    }
    if (!sectionId) {
      toast.error("Please select a section");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({ name: name.trim(), sectionId });
      setName("");
      setSectionId("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save class:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="pb-4 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-base font-bold text-slate-900">{editingClass ? "Edit Class" : "Add New Class"}</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                {editingClass ? "Update the class information." : "Create a new academic class."}
              </DialogDescription>
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

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold text-slate-700">
              Class Name
            </Label>
            <Input
              id="name"
              placeholder="e.g. Primary 1, JSS 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="section" className="text-sm font-semibold text-slate-700">
              Section
            </Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section._id} value={section._id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim() || !sectionId}
              className="w-full sm:w-auto bg-[#136dec] hover:bg-blue-700 text-white"
            >
              {isSubmitting ? "Saving..." : editingClass ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation Modal ───────────────────────────────────────────────

function DeleteConfirmationModal({ open, onOpenChange, className, onConfirm, isDeleting }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="pb-4 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-base font-bold text-slate-900">Delete Class?</DialogTitle>
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
            <div className="text-sm text-amber-900">
              <p>
                Delete <span className="font-semibold">{className}</span>?
              </p>
              <p className="text-xs text-amber-700 mt-1">⚠️ This will remove the class from all associated items and students.</p>
            </div>
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

// ─── Classes Page ────────────────────────────────────────────────────────────

export default function Classes() {
  // ─── Data State ────────────────────────────────────────────────────────────
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Filter State ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // ─── Modal State ───────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  // ─── Delete Modal State ────────────────────────────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Pagination State ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ─── Load Data on Mount ────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesRes, sectionsRes] = await Promise.all([getAllClasses(), getAllSections()]);

      // Map classes to include sectionName
      const classesData = (classesRes.classes || []).map((cls) => ({
        _id: cls._id,
        name: cls.name,
        sectionId: cls.sectionId?._id || cls.sectionId,
        sectionName: cls.sectionId?.name || "Unknown",
        createdAt: cls.createdAt || new Date().toISOString(),
      }));

      // Map sections (from nested structure or flat)
      const sectionsData = (sectionsRes.sections || sectionsRes || []).map((section) => ({
        _id: section._id,
        name: section.name,
      }));

      setClasses(classesData);
      setSections(sectionsData);
    } catch (error) {
      console.error("Failed to load ", error);
      toast.error(error.response?.data?.message || "Failed to load data");
      setClasses([]);
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── CRUD Operations ───────────────────────────────────────────────────────

  const handleAddClass = async (classData) => {
    try {
      await createClass(classData);
      await loadData();
      toast.success("Class created successfully");
    } catch (error) {
      console.error("Failed to create class:", error);
      toast.error(error.response?.data?.message || "Failed to create class");
      throw error;
    }
  };

  const handleEditClass = async (classData) => {
    try {
      await updateClass(editingClass._id, classData);
      await loadData();
      toast.success("Class updated successfully");
      setEditingClass(null);
    } catch (error) {
      console.error("Failed to update class:", error);
      toast.error(error.response?.data?.message || "Failed to update class");
      throw error;
    }
  };

  const confirmDelete = (cls) => {
    setClassToDelete(cls);
    setDeleteModalOpen(true);
  };

  const handleDeleteClass = async () => {
    if (!classToDelete) return;

    try {
      setIsDeleting(true);
      await deleteClass(classToDelete._id);
      await loadData();
      toast.success("Class deleted successfully");
      setDeleteModalOpen(false);
      setClassToDelete(null);
    } catch (error) {
      console.error("Failed to delete class:", error);
      toast.error(error.response?.data?.message || "Failed to delete class");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (cls) => {
    setEditingClass(cls);
    setModalOpen(true);
  };

  // ─── Filter Classes ────────────────────────────────────────────────────────

  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = cls.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "all" || cls.sectionName?.toLowerCase() === activeTab.toLowerCase();
    return matchesSearch && matchesTab;
  });

  // ─── Pagination ────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const paginatedClasses = filteredClasses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ─── Format Date ───────────────────────────────────────────────────────────

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // ─── Get Section Badge Colors ──────────────────────────────────────────────

  const getSectionColors = (sectionName) => {
    return (
      SECTION_COLORS[sectionName] || {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-200",
      }
    );
  };

  // ─── Loading State with Meaningful Message & Motion ─────────────────────────

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 animate-in fade-in duration-500">
        {/* Header with spinner and message */}
        <div className="text-center sm:text-left space-y-2">
          <div className="flex justify-center sm:justify-start items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#136dec] border-t-transparent" />
            <p className="text-slate-500 font-medium">Loading classes...</p>
          </div>
          <p className="text-sm text-slate-400">Fetching your academic structure, please wait.</p>
        </div>

        {/* Animated skeleton cards */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="h-10 w-10 bg-slate-200 rounded-lg" />
                <div className="flex-1 h-4 bg-slate-200 rounded" />
                <div className="h-6 w-24 bg-slate-200 rounded hidden sm:block" />
                <div className="h-4 w-32 bg-slate-200 rounded hidden md:block" />
                <div className="h-8 w-8 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Subtle footer note */}
        <p className="text-center text-xs text-slate-400 animate-pulse">Preparing your dashboard...</p>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* ── Page Header ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Classes</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage and organize your academic classes.</p>
          </div>
          <Button
            onClick={() => {
              setEditingClass(null);
              setModalOpen(true);
            }}
            className="h-10 px-4 sm:px-5 flex items-center gap-2 bg-[#136dec] hover:bg-blue-700 text-white text-sm font-bold shadow-sm shadow-[#136dec]/25"
          >
            <Plus size={16} />
            <span>Add Class</span>
          </Button>
        </div>

        {/* ── Search & Filter Bar ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search classes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 pl-9 pr-4 text-sm"
            />
          </div>

          {/* Section Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => {
                setActiveTab("all");
                setCurrentPage(1);
              }}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg border transition-all whitespace-nowrap ${
                activeTab === "all"
                  ? "bg-[#136dec] text-white border-[#136dec]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#136dec]"
              }`}
            >
              All
            </button>
            {sections.map((section) => (
              <button
                key={section._id}
                onClick={() => {
                  setActiveTab(section.name);
                  setCurrentPage(1);
                }}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg border transition-all whitespace-nowrap ${
                  activeTab === section.name
                    ? "bg-[#136dec] text-white border-[#136dec]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-[#136dec]"
                }`}
              >
                {section.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table Card ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {paginatedClasses.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                {search || activeTab !== "all" ? "No classes found" : "No classes yet"}
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mb-6">
                {search || activeTab !== "all"
                  ? "Try adjusting your search or filter."
                  : "Get started by creating your first class. This will help you organize your students effectively."}
              </p>
              {!search && activeTab === "all" && (
                <Button
                  onClick={() => {
                    setEditingClass(null);
                    setModalOpen(true);
                  }}
                  className="bg-[#136dec] hover:bg-blue-700 text-white"
                >
                  <Plus size={16} className="mr-2" />
                  Add First Class
                </Button>
              )}
            </div>
          ) : (
            /* Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Class Name
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                      Section
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Date Created
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedClasses.map((cls) => {
                    const colors = getSectionColors(cls.sectionName);
                    return (
                      <tr key={cls._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 sm:px-6 py-4 sm:py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#136dec]/10 flex items-center justify-center text-[#136dec] shrink-0">
                              <BookOpen size={18} />
                            </div>
                            <span className="font-semibold text-xs sm:text-sm md:text-base">{cls.name}</span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5 hidden sm:table-cell">
                          <Badge
                            className={`${colors.bg} ${colors.text} ${colors.border} border text-[10px] sm:text-xs font-bold uppercase`}
                          >
                            {cls.sectionName}
                          </Badge>
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5 text-slate-600 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm">{formatDate(cls.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 text-slate-400 hover:text-[#136dec] hover:bg-slate-50 rounded transition-colors">
                                <MoreVertical size={16} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(cls)}>
                                <Edit2 size={14} className="mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-rose-600" onClick={() => confirmDelete(cls)}>
                                <Trash2 size={14} className="mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination Footer ──────────────────────────────────────────── */}
          {paginatedClasses.length > 0 && (
            <div className="px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-slate-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredClasses.length)} of{" "}
                {filteredClasses.length} classes
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add/Edit Class Modal ──────────────────────────────────────────── */}
      <ClassModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={editingClass ? handleEditClass : handleAddClass}
        editingClass={editingClass}
        sections={sections}
      />

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        className={classToDelete?.name}
        onConfirm={handleDeleteClass}
        isDeleting={isDeleting}
      />
    </>
  );
}
