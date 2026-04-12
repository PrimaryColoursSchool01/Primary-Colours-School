/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { User, Lock, LogOut, Save, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile, updateProfile, logoutAllSessions } from "@/services/profile.service";

const schema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().optional(),
});

export default function Profile() {
  const navigate = useNavigate();
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

  const getInitials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-[#136dec]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account information and security</p>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={18} className="text-[#136dec]" />
              Account Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar & Quick Info */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 rounded-full bg-[#136dec]/10 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-[#136dec]">{getInitials(profile?.fullName)}</span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white truncate">{profile?.fullName}</p>
                <p className="text-sm text-slate-500 truncate">{profile?.email}</p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    {profile?.status}
                  </span>
                  {profile?.roles?.map((role, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  {...register("fullName")}
                  className={errors.fullName ? "border-red-400 focus-visible:ring-red-400" : ""}
                />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input id="phone" {...register("phone")} placeholder="+234 XXX XXX XXXX" />
              </div>

              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={profile?.email} disabled className="bg-slate-50 dark:bg-slate-800/50 text-slate-500" />
                <p className="text-xs text-slate-400">Email cannot be changed. Contact support if required.</p>
              </div>

              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" /> Save Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock size={18} className="text-[#136dec]" />
              Security
            </CardTitle>
            <CardDescription>Manage your password and active sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Change Password</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update your login credentials</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/change-password")}>
                Update Password
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Logout</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Revoke active sessions on all devices</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogoutAll}
                disabled={loggingOut}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:hover:bg-red-900/20 dark:border-red-900/50"
              >
                {loggingOut ? <Loader2 size={16} className="animate-spin mr-2" /> : <LogOut size={16} className="mr-2" />}
                {loggingOut ? "Processing..." : "Logout"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
