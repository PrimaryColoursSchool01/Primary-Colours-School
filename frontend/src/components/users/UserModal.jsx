import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createUser, updateUser } from "@/services/user.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Helper: Extract role ID whether it's an object or string
const extractRoleId = (role) => {
  if (typeof role === "string") return role;
  if (role && typeof role === "object" && role._id) return role._id;
  return null;
};

export default function UserModal({ open, onOpenChange, mode, user, roles, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const isEdit = mode === "edit";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    unregister, // imported
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: "",
      email: "",
      userType: "staff",
      status: "active",
    },
  });

  useEffect(() => {
    if (open) {
      if (isEdit && user) {
        // THE FIX: explicitly drop the password field and its validation rules
        // shadcn Dialog keeps children always mounted, so shouldUnregister never fires
        unregister("password");

        setValue("fullName", user.fullName || "");
        setValue("email", user.email || "");
        setValue("userType", user.userType || "staff");
        setValue("status", user.status || "active");

        const roleIds = user.roles?.map(extractRoleId).filter((id) => id) || [];
        setSelectedRoles(roleIds);
      } else {
        reset();
        setValue("userType", "staff");
        setValue("status", "active");
        setSelectedRoles([]);
      }
    }
  }, [open, user, isEdit, setValue, reset, unregister]);

  const onSubmit = async (data) => {
    if (selectedRoles.length === 0) {
      toast.error("Please select at least one role");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...data,
        roleIds: selectedRoles.filter((id) => typeof id === "string"),
      };

      if (isEdit) {
        if (!user?._id) throw new Error("User ID is missing");
        await updateUser(user._id, payload);
        toast.success("User updated successfully");
      } else {
        await createUser(payload);
        toast.success("User created successfully");
      }

      onSuccess?.();
      onOpenChange?.(false);
    } catch (error) {
      console.error("Update failed:", error);
      toast.error(error.response?.data?.message || error.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const onError = (validationErrors) => {
    const firstMessage = Object.values(validationErrors)?.[0]?.message;
    toast.error(firstMessage || "Please fix the form errors before submitting");
  };

  const toggleRole = (roleId) => {
    const id = extractRoleId(roleId);
    if (!id) return;
    setSelectedRoles((prev) => (prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white text-lg sm:text-xl">{isEdit ? "Edit User" : "Add New User"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-slate-700 dark:text-slate-300 text-sm">
              Full Name
            </Label>
            <Input
              id="fullName"
              placeholder="e.g. John Doe"
              {...register("fullName", { required: "Full name is required" })}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm"
            />
            {errors.fullName && <p className="text-xs text-red-600 dark:text-red-400">{errors.fullName.message}</p>}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 text-sm">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g. john@school.com"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm"
            />
            {errors.email && <p className="text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>}
          </div>

          {/* Password — only shown when creating */}
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 text-sm">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 characters"
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                })}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm"
              />
              {errors.password && <p className="text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>}
            </div>
          )}

          {/* User Type */}
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300 text-sm">User Type</Label>
            <Select value={watch("userType")} onValueChange={(value) => setValue("userType", value)} disabled={isEdit}>
              <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm">
                <SelectValue placeholder="Select user type" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300 text-sm">Roles</Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-md p-2 bg-white dark:bg-slate-950">
              {roles?.map((role) => {
                const roleId = extractRoleId(role);
                if (!roleId) return null;
                return (
                  <Badge
                    key={roleId}
                    variant="outline"
                    className={`cursor-pointer text-xs ${
                      selectedRoles.includes(roleId)
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800"
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    }`}
                    onClick={() => toggleRole(role)}
                  >
                    {role.name || role}
                  </Badge>
                );
              })}
            </div>
            {selectedRoles.length === 0 && <p className="text-xs text-red-600 dark:text-red-400">Select at least one role</p>}
          </div>

          {/* Status — only shown when editing */}
          {isEdit && (
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 text-sm">Status</Label>
              <Select value={watch("status")} onValueChange={(value) => setValue("status", value)}>
                <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-200 dark:border-slate-800 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
