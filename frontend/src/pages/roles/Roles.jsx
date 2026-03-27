import { useState, useEffect } from "react";
import { Plus, Search, MoreVertical, Edit2, Trash2, Shield, AlertTriangle, X, Globe, Folder, GraduationCap } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  getRoleDependencies,
  getAllItems,
  getAllSections,
  getAllClasses,
} from "@/services/role.service";

// ─── Scope Badge Colors ──────────────────────────────────────────────────────

const SCOPE_CONFIG = {
  global: {
    label: "School-Wide",
    icon: Globe,
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  section: {
    label: "By Section",
    icon: Folder,
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  class: {
    label: "By Class",
    icon: GraduationCap,
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-200",
  },
};

// ─── Add/Edit Role Modal ─────────────────────────────────────────────────────

// ─── Add/Edit Role Modal ─────────────────────────────────────────────────────

function RoleModal({ open, onOpenChange, onSubmit, editingRole, sections, classes, items }) {
  const [name, setName] = useState("");
  const [selectionType, setSelectionType] = useState("all-sections");
  const [sectionId, setSectionId] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingRole) {
      setName(editingRole.name);
      setSelectionType(
        editingRole.scope === "global"
          ? "all-sections"
          : editingRole.scope === "section"
            ? "section-all-classes"
            : "section-specific-classes",
      );
      setSectionId(editingRole.sectionId?._id || editingRole.sectionId || "");
      setSelectedClassIds(editingRole.classIds?.map((c) => c._id || c) || []);
      setSelectedItemIds(editingRole.itemIds?.map((i) => i._id || i) || []);
    } else {
      setName("");
      setSelectionType("all-sections");
      setSectionId("");
      setSelectedClassIds([]);
      setSelectedItemIds([]);
    }
  }, [editingRole, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Role name is required");
      return;
    }
    if (selectionType !== "all-sections" && !sectionId) {
      toast.error("Please select a section");
      return;
    }
    if (selectionType === "section-specific-classes" && selectedClassIds.length === 0) {
      toast.error("Please select at least one class");
      return;
    }
    if (selectedItemIds.length === 0) {
      toast.error("Please select at least one fee item");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        name: name.trim(),
        selectionType,
        sectionId: selectionType === "all-sections" ? null : sectionId,
        classIds: selectionType === "section-specific-classes" ? selectedClassIds : [],
        itemIds: selectedItemIds,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save role:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClasses = classes.filter((cls) => !sectionId || cls.sectionId === sectionId || cls.sectionId?._id === sectionId);

  //  FILTER ITEMS BASED ON SCOPE
  const filteredItems = items.filter((item) => {
    // School-Wide: Only show global items
    if (selectionType === "all-sections") {
      return item.scope === "global";
    }

    // By Section: Only show section items matching this section
    if (selectionType === "section-all-classes") {
      return item.scope === "section" && (item.sectionId === sectionId || item.sectionId?._id === sectionId);
    }

    // By Class: Only show class items matching selected classes
    if (selectionType === "section-specific-classes") {
      return item.scope === "class" && item.classIds?.some((id) => selectedClassIds.includes(id));
    }

    return true;
  });

  const handleClassToggle = (classId) => {
    setSelectedClassIds(
      selectedClassIds.includes(classId) ? selectedClassIds.filter((id) => id !== classId) : [...selectedClassIds, classId],
    );
  };

  const handleItemToggle = (itemId) => {
    setSelectedItemIds(selectedItemIds.includes(itemId) ? selectedItemIds.filter((id) => id !== itemId) : [...selectedItemIds, itemId]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header - Fixed at top */}
        <DialogHeader className="p-4 sm:p-6 border-b border-slate-200 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-base font-bold text-slate-900">{editingRole ? "Edit Role" : "Add New Role"}</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                {editingRole ? "Update the role configuration." : "Create a new staff role with specific permissions."}
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

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-700">
                Role Name
              </Label>
              <Input
                id="name"
                placeholder="e.g. Primary Bursar, Exam Officer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
                autoFocus
              />
            </div>

            {/* Scope Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Scope</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectionType("all-sections")}
                  className={`p-3 rounded-lg border text-xs font-semibold transition-all ${
                    selectionType === "all-sections"
                      ? "bg-[#136dec] text-white border-[#136dec]"
                      : "bg-white text-slate-600 border-slate-200 hover:border-[#136dec]"
                  }`}
                >
                  <Globe size={16} className="mx-auto mb-1" />
                  School-Wide
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionType("section-all-classes")}
                  className={`p-3 rounded-lg border text-xs font-semibold transition-all ${
                    selectionType === "section-all-classes"
                      ? "bg-[#136dec] text-white border-[#136dec]"
                      : "bg-white text-slate-600 border-slate-200 hover:border-[#136dec]"
                  }`}
                >
                  <Folder size={16} className="mx-auto mb-1" />
                  By Section
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionType("section-specific-classes")}
                  className={`p-3 rounded-lg border text-xs font-semibold transition-all ${
                    selectionType === "section-specific-classes"
                      ? "bg-[#136dec] text-white border-[#136dec]"
                      : "bg-white text-slate-600 border-slate-200 hover:border-[#136dec]"
                  }`}
                >
                  <GraduationCap size={16} className="mx-auto mb-1" />
                  By Class
                </button>
              </div>
            </div>

            {/* Section Selector */}
            {(selectionType === "section-all-classes" || selectionType === "section-specific-classes") && (
              <div className="space-y-2">
                <Label htmlFor="section" className="text-sm font-semibold text-slate-700">
                  Section
                </Label>
                <Select
                  value={sectionId}
                  onValueChange={(value) => {
                    setSectionId(value);
                    if (selectionType === "section-specific-classes") {
                      setSelectedClassIds([]);
                    }
                  }}
                >
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
            )}

            {/* Class Selector */}
            {selectionType === "section-specific-classes" && sectionId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700">Classes</Label>
                  <Badge variant="secondary" className="text-[10px]">
                    {selectedClassIds.length} selected
                  </Badge>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {filteredClasses.map((cls) => (
                      <label key={cls._id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white">
                        <Checkbox
                          checked={selectedClassIds.includes(cls._id)}
                          onCheckedChange={() => handleClassToggle(cls._id)}
                          className="h-4 w-4"
                        />
                        <span className="text-xs text-slate-700">{cls.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Fee Items Selector - FILTERED BY SCOPE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700">Fee Items (Required)</Label>
                <Badge variant="secondary" className="text-[10px]">
                  {selectedItemIds.length} selected
                </Badge>
              </div>

              {/* Show info about filtered items */}
              {selectionType === "all-sections" && (
                <p className="text-[10px] text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  Only school-wide fee items are available for this scope.
                </p>
              )}
              {selectionType === "section-all-classes" && sectionId && (
                <p className="text-[10px] text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  Only fee items for this section are available.
                </p>
              )}
              {selectionType === "section-specific-classes" && sectionId && (
                <p className="text-[10px] text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  Only fee items for selected classes are available.
                </p>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    <p>No items available for this scope.</p>
                    <p className="mt-1">Create fee items first, then assign them to roles.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredItems.map((item) => (
                      <label key={item._id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white">
                        <Checkbox
                          checked={selectedItemIds.includes(item._id)}
                          onCheckedChange={() => handleItemToggle(item._id)}
                          className="h-4 w-4"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-slate-700 truncate block">{item.name}</span>
                          <span className="text-[10px] text-slate-500">₦{item.price?.toLocaleString()}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer - Fixed at bottom, always visible */}
        <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 shrink-0">
          <div className="flex gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim() || selectedItemIds.length === 0}
              className="flex-1 sm:flex-none bg-[#136dec] hover:bg-blue-700 text-white"
            >
              {isSubmitting ? "Saving..." : editingRole ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation Modal ───────────────────────────────────────────────

function DeleteConfirmationModal({ open, onOpenChange, roleName, userCount, itemIds, onConfirm, isDeleting }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="pb-4 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-base font-bold text-slate-900">Delete Role?</DialogTitle>
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
                Delete <span className="font-semibold">{roleName}</span>?
              </p>
              {userCount > 0 && (
                <p className="text-xs text-amber-700">
                  ⚠️ {userCount} staff member{userCount > 1 ? "s" : ""} will lose this role assignment.
                </p>
              )}
              <p className="text-xs text-amber-700 mt-1">
                📦 {itemIds?.length || 0} fee item{itemIds?.length !== 1 ? "s" : ""} will no longer have role restrictions.
              </p>
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

// ─── Roles Page ──────────────────────────────────────────────────────────────

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [roleDependencies, setRoleDependencies] = useState({ users: 0, items: 0 });
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, sectionsRes, classesRes, itemsRes] = await Promise.all([
        getAllRoles(),
        getAllSections(),
        getAllClasses(),
        getAllItems(),
      ]);

      setRoles(rolesRes.roles || []);
      setSections(sectionsRes.sections || sectionsRes || []);
      setClasses(classesRes.classes || classesRes || []);
      setItems(itemsRes.data?.data || itemsRes.data || itemsRes || []);
    } catch (error) {
      console.error("Failed to load ", error);
      toast.error(error.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async (roleData) => {
    try {
      await createRole(roleData);
      await loadData();
      toast.success("Role created successfully");
    } catch (error) {
      console.error("Failed to create role:", error);
      toast.error(error.response?.data?.message || "Failed to create role");
      throw error;
    }
  };

  const handleEditRole = async (roleData) => {
    try {
      await updateRole(editingRole._id, roleData);
      await loadData();
      toast.success("Role updated successfully");
      setEditingRole(null);
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error(error.response?.data?.message || "Failed to update role");
      throw error;
    }
  };

  const confirmDelete = async (role) => {
    try {
      const depsRes = await getRoleDependencies(role._id);
      setRoleDependencies(depsRes.data || { users: 0, items: 0 });
      setRoleToDelete(role);
      setDeleteModalOpen(true);
    } catch (error) {
      console.error("Failed to fetch dependencies:", error);
      setRoleToDelete(role);
      setRoleDependencies({ users: 0, items: role.itemIds?.length || 0 });
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      setIsDeleting(true);
      await deleteRole(roleToDelete._id);
      await loadData();
      toast.success("Role deleted successfully");
      setDeleteModalOpen(false);
      setRoleToDelete(null);
    } catch (error) {
      console.error("Failed to delete role:", error);
      toast.error(error.response?.data?.message || "Failed to delete role");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setModalOpen(true);
  };

  const filteredRoles = roles.filter((role) => {
    const matchesSearch = role.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "all" || role.scope === activeTab;
    return matchesSearch && matchesTab;
  });

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const paginatedRoles = filteredRoles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getScopeBadge = (scope, sectionName) => {
    const config = SCOPE_CONFIG[scope] || SCOPE_CONFIG.global;
    const Icon = config.icon;
    return (
      <Badge className={`${config.bg} ${config.text} ${config.border} border text-[10px] sm:text-xs font-bold`}>
        <Icon size={12} className="mr-1" />
        {scope === "class" && sectionName ? `${config.label} (${sectionName})` : config.label}
      </Badge>
    );
  };

  if (loading) {
    return <RolesSkeleton />;
  }

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Roles</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage staff roles and permissions.</p>
          </div>
          <Button
            onClick={() => {
              setEditingRole(null);
              setModalOpen(true);
            }}
            className="h-10 px-4 sm:px-5 flex items-center gap-2 bg-[#136dec] hover:bg-blue-700 text-white text-sm font-bold shadow-sm shadow-[#136dec]/25"
          >
            <Plus size={16} />
            <span>Add Role</span>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search roles..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 pl-9 pr-4 text-sm"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {["all", "global", "section", "class"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setCurrentPage(1);
                }}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg border transition-all whitespace-nowrap capitalize ${
                  activeTab === tab
                    ? "bg-[#136dec] text-white border-[#136dec]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-[#136dec]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {paginatedRoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                {search || activeTab !== "all" ? "No roles found" : "No roles yet"}
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mb-6">
                {search || activeTab !== "all"
                  ? "Try adjusting your search or filter."
                  : "Get started by creating your first role. This will help you manage staff permissions effectively."}
              </p>
              {!search && activeTab === "all" && (
                <Button
                  onClick={() => {
                    setEditingRole(null);
                    setModalOpen(true);
                  }}
                  className="bg-[#136dec] hover:bg-blue-700 text-white"
                >
                  <Plus size={16} className="mr-2" />
                  Add First Role
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Role Name
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Scope</th>
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Fee Items
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRoles.map((role) => (
                    <tr key={role._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 sm:py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#136dec]/10 flex items-center justify-center text-[#136dec] shrink-0">
                            <Shield size={18} />
                          </div>
                          <span className="font-semibold text-xs sm:text-sm md:text-base">{role.name}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5">{getScopeBadge(role.scope, role.sectionId?.name)}</td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5 text-slate-600 hidden md:table-cell">
                        <span className="text-xs sm:text-sm">{role.itemIds?.length || 0} items</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 text-slate-400 hover:text-[#136dec] hover:bg-slate-50 rounded transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(role)}>
                              <Edit2 size={14} className="mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-rose-600" onClick={() => confirmDelete(role)}>
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

          {paginatedRoles.length > 0 && (
            <div className="px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-slate-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredRoles.length)} of{" "}
                {filteredRoles.length} roles
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

      <RoleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={editingRole ? handleEditRole : handleAddRole}
        editingRole={editingRole}
        sections={sections}
        classes={classes}
        items={items}
      />

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        roleName={roleToDelete?.name}
        userCount={roleDependencies.users}
        itemIds={roleToDelete?.itemIds}
        onConfirm={handleDeleteRole}
        isDeleting={isDeleting}
      />
    </>
  );
}

function RolesSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div className="flex justify-between">
        <div>
          <div className="h-8 w-48 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-72 bg-slate-200 rounded" />
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 flex-1 max-w-md bg-slate-200 rounded-lg" />
        <div className="hidden sm:flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 w-24 bg-slate-200 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-200 rounded-lg" />
              <div className="flex-1 h-4 bg-slate-200 rounded" />
              <div className="h-6 w-24 bg-slate-200 rounded hidden md:block" />
              <div className="h-8 w-8 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
