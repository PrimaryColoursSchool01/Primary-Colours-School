import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  BarChart2,
  Layers,
  GraduationCap,
  Users,
  ShieldCheck,
  Tag,
  Lock,
  LogOut,
  Menu,
  X,
  Bell,
  User,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/store/store";
import { logout } from "@/services/auth.service";
import { toast } from "sonner";

// ─── Nav config ──────────────────────────────────────────────────────────────

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Responses", url: "/responses", icon: FileText },
      { title: "Reports", url: "/reports", icon: BarChart2 },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Sections", url: "/sections", icon: Layers },
      { title: "Classes", url: "/classes", icon: GraduationCap },
      { title: "Users & Staff", url: "/users", icon: Users },
      { title: "Roles", url: "/roles", icon: ShieldCheck },
      { title: "Fees & Items", url: "/items", icon: Tag },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Profile", url: "/profile", icon: User },
      { title: "Change Password", url: "/change-password", icon: Lock },
    ],
  },
];

// ─── Sidebar content ──────────────────────────────────────────────────────────

function SidebarContent({ onClose, onLogout, isLoggingOut }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/primarcoloursbadge.png" alt="Primary Colours Badge" className="w-10 h-10 object-contain shrink-0" />
            <div>
              <p className="text-slate-900 text-sm font-bold leading-none tracking-tight">Primary Colours</p>
              <p className="text-slate-500 text-[10px] mt-0.5 font-medium uppercase tracking-wider">Admin Panel</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          {onClose && (
            <button
              onClick={onClose}
              disabled={isLoggingOut}
              className="lg:hidden text-slate-400 hover:text-slate-600 transition-colors p-1 disabled:opacity-40 disabled:pointer-events-none"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5 custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 px-3 mb-1.5">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.title}>
                  <NavLink
                    to={item.url}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-[#136dec] text-white shadow-md shadow-[#136dec]/25"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      } ${isLoggingOut ? "pointer-events-none opacity-50" : ""}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={16} className={isActive ? "text-white" : "text-slate-400"} strokeWidth={2} />
                        <span>{item.title}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-200">
        <button
          onClick={onLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {isLoggingOut ? (
            <>
              <Loader2 size={16} className="animate-spin" strokeWidth={2} />
              <span>Logging out...</span>
            </>
          ) : (
            <>
              <LogOut size={16} strokeWidth={2} />
              <span>Logout</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, logout: clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AD";

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      clearAuth();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      // Even if API fails, we still want to clear local state
      console.error("Logout error:", error);
      clearAuth();
      navigate("/login");
      toast.error("Session ended, but some cleanup failed.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex h-dvh bg-[#f6f7f8] overflow-hidden">
      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-slate-200 flex-col flex-shrink-0 h-full custom-scrollbar">
        <SidebarContent onLogout={handleLogout} isLoggingOut={isLoggingOut} />
      </aside>

      {/* ── Mobile Sidebar Drawer ────────────────────────────────────── */}
      {sidebarOpen && (
        <>
          {/* Backdrop — disable click when logging out */}
          <div
            className={`fixed inset-0 z-40 lg:hidden transition-opacity ${isLoggingOut ? "pointer-events-none" : ""}`}
            onClick={() => !isLoggingOut && setSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white lg:hidden flex flex-col shadow-2xl custom-scrollbar border-r border-slate-200">
            <SidebarContent onClose={() => setSidebarOpen(false)} onLogout={handleLogout} isLoggingOut={isLoggingOut} />
          </div>
        </>
      )}

      {/* ── Main area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              disabled={isLoggingOut}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Dashboard</h2>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification bell — can be disabled during logout optionally */}
            <button
              disabled={isLoggingOut}
              className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>

            <div className="h-6 w-px bg-slate-200" />

            {/* User */}
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-slate-900 leading-none">{user?.fullName || "Admin"}</p>
                <p className="text-xs text-slate-500 mt-0.5">Administrator</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#136dec] flex items-center justify-center text-white text-xs font-black shrink-0">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
