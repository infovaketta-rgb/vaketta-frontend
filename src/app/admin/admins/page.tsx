"use client";

import { useEffect, useState } from "react";
import { adminApiFetch } from "@/lib/adminApi";
import { logAdminAction } from "@/lib/adminAudit";
import { SkeletonRow } from "@/components/admin/SkeletonRow";
import { useMounted } from "@/lib/useMounted";

type VakettaAdminRole = "SUPER_ADMIN" | "ADMIN" | "SUPPORT";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: VakettaAdminRole;
  createdAt: string;
}

const ROLES: VakettaAdminRole[] = ["SUPER_ADMIN", "ADMIN", "SUPPORT"];

const roleBadge: Record<VakettaAdminRole, string> = {
  SUPER_ADMIN: "bg-[#B8912E]/15 text-[#B8912E]",
  ADMIN:       "bg-[#1B52A8]/10 text-[#1B52A8]",
  SUPPORT:     "bg-emerald-100 text-emerald-700",
};

const roleLabel: Record<VakettaAdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN:       "Admin",
  SUPPORT:     "Support",
};

const inputCls =
  "w-full rounded-lg border border-[#E5E0D4] bg-white px-3 py-2 text-sm text-[#0C1B33] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20 focus:border-[#1B52A8] transition";

export default function AdminsPage() {
  const mounted = useMounted();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [me,     setMe]     = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [showCreate,   setShowCreate]   = useState(false);
  const [form,         setForm]         = useState({ name: "", email: "", password: "", confirmPassword: "", role: "ADMIN" as VakettaAdminRole });
  const [creating,     setCreating]     = useState(false);
  const [createError,  setCreateError]  = useState("");

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    Promise.all([adminApiFetch("/admin/admins"), adminApiFetch("/admin/me")])
      .then(([adminsList, meRes]) => {
        if (cancelled) return;
        setAdmins(adminsList);
        setMe(meRes.admin);
      })
      .catch((e: any) => { if (!cancelled && e.message !== "Unauthorized") setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [mounted]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (form.password !== form.confirmPassword) { setCreateError("Passwords do not match"); return; }
    setCreating(true);
    try {
      const created = await adminApiFetch("/admin/admins", {
        method: "POST",
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role: form.role }),
      });
      logAdminAction("admin.create", { email: form.email, role: form.role });
      setAdmins((prev) => [...prev, created]);
      setShowCreate(false);
      setForm({ name: "", email: "", password: "", confirmPassword: "", role: "ADMIN" });
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApiFetch(`/admin/admins/${deleteTarget.id}`, { method: "DELETE" });
      logAdminAction("admin.delete", { id: deleteTarget.id, email: deleteTarget.email });
      setAdmins((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      setError(e.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0C1B33]">Admin Users</h1>
          {!loading && (
            <p className="mt-1 text-sm text-[#0C1B33]/50">
              {admins.length} platform admin{admins.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-[#1B52A8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163F82]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Admin
        </button>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap items-center gap-2">
        {ROLES.map((r) => (
          <span key={r} className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${roleBadge[r]}`}>
            {roleLabel[r]}
          </span>
        ))}
        <span className="ml-1 text-xs text-[#0C1B33]/40">Super Admin: full access · Admin: hotel management · Support: read-only</span>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Table */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E0D4] bg-[#F4F2ED] text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/50">
                {["Name", "Email", "Role", "Joined", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D4]">
              {loading ? (
                [...Array(3)].map((_, i) => <SkeletonRow key={i} cols={5} />)
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#0C1B33]/40">No admins found.</td>
                </tr>
              ) : (
                admins.map((a) => (
                  <tr key={a.id} className="transition hover:bg-[#F4F2ED]/60">
                    <td className="px-5 py-3 font-medium text-[#0C1B33]">
                      {a.name}
                      {me?.id === a.id && (
                        <span className="ml-2 rounded-full bg-[#F4F2ED] border border-[#E5E0D4] px-2 py-0.5 text-xs text-[#0C1B33]/50">you</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#0C1B33]/60">{a.email}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadge[a.role]}`}>
                        {roleLabel[a.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#0C1B33]/50">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        disabled={me?.id === a.id}
                        onClick={() => setDeleteTarget(a)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30 transition"
                        title={me?.id === a.id ? "Cannot delete your own account" : undefined}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
              <h2 className="text-base font-bold text-[#0C1B33]">New Admin User</h2>
            </div>
            {createError && (
              <div className="mx-6 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</div>
            )}
            <form onSubmit={handleCreate} className="space-y-3 px-6 py-5">
              {[
                { label: "Full Name",    key: "name",            type: "text",     placeholder: "Jane Smith" },
                { label: "Email",        key: "email",           type: "email",    placeholder: "jane@vaketta.com" },
                { label: "Password",     key: "password",        type: "password", placeholder: "Min 8 characters" },
                { label: "Confirm Pass", key: "confirmPassword", type: "password", placeholder: "Repeat password" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">{label}</label>
                  <input required type={type} value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={inputCls} placeholder={placeholder} />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Role</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as VakettaAdminRole }))} className={inputCls}>
                  {ROLES.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setCreateError(""); }}
                  className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 rounded-lg bg-[#1B52A8] py-2 text-sm font-semibold text-white hover:bg-[#163F82] disabled:opacity-60 transition">
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-base font-bold text-[#0C1B33]">Remove Admin?</h2>
            <p className="mb-5 text-sm text-[#0C1B33]/65">
              <span className="font-semibold">{deleteTarget.name}</span> ({deleteTarget.email}) will lose all access to the platform.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-red-700 transition">
                {deleting ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
