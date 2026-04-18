// src/pages/auth/ForgotPassword.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { forgotPassword } from "@/services/auth.service";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setIsSent(true);
      toast.success("Reset link sent if account exists");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reset link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#F1F5F9] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        {/* Back link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#136dec] mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to login
        </Link>

        {!isSent ? (
          <>
            <div className="mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#136dec]/10 flex items-center justify-center mb-4">
                <Mail className="text-[#136dec]" size={20} />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">Forgot password?</h1>
              <p className="text-sm text-slate-500">Enter your email and we'll send you a link to reset your password.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@primarycolours.edu.ng"
                  required
                  autoComplete="email"
                  className="w-full h-11 px-4 rounded-[10px] border border-slate-200 text-sm placeholder:text-slate-400 outline-none transition-all focus:ring-[3px] focus:ring-[#136dec]/20 focus:border-[#136dec]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-[10px] bg-[#136dec] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:bg-slate-600 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>
          </>
        ) : (
          /* Success state */
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Mail className="text-green-600" size={24} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Check your email</h2>
            <p className="text-sm text-slate-500 mb-6">
              If an account exists with <span className="font-medium text-slate-700">{email}</span>, you'll receive a password reset link
              shortly.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#136dec] hover:text-[#0f55c0] transition-colors"
            >
              <ArrowLeft size={14} />
              Return to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
