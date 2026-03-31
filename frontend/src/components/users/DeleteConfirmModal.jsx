import { useState } from "react";
import { toast } from "sonner";
import { deleteUser } from "@/services/user.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DeleteConfirmModal({ open, onOpenChange, user, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  const handleDelete = async () => {
    if (confirmEmail !== user?.email) {
      toast.error("Email does not match");
      return;
    }

    setLoading(true);
    try {
      await deleteUser(user._id);
      toast.success("User deleted successfully");
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white text-base sm:text-lg">Delete User</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            This action cannot be undone. The user will be permanently removed from the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm">User</Label>
            <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">{user?.fullName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="confirmEmail" className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
              Type <strong className="break-all">{user?.email}</strong> to confirm
            </Label>
            <Input
              id="confirmEmail"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="Enter user email"
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs sm:text-sm h-9 sm:h-10"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 sm:pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-200 dark:border-slate-800 w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={loading || confirmEmail !== user?.email}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
            >
              {loading ? "Deleting..." : "Delete User"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
