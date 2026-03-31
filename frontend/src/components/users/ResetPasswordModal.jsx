import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { resetUserPassword } from "@/services/user.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordModal({ open, onOpenChange, user, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const newPassword = watch("newPassword");

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await resetUserPassword(user._id, data.newPassword);
      toast.success("Password reset successfully. User has been notified.");
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white text-base sm:text-lg">Reset Password</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            This will send a new temporary password to {user?.email}. Their current session will be invalidated.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm">User</Label>
            <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">{user?.fullName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="newPassword" className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
              New Password
            </Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Minimum 6 characters"
              {...register("newPassword", {
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              })}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs sm:text-sm h-9 sm:h-10"
            />
            {errors.newPassword && <p className="text-xs text-red-600 dark:text-red-400">{errors.newPassword.message}</p>}
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              {...register("confirmPassword", {
                required: "Please confirm the password",
                validate: (value) => value === newPassword || "Passwords do not match",
              })}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs sm:text-sm h-9 sm:h-10"
            />
            {errors.confirmPassword && <p className="text-xs text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>}
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
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
