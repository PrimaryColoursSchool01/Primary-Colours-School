import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getSections } from "@/services/itemfees.service";
// ─── Form Validation Schema ──────────────────────────────────────────────────

const itemFormSchema = z.object({
  name: z.string().min(2, "Item name must be at least 2 characters"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  compulsory: z.boolean().default(false),
  scope: z.enum(["global", "section", "class"]),
  sectionId: z.string().optional(),
  classIds: z.array(z.string()).default([]),
});

// ─── Scope Selection Tabs ────────────────────────────────────────────────────

const scopeTabs = [
  { key: "global", label: "School-Wide", description: "All students" },
  { key: "section", label: "By Section", description: "Specific section" },
  { key: "class", label: "By Class", description: "Specific classes" },
];

// ─── Add/Edit Item Modal ─────────────────────────────────────────────────────

export default function AddItemModal({ open, onOpenChange, onSubmit, editingItem }) {
  const [selectedScope, setSelectedScope] = useState(editingItem?.scope || "global");
  const [selectedSection, setSelectedSection] = useState(editingItem?.sectionId || "");
  const [selectedClassIds, setSelectedClassIds] = useState(editingItem?.classIds || []);

  // Data state
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      compulsory: false,
      scope: "global",
      sectionId: "",
      classIds: [],
    },
  });

  // ✅ Load data AND reset form when modal opens OR editingItem changes
  useEffect(() => {
    if (open) {
      loadData();

      // ✅ Wait for data to load, then reset form with editingItem values
      if (editingItem) {
        // ✅ Wait a tick for sections/classes to load
        setTimeout(() => {
          reset({
            name: editingItem.name || "",
            price: editingItem.price || 0,
            compulsory: editingItem.compulsory || false,
            scope: editingItem.scope || "global",
            sectionId: editingItem.sectionId || "",
            classIds: editingItem.classIds || [],
          });

          // ✅ Also update local state for UI controls
          setSelectedScope(editingItem.scope || "global");
          setSelectedSection(editingItem.sectionId || "");
          setSelectedClassIds(editingItem.classIds || []);

          console.log("✅ Form reset with editingItem:", editingItem);
        }, 100);
      } else {
        // ✅ Clear form for new item
        reset({
          name: "",
          price: 0,
          compulsory: false,
          scope: "global",
          sectionId: "",
          classIds: [],
        });

        setSelectedScope("global");
        setSelectedSection("");
        setSelectedClassIds([]);

        console.log("✅ Form reset for new item");
      }
    }
  }, [open, editingItem]);

  const loadData = async () => {
    try {
      setLoadingData(true);

      const sectionsRes = await getSections();

      console.log("📦 Sections Response:", sectionsRes);

      const sectionsData = sectionsRes?.sections || sectionsRes?.data?.sections || [];

      console.log("✅ Parsed Sections:", sectionsData);
      console.log("✅ Sections Count:", sectionsData.length);

      setSections(sectionsData);

      const allClasses = sectionsData.flatMap((section) => {
        const classes = section.classes || [];
        return classes.map((cls) => ({
          ...cls,
          sectionId: cls.sectionId || section._id,
        }));
      });

      console.log("✅ Classes Count:", allClasses.length);
      setClasses(allClasses);
    } catch (error) {
      console.error("Failed to load ", error);
      setSections([]);
      setClasses([]);
    } finally {
      setLoadingData(false);
    }
  };

  // Filter classes by selected section
  const filteredClasses = classes.filter((cls) => !selectedSection || cls.sectionId === selectedSection);

  // Handle scope change
  const handleScopeChange = (scope) => {
    setSelectedScope(scope);
    setValue("scope", scope);

    if (scope === "global") {
      setValue("sectionId", "");
      setValue("classIds", []);
      setSelectedSection("");
      setSelectedClassIds([]);
    } else if (scope === "section") {
      setValue("classIds", []);
      setSelectedClassIds([]);
    }
  };

  // Handle class selection
  const handleClassToggle = (classId) => {
    const newClassIds = selectedClassIds.includes(classId)
      ? selectedClassIds.filter((id) => id !== classId)
      : [...selectedClassIds, classId];

    setSelectedClassIds(newClassIds);
    setValue("classIds", newClassIds);
  };

  // Handle form submission
  const onFormSubmit = async (data) => {
    try {
      await onSubmit({
        ...data,
        sectionName: sections.find((s) => s._id === data.sectionId)?.name || "",
        classNames: classes.filter((c) => data.classIds?.includes(c._id)).map((c) => c.name),
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit item:", error);
      throw error;
    }
  };

  // Handle modal close
  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      reset();
      setSelectedScope("global");
      setSelectedSection("");
      setSelectedClassIds([]);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col p-0 gap-0">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <DialogHeader className="p-4 sm:p-6 border-b border-slate-200 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
                {editingItem ? "Edit Item" : "Add New Item"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                {editingItem ? "Update the fee item configuration." : "Configure a new fee item for the school inventory."}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenChange(false)}
              className="h-8 w-8 text-slate-400 hover:text-slate-600 shrink-0"
            >
              <X size={16} />
            </Button>
          </div>
        </DialogHeader>

        {/* ── Form Content (Scrollable) ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
          <form id="item-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
            {/* Item Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-700">
                Item Name
              </Label>
              <Input
                id="name"
                placeholder="e.g. Sports Development Fee"
                className={`h-9 sm:h-11 ${errors.name ? "border-rose-500 focus:ring-rose-500/20" : ""}`}
                {...register("name")}
              />
              {errors.name && <p className="text-[10px] text-rose-600 font-medium">{errors.name.message}</p>}
            </div>

            {/* Price and Compulsory Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-sm font-semibold text-slate-700">
                  Price (₦)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">₦</span>
                  <Input
                    id="price"
                    type="number"
                    placeholder="0.00"
                    className={`h-9 sm:h-11 pl-8 ${errors.price ? "border-rose-500 focus:ring-rose-500/20" : ""}`}
                    {...register("price")}
                  />
                </div>
                {errors.price && <p className="text-[10px] text-rose-600 font-medium">{errors.price.message}</p>}
              </div>

              <div className="flex flex-col justify-end">
                <div className="flex items-center justify-between h-9 sm:h-11 px-4 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-sm font-semibold text-slate-700">Compulsory</span>
                  <Checkbox
                    id="compulsory"
                    checked={watch("compulsory")}
                    onCheckedChange={(checked) => setValue("compulsory", checked)}
                    className="data-[state=checked]:bg-[#136dec] data-[state=checked]:border-[#136dec] h-5 w-5"
                  />
                </div>
                {errors.compulsory && <p className="text-[10px] text-rose-600 font-medium mt-1">{errors.compulsory.message}</p>}
              </div>
            </div>

            <Separator />

            {/* Scope Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Scope</Label>
              <div className="flex flex-wrap gap-2">
                {scopeTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleScopeChange(tab.key)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      selectedScope === tab.key
                        ? "bg-[#136dec] text-white border-[#136dec] shadow-sm shadow-[#136dec]/25"
                        : "bg-white text-slate-600 border-slate-200 hover:border-[#136dec] hover:text-[#136dec]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scope Description */}
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <p className="text-[10px] text-blue-700 font-medium">{scopeTabs.find((t) => t.key === selectedScope)?.description}</p>
              </div>

              {/* Section Dropdown */}
              {(selectedScope === "section" || selectedScope === "class") && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="section" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Select Section
                  </Label>
                  <Select
                    value={selectedSection}
                    onValueChange={(value) => {
                      setSelectedSection(value);
                      setValue("sectionId", value);
                      if (selectedScope === "class") {
                        setSelectedClassIds([]);
                        setValue("classIds", []);
                      }
                    }}
                    disabled={loadingData}
                  >
                    <SelectTrigger className="h-9 sm:h-11">
                      <SelectValue
                        placeholder={loadingData ? "Loading..." : sections.length === 0 ? "No sections available" : "Choose a section"}
                      />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[200px]">
                      {sections.map((section) => (
                        <SelectItem key={section._id} value={section._id}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {sections.length === 0 && !loadingData && (
                    <p className="text-[10px] text-amber-600 font-medium">No sections available. Please create sections first.</p>
                  )}
                </div>
              )}

              {/* Class Checkboxes */}
              {selectedScope === "class" && selectedSection && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Classes</Label>
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedClassIds.length} selected
                    </Badge>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
                    {loadingData ? (
                      <div className="text-center py-4 text-xs text-slate-500">Loading classes...</div>
                    ) : filteredClasses.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-500">No classes in this section</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {filteredClasses.map((cls) => (
                          <label
                            key={cls._id}
                            className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white transition-colors"
                          >
                            <Checkbox
                              checked={selectedClassIds.includes(cls._id)}
                              onCheckedChange={() => handleClassToggle(cls._id)}
                              className="data-[state=checked]:bg-[#136dec] data-[state=checked]:border-[#136dec] h-4 w-4"
                            />
                            <span className="text-xs text-slate-700 truncate">{cls.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.classIds && <p className="text-[10px] text-rose-600 font-medium">{errors.classIds.message}</p>}
                </div>
              )}

              {/* Hint for School-Wide */}
              {selectedScope === "global" && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-500">
                    This item will be available to <span className="font-semibold">all students</span> across all sections and classes.
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* ── Footer Actions ────────────────────────────────────────────────── */}
        <DialogFooter className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 gap-2 sm:gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="text-slate-600 hover:bg-slate-200 w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="item-form"
            disabled={isSubmitting || loadingData}
            className="bg-[#136dec] hover:bg-blue-700 text-white shadow-sm shadow-[#136dec]/25 w-full sm:w-auto"
          >
            {isSubmitting ? "Saving..." : loadingData ? "Loading..." : editingItem ? "Update Item" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
