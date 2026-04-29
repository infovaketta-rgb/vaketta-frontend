"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApiFetch } from "@/lib/adminApi";
import { clearAdmin, saveAdminName } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/adminAudit";
import { useMounted } from "@/lib/useMounted";

const inputCls =
  "w-full rounded-lg border border-[#E5E0D4] bg-white px-3 py-2.5 text-sm text-[#0C1B33] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20 focus:border-[#1B52A8] transition";

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const roleBadge: Record<string, string> = {
  SUPER_ADMIN: "bg-[#B8912E]/15 text-[#B8912E]",
  ADMIN:       "bg-[#1B52A8]/10 text-[#1B52A8]",
  SUPPORT:     "bg-emerald-100 text-emerald-700",
};
const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN:       "Admin",
  SUPPORT:     "Support",
};

export default function SettingsPage() {
  const mounted = useMounted();
  const router = useRouter();

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [igEmbedUrl, setIgEmbedUrl] = useState("");
  const [igSaving, setIgSaving] = useState(false);
  const [igSuccess, setIgSuccess] = useState("");
  const [igError, setIgError] = useState("");

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    adminApiFetch("/admin/me")
      .then((res: any) => {
        if (cancelled) return;
        const admin: AdminProfile = res.admin;
        setProfile(admin);
        setName(admin.name);
        setEmail(admin.email);
      })
      .catch((e: any) => {
        if (cancelled || e.message === "Unauthorized") return;
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    adminApiFetch("/admin/platform-settings")
      .then((res: any) => { if (!cancelled) setIgEmbedUrl(res.instagramEmbedUrl ?? ""); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [mounted]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(""); setProfileSuccess(""); setProfileSaving(true);
    try {
      const res = await adminApiFetch("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ name, email }),
      });
      saveAdminName(res.admin.name);
      setProfile((p) => p ? { ...p, name: res.admin.name, email: res.admin.email } : p);
      logAdminAction("admin.settings.profile", { name, email });
      setProfileSuccess("Profile updated successfully.");
      setTimeout(() => setProfileSuccess(""), 3000);
    } catch (e: any) {
      setProfileError(e.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(""); setPasswordSuccess("");

    if (newPassword !== confirmPassword) { setPasswordError("New passwords do not match"); return; }
    if (newPassword.length < 8) { setPasswordError("Password must be at least 8 characters"); return; }

    setPasswordSaving(true);
    try {
      const res = await adminApiFetch("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      logAdminAction("admin.settings.password");
      if (res.passwordChanged) {
        setPasswordSuccess("Password changed. Signing you out…");
        setTimeout(() => { clearAdmin(); router.replace("/admin/login"); }, 2000);
      }
    } catch (e: any) {
      setPasswordError(e.message);
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleIgEmbedSave(e: React.FormEvent) {
    e.preventDefault();
    setIgError(""); setIgSuccess(""); setIgSaving(true);
    try {
      await adminApiFetch("/admin/platform-settings", {
        method: "PATCH",
        body: JSON.stringify({ instagramEmbedUrl: igEmbedUrl.trim() }),
      });
      logAdminAction("admin.platform.instagramEmbedUrl");
      setIgSuccess("Instagram embed URL saved.");
      setTimeout(() => setIgSuccess(""), 3000);
    } catch (e: any) {
      setIgError(e.message);
    } finally {
      setIgSaving(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-6 max-w-xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0C1B33]">Settings</h1>
        <p className="mt-1 text-sm text-[#0C1B33]/50">Manage your account details and password.</p>
      </div>

      {/* Profile summary card */}
      {!loading && profile && (
        <div className="flex items-center gap-4 rounded-2xl border border-[#E5E0D4] bg-white px-5 py-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1B52A8] text-sm font-bold text-white">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[#0C1B33]">{profile.name}</p>
            <p className="truncate text-xs text-[#0C1B33]/50">{profile.email}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadge[profile.role] ?? "bg-slate-100 text-slate-600"}`}>
            {roleLabel[profile.role] ?? profile.role}
          </span>
        </div>
      )}

      {/* Profile Section */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
          <h2 className="text-sm font-semibold text-[#0C1B33]">Profile</h2>
          <p className="mt-0.5 text-xs text-[#0C1B33]/45">Update your display name and email address.</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          {profileSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{profileSuccess}</div>
          )}
          {profileError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{profileError}</div>
          )}
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Full Name</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Your name" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Email Address</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="your@email.com" />
            </div>
            <button
              type="submit"
              disabled={profileSaving || loading}
              className="flex items-center gap-2 rounded-xl bg-[#1B52A8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163F82] disabled:opacity-60"
            >
              {profileSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {profileSaving ? "Saving…" : "Save Profile"}
            </button>
          </form>
        </div>
      </div>

      {/* Password Section */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
          <h2 className="text-sm font-semibold text-[#0C1B33]">Change Password</h2>
          <p className="mt-0.5 text-xs text-[#0C1B33]/45">You will be signed out on all devices after changing your password.</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          {passwordSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{passwordSuccess}</div>
          )}
          {passwordError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{passwordError}</div>
          )}
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Current Password</label>
              <input required type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">New Password</label>
              <input required type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} placeholder="Min 8 characters" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Confirm New Password</label>
              <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} placeholder="Repeat new password" />
            </div>
            <button
              type="submit"
              disabled={passwordSaving || !!passwordSuccess}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {passwordSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {passwordSaving ? "Changing…" : "Change Password"}
            </button>
          </form>
        </div>
      </div>
      {/* Instagram Embed URL */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
          <h2 className="text-sm font-semibold text-[#0C1B33]">Instagram OAuth URL</h2>
          <p className="mt-0.5 text-xs text-[#0C1B33]/45">
            The Instagram OAuth authorize URL shown to hotel users when they click "Connect via Instagram".
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          {igSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{igSuccess}</div>
          )}
          {igError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{igError}</div>
          )}
          <form onSubmit={handleIgEmbedSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">
                OAuth Authorize URL
              </label>
              <input
                value={igEmbedUrl}
                onChange={(e) => setIgEmbedUrl(e.target.value)}
                className={inputCls}
                placeholder="https://www.instagram.com/oauth/authorize?client_id=…"
              />
              <p className="mt-1 text-[11px] text-[#0C1B33]/40">
                Paste the full Instagram OAuth URL including all query parameters (client_id, redirect_uri, scope, etc.).
              </p>
            </div>
            <button
              type="submit"
              disabled={igSaving}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #d6249f, #fd5949)" }}
            >
              {igSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {igSaving ? "Saving…" : "Save URL"}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
