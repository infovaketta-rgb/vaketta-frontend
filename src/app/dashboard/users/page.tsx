"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

const ROLES = ["ADMIN", "MANAGER", "STAFF"];

const roleBadge: Record<string, string> = {
  OWNER:   "bg-purple-100 text-purple-700",
  ADMIN:   "bg-blue-100 text-blue-700",
  MANAGER: "bg-yellow-100 text-yellow-700",
  STAFF:   "bg-gray-100 text-gray-600",
};

export default function UsersPage() {
  const mounted = useMounted();
  const [users,   setUsers]   = useState<User[]>([]);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "STAFF" });
  const [creating,   setCreating]   = useState(false);

  // Edit modal
  const [editUser,   setEditUser]   = useState<User | null>(null);
  const [editForm,   setEditForm]   = useState({ name: "", role: "", isActive: true });
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (!mounted) return;
    apiFetch("/auth/users").then(setUsers).catch(console.error);
  }, [mounted]);

  function openEdit(u: User) {
    setEditUser(u);
    setEditForm({ name: u.name, role: u.role, isActive: u.isActive });
    setError("");
  }

  function closeEdit() {
    setEditUser(null);
    setError("");
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setSuccess("");
    setCreating(true);
    try {
      const newUser = await apiFetch("/auth/create-user", {
        method: "POST",
        body: JSON.stringify(createForm),
      });
      setUsers((prev) => [...prev, newUser]);
      setCreateForm({ name: "", email: "", password: "", role: "STAFF" });
      setShowCreate(false);
      setSuccess("User created successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to create user.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editUser) return;
    setError(""); setSaving(true);
    try {
      const updated: User = await apiFetch(`/auth/users/${editUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setSuccess(`Updated ${updated.name}.`);
      closeEdit();
    } catch (err: any) {
      setError(err.message || "Failed to update user.");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2B0D3E]">User Management</h1>
        <button
          onClick={() => { setShowCreate((v) => !v); setError(""); setSuccess(""); }}
          className="px-4 py-2 rounded-lg bg-[#7A3F91] text-white text-sm font-medium hover:bg-[#2B0D3E] transition"
        >
          {showCreate ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-200">
          {success}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 bg-white rounded-xl shadow p-6 max-w-lg">
          <h2 className="text-base font-semibold text-[#2B0D3E] mb-4">Create New User</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text" required value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email" required value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password" required value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]"
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit" disabled={creating}
              className="mt-1 rounded-lg bg-[#7A3F91] px-4 py-2 text-sm font-medium text-white hover:bg-[#2B0D3E] transition disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create User"}
            </button>
          </form>
        </div>
      )}

      {/* Mobile card list */}
      <div className="md:hidden bg-white rounded-xl shadow divide-y divide-gray-100">
        {users.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No users found.</p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#2B0D3E] truncate">{u.name}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{new Date(u.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                  {u.role}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {u.isActive ? "Active" : "Inactive"}
                </span>
                {u.role !== "OWNER" && (
                  <button
                    onClick={() => openEdit(u)}
                    className="text-xs font-medium text-[#7A3F91] hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-5 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">No users found.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-[#F2EAF7]/40 transition">
                  <td className="px-5 py-3 font-medium text-[#2B0D3E]">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== "OWNER" && (
                      <button
                        onClick={() => openEdit(u)}
                        className="rounded px-2 py-1 text-xs font-medium text-[#7A3F91] hover:bg-purple-50 transition"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-[#2B0D3E]">Edit User</h2>
              <button onClick={closeEdit} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="px-6 py-5 flex flex-col gap-4">
              {/* Email (read-only) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{editUser.email}</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input
                  type="text" required value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Active</p>
                  <p className="text-xs text-gray-400">Inactive users cannot log in</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.isActive ? "bg-[#7A3F91]" : "bg-gray-300"}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${editForm.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button" onClick={closeEdit}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 rounded-lg bg-[#7A3F91] px-4 py-2 text-sm font-medium text-white hover:bg-[#2B0D3E] transition disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
