import { useState, useEffect } from "react";
import { Plus, Search, MoreVertical, Edit2, Trash2, Folder, FolderOpen, AlertTriangle, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getAllSections, createSection, updateSection, deleteSection } from "@/services/sections.service";

// ─── Add/Edit Section Modal ──────────────────────────────────────────────────

function SectionModal({ open, onOpenChange, onSubmit, editingSection }) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingSection) {
      setName(editingSection.name);
    } else {
      setName("");
    }
  }, [editingSection, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Section name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({ name: name.trim() });
      setName("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save section:", error);
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
              <DialogTitle className="text-base font-bold text-slate-900">
                {editingSection ? "Edit Section" : "Add New Section"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                {editingSection ? "Update the section information." : "Create a new academic section."}
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
              Section Name
            </Label>
            <Input
              id="name"
              placeholder="e.g. Primary, Secondary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
              autoFocus
            />
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
              disabled={isSubmitting || !name.trim()}
              className="w-full sm:w-auto bg-[#136dec] hover:bg-blue-700 text-white"
            >
              {isSubmitting ? "Saving..." : editingSection ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation Modal ───────────────────────────────────────────────

function DeleteConfirmationModal({ open, onOpenChange, sectionName, classCount, onConfirm, isDeleting }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="pb-4 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-base font-bold text-slate-900">Delete Section?</DialogTitle>
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
              <p className="mb-1">
                Delete <span className="font-semibold">{sectionName}</span>?
              </p>
              {classCount > 0 && (
                <p className="text-xs text-amber-700">
                  ⚠️ This will also delete {classCount} class{classCount > 1 ? "es" : ""} in this section.
                </p>
              )}
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

// ─── Sections Page ───────────────────────────────────────────────────────────

export default function Sections() {
  // ─── Data State ────────────────────────────────────────────────────────────
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Filter State ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");

  // ─── Modal State ───────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);

  // ─── Delete Modal State ────────────────────────────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Load Sections on Mount ────────────────────────────────────────────────
  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      setLoading(true);
      const response = await getAllSections();
      // Map the response to match frontend needs
      const sectionsData = (response.sections || []).map((section) => ({
        _id: section._id,
        name: section.name,
        classCount: section.classes?.length || 0,
        createdAt: section.createdAt,
      }));
      setSections(sectionsData);
    } catch (error) {
      console.error("Failed to load sections:", error);
      toast.error(error.response?.data?.message || "Failed to load sections");
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── CRUD Operations ───────────────────────────────────────────────────────

  const handleAddSection = async (sectionData) => {
    try {
      await createSection(sectionData);
      await loadSections();
      toast.success("Section created successfully");
    } catch (error) {
      console.error("Failed to create section:", error);
      toast.error(error.response?.data?.message || "Failed to create section");
      throw error;
    }
  };

  const handleEditSection = async (sectionData) => {
    try {
      await updateSection(editingSection._id, sectionData);
      await loadSections();
      toast.success("Section updated successfully");
      setEditingSection(null);
    } catch (error) {
      console.error("Failed to update section:", error);
      toast.error(error.response?.data?.message || "Failed to update section");
      throw error;
    }
  };

  const confirmDelete = (section) => {
    setSectionToDelete(section);
    setDeleteModalOpen(true);
  };

  const handleDeleteSection = async () => {
    if (!sectionToDelete) return;

    try {
      setIsDeleting(true);
      await deleteSection(sectionToDelete._id);
      await loadSections();
      toast.success("Section deleted successfully");
      setDeleteModalOpen(false);
      setSectionToDelete(null);
    } catch (error) {
      console.error("Failed to delete section:", error);
      toast.error(error.response?.data?.message || "Failed to delete section");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (section) => {
    setEditingSection(section);
    setModalOpen(true);
  };

  // ─── Filter Sections ───────────────────────────────────────────────────────

  const filteredSections = sections.filter((section) => section.name.toLowerCase().includes(search.toLowerCase()));

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

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return <SectionsSkeleton />;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* ── Page Header ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Sections</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage and organize your academic departments.</p>
          </div>
          <Button
            onClick={() => {
              setEditingSection(null);
              setModalOpen(true);
            }}
            className="h-10 px-4 sm:px-5 flex items-center gap-2 bg-[#136dec] hover:bg-blue-700 text-white text-sm font-bold shadow-sm shadow-[#136dec]/25"
          >
            <Plus size={16} />
            <span>Add Section</span>
          </Button>
        </div>

        {/* ── Search Bar ────────────────────────────────────────────────────── */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search sections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 pr-4 text-sm"
          />
        </div>

        {/* ── Table Card ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredSections.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <FolderOpen className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">{search ? "No sections found" : "No sections yet"}</h3>
              <p className="text-sm text-slate-500 max-w-sm mb-6">
                {search
                  ? "Try adjusting your search terms."
                  : "Get started by creating your first academic section. This will help you organize your classes and students effectively."}
              </p>
              {!search && (
                <Button
                  onClick={() => {
                    setEditingSection(null);
                    setModalOpen(true);
                  }}
                  className="bg-[#136dec] hover:bg-blue-700 text-white"
                >
                  <Plus size={16} className="mr-2" />
                  Add First Section
                </Button>
              )}
            </div>
          ) : (
            /* Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Section Name
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                      Number of Classes
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Date Created
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSections.map((section) => (
                    <tr key={section._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 sm:py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#136dec]/10 flex items-center justify-center text-[#136dec] shrink-0">
                            <Folder size={18} />
                          </div>
                          <span className="font-semibold text-sm sm:text-base">{section.name}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5 text-slate-600 hidden sm:table-cell">
                        <span className="text-sm">
                          {section.classCount} class{section.classCount !== 1 ? "es" : ""}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5 text-slate-600 hidden md:table-cell">
                        <span className="text-sm">{formatDate(section.createdAt)}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 text-slate-400 hover:text-[#136dec] hover:bg-slate-50 rounded transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(section)}>
                              <Edit2 size={14} className="mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-rose-600" onClick={() => confirmDelete(section)}>
                              <Trash2 size={14} className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Add/Edit Section Modal ─────────────────────────────────────────── */}
      <SectionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={editingSection ? handleEditSection : handleAddSection}
        editingSection={editingSection}
      />

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        sectionName={sectionToDelete?.name}
        classCount={sectionToDelete?.classCount || 0}
        onConfirm={handleDeleteSection}
        isDeleting={isDeleting}
      />
    </>
  );
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function SectionsSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div className="flex justify-between">
        <div>
          <div className="h-8 w-48 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-72 bg-slate-200 rounded" />
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded" />
      </div>

      <div className="h-10 bg-slate-200 rounded-lg" />

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-8 w-8 bg-slate-200 rounded" />
              <div className="flex-1 h-4 bg-slate-200 rounded" />
              <div className="h-4 w-24 bg-slate-200 rounded hidden sm:block" />
              <div className="h-4 w-32 bg-slate-200 rounded hidden md:block" />
              <div className="h-8 w-8 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
