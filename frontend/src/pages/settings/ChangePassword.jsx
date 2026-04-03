import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/services/auth.service";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ChangePassword() {
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      toast.success("Password updated successfully");
      reset();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const toggleShow = (field) => setShow((prev) => ({ ...prev, [field]: !prev[field] }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 md:p-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto bg-[#136dec]/10 rounded-xl flex items-center justify-center">
            <Key className="text-[#136dec]" size={24} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Change Password</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Update your account password securely</p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={show.current ? "text" : "password"}
                  placeholder="Enter current password"
                  className={`pr-10 ${errors.currentPassword ? "border-red-400" : ""}`}
                  {...register("currentPassword")}
                />
                <button
                  type="button"
                  onClick={() => toggleShow("current")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.currentPassword && <p className="text-xs text-red-500">{errors.currentPassword.message}</p>}
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={show.new ? "text" : "password"}
                  placeholder="Enter new password"
                  className={`pr-10 ${errors.newPassword ? "border-red-400" : ""}`}
                  {...register("newPassword")}
                />
                <button
                  type="button"
                  onClick={() => toggleShow("new")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {show.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword.message}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={show.confirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  className={`pr-10 ${errors.confirmPassword ? "border-red-400" : ""}`}
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => toggleShow("confirm")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#136dec] hover:bg-[#0f55c0] text-white text-sm font-medium mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </div>

        {/* Security Note */}
        <p className="text-xs text-center text-slate-400 dark:text-slate-500 px-4">
          For security, you may need to log in again after changing your password.
        </p>
      </div>
    </div>
  );
}
