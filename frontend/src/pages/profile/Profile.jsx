/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { User, Lock, LogOut, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile, updateProfile, logoutAllSessions } from "@/services/profile.service";
import { useAuthStore } from "@/store/store";

const schema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().optional(),
});

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", phone: "" },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile();
        setProfile(data);
        reset({ fullName: data.fullName, phone: data.phone || "" });
      } catch (err) {
        toast.error("Could not load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [reset]);

  const onSave = async (data) => {
    setSaving(true);
    try {
      const res = await updateProfile(data);
      setProfile(res.user);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm("This will log you out of all other devices. Continue?")) return;
    setLoggingOut(true);
    try {
      await logoutAllSessions();
      toast.success("All other sessions logged out");
    } catch (err) {
      toast.error("Could not logout other devices");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleChangePassword = () => {
    navigate(user?.userType === "staff" ? "/staff/change-password" : "/change-password");
  };

  const getInitials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#136dec]" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl xl:max-w-3xl mx-auto px-3 py-4 sm:px-5 sm:py-6 md:px-6 md:py-8 space-y-4 sm:space-y-5 md:space-y-6">
        {/* ── Page Header ───────────────────────────────────────── */}
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">Profile Settings</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage your account information and security</p>
        </div>

        {/* ── Account Information ───────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader className="px-4 py-4 sm:px-6 sm:py-5 pb-0 sm:pb-0">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <User size={16} className="text-[#136dec] shrink-0" />
              Account Information
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Update your personal details</CardDescription>
          </CardHeader>

          <CardContent className="px-4 py-4 sm:px-6 sm:py-5 space-y-4 sm:space-y-6">
            {/* Avatar & Quick Info */}
            <div className="flex items-center gap-3 sm:gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-[#136dec]/10 flex items-center justify-center shrink-0">
                <span className="text-base sm:text-lg md:text-xl font-bold text-[#136dec]">{getInitials(profile?.fullName)}</span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white truncate leading-tight">
                  {profile?.fullName}
                </p>
                <p className="text-xs sm:text-sm text-slate-500 truncate mt-0.5">{profile?.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    {profile?.status}
                  </span>
                  {profile?.roles?.map((role, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSubmit(onSave)} className="space-y-3 sm:space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs sm:text-sm">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  {...register("fullName")}
                  className={`h-9 sm:h-10 text-sm ${errors.fullName ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                />
                {errors.fullName && <p className="text-[11px] sm:text-xs text-red-500">{errors.fullName.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs sm:text-sm">
                  Phone Number <span className="text-slate-400">(Optional)</span>
                </Label>
                <Input id="phone" {...register("phone")} placeholder="+234 XXX XXX XXXX" className="h-9 sm:h-10 text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Email Address</Label>
                <Input value={profile?.email} disabled className="h-9 sm:h-10 text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-500" />
                <p className="text-[11px] sm:text-xs text-slate-400">Email cannot be changed. Contact support if required.</p>
              </div>

              <div className="pt-1">
                <Button type="submit" disabled={saving} size="sm" className="w-full sm:w-auto h-9 sm:h-10 text-sm px-5">
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin mr-2" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} className="mr-2" /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ── Security ──────────────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader className="px-4 py-4 sm:px-6 sm:py-5 pb-0 sm:pb-0">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Lock size={16} className="text-[#136dec] shrink-0" />
              Security
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Manage your password and active sessions</CardDescription>
          </CardHeader>

          <CardContent className="px-4 py-4 sm:px-6 sm:py-5 space-y-3">
            {/* Change Password row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="min-w-0">
                <p className="font-medium text-sm text-slate-900 dark:text-white">Change Password</p>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">Update your login credentials</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleChangePassword}
                className="w-full sm:w-auto h-8 sm:h-9 text-xs sm:text-sm shrink-0"
              >
                Update Password
              </Button>
            </div>

            {/* Logout All row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="min-w-0">
                <p className="font-medium text-sm text-slate-900 dark:text-white">Logout All Sessions</p>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">Revoke active sessions on all devices</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogoutAll}
                disabled={loggingOut}
                className="w-full sm:w-auto h-8 sm:h-9 text-xs sm:text-sm shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:hover:bg-red-900/20 dark:border-red-900/50"
              >
                {loggingOut ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <LogOut size={14} className="mr-1.5" />}
                {loggingOut ? "Processing..." : "Logout All"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bottom breathing room on mobile */}
        <div className="h-2 sm:h-0" />
      </div>
    </div>
  );
}
