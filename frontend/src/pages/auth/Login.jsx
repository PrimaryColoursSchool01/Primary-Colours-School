import { useState } from "react";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/store/store";
import { login } from "@/services/auth.service";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await login({ email, password });
      setAuth(data.user, data.accessToken);
      toast.success("Welcome back!");
      navigate(data.user.userType === "admin" ? "/dashboard" : "/staff");
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex bg-[#0F172A]">
      {/* ── Left Panel (lg+) ────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-[#1E3A5F] to-[#0F172A]">
        {/* Grid texture */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
            `,
            backgroundSize: "56px 56px",
          }}
        />

        {/* Glow orbs */}
        <div className="absolute -top-40 -left-24 w-[560px] h-[560px] rounded-full bg-[#136dec]/25 blur-[80px]" />
        <div className="absolute -bottom-32 -right-20 w-[420px] h-[420px] rounded-full bg-[#136dec]/10 blur-[80px]" />

        {/* Top — School Badge */}
        <div className="relative z-10 flex items-center gap-3">
          <img src="/primarcoloursbadge.png" alt="Primary Colours Schools" className="h-14 w-auto object-contain" />
          <span className="text-white/90 text-sm font-bold tracking-tight">Primary Colours Schools</span>
        </div>

        {/* Middle — Hero */}
        <div className="relative z-10 max-w-sm">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#136dec]/35 bg-[#136dec]/10 mb-7">
            <div className="w-1.5 h-1.5 rounded-full bg-[#136dec] animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#136dec]">School Portal</span>
          </div>

          <h1 className="text-[clamp(32px,3vw,44px)] font-black leading-[1.1] tracking-[-0.03em] text-white mb-4">
            School Fees,
            <br />
            <span className="text-[#136dec]">Managed Well.</span>
          </h1>

          <p className="text-sm leading-relaxed text-[#94A3B8] mb-10">
            Primary Colours Schools' official fee management portal. Collect, verify, and track payments across the Infant, Primary, and
            Secondary sections — all from one place.
          </p>

          <div className="space-y-3">
            {[
              { label: "Infant, Primary & Secondary sections supported" },
              { label: "Two schools — Primary Colours & Madarasatul At-Taqwa" },
              { label: "Real-time payment tracking and staff handover system" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#136dec] mt-1.5 shrink-0" />
                <p className="text-sm text-[#94A3B8] leading-snug">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — Quote */}
        <div className="relative z-10 border-l-2 border-[#136dec]/40 pl-4">
          <p className="text-xs leading-relaxed text-[#64748B]">
            Built exclusively for Primary Colours Schools — streamlining fees collection across all sections and classes.
          </p>
        </div>
      </div>

      {/* ── Right Panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-10 lg:px-14 bg-[#F1F5F9] lg:bg-white relative overflow-hidden">
        {/* Grid texture for mobile */}
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "56px 56px",
          }}
        />

        {/* Mobile glow orb */}
        <div className="absolute -top-40 -right-24 w-[400px] h-[400px] rounded-full bg-[#136dec]/15 blur-[80px] lg:hidden" />

        {/* Mobile brand */}
        <div className="relative z-10 flex flex-col items-center gap-3 mb-10 lg:hidden">
          <img src="/primarcoloursbadge.png" alt="Primary Colours Schools" className="h-20 w-auto object-contain" />
          <div className="text-center">
            <p className="text-[#1E293B] text-lg font-black tracking-tight leading-tight">Primary Colours Schools</p>
            <p className="text-[#64748B] text-xs font-medium mt-1 uppercase tracking-wider">Admin Portal</p>
          </div>
        </div>

        {/* Desktop brand */}
        <div className="relative z-10 hidden lg:flex flex-col items-center gap-3 mb-10">
          <img src="/primarcoloursbadge.png" alt="Primary Colours Schools" className="h-24 w-auto object-contain" />
        </div>

        {/* Form card */}
        <div className="relative z-10 w-full max-w-[380px]">
          {/* Heading */}
          <h2 className="text-2xl sm:text-[26px] font-black tracking-tight leading-tight mb-1 text-[#1E293B] lg:text-slate-900">
            Welcome back
          </h2>
          <p className="text-sm mb-8 leading-relaxed text-[#64748B] lg:text-slate-500">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-[0.07em] text-[#64748B] lg:text-slate-500">
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
                className="w-full h-11 px-4 rounded-[10px] border text-sm placeholder:text-slate-400 outline-none transition-all focus:ring-[3px] focus:ring-[#136dec]/20 focus:border-[#136dec]
                  bg-white border-slate-200 text-[#1E293B]
                  lg:bg-slate-50 lg:border-slate-200 lg:text-slate-900 lg:placeholder:text-slate-400 lg:focus:bg-white"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[11px] font-bold uppercase tracking-[0.07em] text-[#64748B] lg:text-slate-500"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full h-11 px-4 pr-11 rounded-[10px] border text-sm placeholder:text-slate-400 outline-none transition-all focus:ring-[3px] focus:ring-[#136dec]/20 focus:border-[#136dec]
                    bg-white border-slate-200 text-[#1E293B]
                    lg:bg-slate-50 lg:border-slate-200 lg:text-slate-900 lg:placeholder:text-slate-400 lg:focus:bg-white"
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
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs font-medium text-[#136dec] hover:text-[#0f55c0] transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-2 rounded-[10px] bg-[#136dec] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:bg-slate-600 disabled:cursor-not-allowed disabled:shadow-none hover:opacity-90"
              style={{
                boxShadow: isLoading ? "none" : "0 4px 20px rgba(19,109,236,0.35)",
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 lg:border-slate-100 text-center">
            <p className="text-[13px] text-[#64748B] leading-relaxed">
              Don't have an account?{" "}
              <span className="text-[#1E293B] lg:text-slate-600 font-semibold">Contact your system administrator</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
