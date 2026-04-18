// src/pages/auth/ResetPassword.jsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { resetPassword } from "@/services/auth.service";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  // Validate token presence
  useEffect(() => {
    if (!token) {
      setIsValidToken(false);
      toast.error("Invalid reset link");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error("Password must contain at least one uppercase letter");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error("Password must contain at least one number");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, newPassword);
      toast.success("Password reset successfully");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F1F5F9] px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Invalid link</h2>
          <p className="text-sm text-slate-500 mb-6">This password reset link is invalid or has expired.</p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#136dec] hover:text-[#0f55c0] transition-colors"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#F1F5F9] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        {/* Back link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#136dec] mb-6 transition-colors"
        >
          ← Back to login
        </Link>

        <div className="mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#136dec]/10 flex items-center justify-center mb-4">
            <Lock className="text-[#136dec]" size={20} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Reset your password</h1>
          <p className="text-sm text-slate-500">
            Create a new password for <span className="font-medium text-slate-700">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="block text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                className="w-full h-11 px-4 pr-11 rounded-[10px] border border-slate-200 text-sm placeholder:text-slate-400 outline-none transition-all focus:ring-[3px] focus:ring-[#136dec]/20 focus:border-[#136dec]"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">Must be 8+ characters, include uppercase & number</p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                required
                className="w-full h-11 px-4 pr-11 rounded-[10px] border border-slate-200 text-sm placeholder:text-slate-400 outline-none transition-all focus:ring-[3px] focus:ring-[#136dec]/20 focus:border-[#136dec]"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-[10px] bg-[#136dec] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Resetting...</span>
              </>
            ) : (
              "Reset password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
