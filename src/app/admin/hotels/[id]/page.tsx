"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { adminApiFetch } from "@/lib/adminApi";
import { logAdminAction } from "@/lib/adminAudit";
import { useMounted } from "@/lib/useMounted";
import { COUNTRIES, CURRENCIES, DATE_FORMATS } from "@/lib/locale";

interface RoomType {
  id: string;
  name: string;
  basePrice: number;
  capacity: number;
}

interface HotelUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
}

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  currency?: string;
  conversationLimit: number;
  aiReplyLimit: number;
  extraConversationCharge: number;
  extraAiReplyCharge: number;
  isActive: boolean;
}

interface HotelDetail {
  id: string;
  name: string;
  phone: string;
  apiKey: string;
  createdAt: string;
  subscriptionStatus: string;
  billingStartDate: string | null;
  billingEndDate: string | null;
  plan: Plan | null;
  users: HotelUser[];
  roomTypes: RoomType[];
  _count: { guests: number; bookings: number; messages: number };
  config?: {
    country?:    string;
    currency?:   string;
    dateFormat?: string;
    [key: string]: any;
  };
}

const HOTEL_ROLES = ["OWNER", "ADMIN", "MANAGER", "STAFF"];

const inputCls =
  "w-full rounded-lg border border-[#E5E0D4] bg-white px-3 py-2.5 text-sm text-[#0C1B33] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20 focus:border-[#1B52A8] transition";

const roleBadgeColors: Record<string, string> = {
  OWNER:   "bg-[#B8912E]/15 text-[#B8912E]",
  ADMIN:   "bg-[#1B52A8]/10 text-[#1B52A8]",
  MANAGER: "bg-emerald-100 text-emerald-700",
  STAFF:   "bg-slate-100 text-slate-600",
};

const emptyUserForm = { name: "", email: "", password: "", role: "STAFF" };

function statusBadge(s: string) {
  if (s === "active")  return "text-emerald-700 bg-emerald-50 border border-emerald-200";
  if (s === "trial")   return "text-[#1B52A8] bg-[#1B52A8]/8 border border-[#1B52A8]/20";
  if (s === "expired") return "text-red-600 bg-red-50 border border-red-200";
  return "text-slate-500 bg-slate-50 border border-slate-200";
}

function planPrice(plan: Plan) {
  const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", INR: "₹", AED: "د.إ",
    SAR: "﷼", SGD: "S$", MYR: "RM", AUD: "A$", CAD: "C$",
    JPY: "¥", THB: "฿", IDR: "Rp", PHP: "₱", LKR: "Rs",
  };
  const sym = CURRENCY_SYMBOLS[plan.currency ?? "USD"] ?? (plan.currency ?? "USD") + " ";
  return `${sym}${(plan.priceMonthly / 100).toLocaleString("en", { minimumFractionDigits: 0 })}/mo`;
}

export default function HotelDetailPage() {
  const mounted = useMounted();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [hotel, setHotel] = useState<HotelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 10;

  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserForm, setAddUserForm] = useState(emptyUserForm);
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState("");

  const [editUser, setEditUser] = useState<HotelUser | null>(null);
  const [editUserForm, setEditUserForm] = useState({ name: "", email: "", role: "", isActive: true });
  const [savingUser, setSavingUser] = useState(false);
  const [editUserError, setEditUserError] = useState("");

  const [deleteUserTarget, setDeleteUserTarget] = useState<HotelUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const [localeCountry,    setLocaleCountry]    = useState("");
  const [localeCurrency,   setLocaleCurrency]   = useState("INR");
  const [localeDateFormat, setLocaleDateFormat] = useState("DD/MM/YYYY");
  const [savingLocale,     setSavingLocale]     = useState(false);
  const [localeError,      setLocaleError]      = useState("");
  const [localeSaved,      setLocaleSaved]      = useState(false);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [showTrial, setShowTrial] = useState(false);
  const [trialDays, setTrialDays] = useState("14");
  const [startingTrial, setStartingTrial] = useState(false);
  const [showAssignPlan, setShowAssignPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [assigningPlan, setAssigningPlan] = useState(false);
  const [billingError, setBillingError] = useState("");

  useEffect(() => {
    if (!mounted || !id) return;
    let cancelled = false;

    Promise.all([
      adminApiFetch(`/admin/hotels/${id}`),
      adminApiFetch("/admin/plans"),
    ])
      .then(([data, planList]: [HotelDetail, Plan[]]) => {
        if (cancelled) return;
        setHotel(data);
        setEditName(data.name);
        setPlans(planList.filter((p) => p.isActive));
        if (data.config?.country)    setLocaleCountry(data.config.country);
        if (data.config?.currency)   setLocaleCurrency(data.config.currency);
        if (data.config?.dateFormat) setLocaleDateFormat(data.config.dateFormat);
      })
      .catch((e: any) => { if (cancelled || e.message === "Unauthorized") return; setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [mounted, id]);

  async function saveName() {
    if (!hotel || editName.trim() === hotel.name) { setEditingName(false); return; }
    setSavingName(true);
    try {
      const updated = await adminApiFetch(`/admin/hotels/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName.trim() }),
      });
      logAdminAction("hotel.update", { id, name: editName.trim() });
      setHotel((h) => h ? { ...h, name: updated.name } : h);
      setEditingName(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingName(false);
    }
  }

  async function copyApiKey() {
    if (!hotel) return;
    await navigator.clipboard.writeText(hotel.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleStartTrial() {
    setBillingError("");
    setStartingTrial(true);
    try {
      const days = Math.max(1, Math.min(90, Number(trialDays) || 14));
      const result = await adminApiFetch(`/admin/hotels/${id}/trial`, {
        method: "POST",
        body: JSON.stringify({ days }),
      });
      setHotel((h) => h ? { ...h, subscriptionStatus: result.subscriptionStatus, billingStartDate: result.billingStartDate, billingEndDate: result.billingEndDate, plan: null } : h);
      setShowTrial(false);
    } catch (e: any) {
      setBillingError(e.message);
    } finally {
      setStartingTrial(false);
    }
  }

  async function handleAssignPlan() {
    if (!selectedPlanId) return;
    setBillingError("");
    setAssigningPlan(true);
    try {
      await adminApiFetch(`/admin/hotels/${id}/plan`, {
        method: "PATCH",
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      const chosen = plans.find((p) => p.id === selectedPlanId) ?? null;
      setHotel((h) => h ? { ...h, plan: chosen, subscriptionStatus: "active" } : h);
      setShowAssignPlan(false);
      setSelectedPlanId("");
    } catch (e: any) {
      setBillingError(e.message);
    } finally {
      setAssigningPlan(false);
    }
  }

  async function saveLocale() {
    setLocaleError("");
    setSavingLocale(true);
    try {
      await adminApiFetch(`/admin/hotels/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ config: { country: localeCountry, currency: localeCurrency, dateFormat: localeDateFormat } }),
      });
      logAdminAction("hotel.locale.update", { id, country: localeCountry, currency: localeCurrency, dateFormat: localeDateFormat });
      setHotel((h) => h ? { ...h, config: { ...(h.config ?? {}), country: localeCountry, currency: localeCurrency, dateFormat: localeDateFormat } } : h);
      setLocaleSaved(true);
      setTimeout(() => setLocaleSaved(false), 2500);
    } catch (e: any) {
      setLocaleError(e.message);
    } finally {
      setSavingLocale(false);
    }
  }

  async function handleDeleteHotel() {
    if (!hotel || deleteConfirm !== hotel.name) return;
    setDeleting(true);
    try {
      await adminApiFetch(`/admin/hotels/${id}`, { method: "DELETE" });
      logAdminAction("hotel.delete", { id, name: hotel.name });
      router.replace("/admin/hotels");
    } catch (e: any) {
      setError(e.message);
      setShowDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddUserError("");
    setAddingUser(true);
    try {
      const created: HotelUser = await adminApiFetch(`/admin/hotels/${id}/users`, {
        method: "POST",
        body: JSON.stringify(addUserForm),
      });
      logAdminAction("hotel.user.create", { hotelId: id, email: addUserForm.email, role: addUserForm.role });
      setHotel((h) => h ? { ...h, users: [...h.users, created] } : h);
      setShowAddUser(false);
      setAddUserForm(emptyUserForm);
    } catch (e: any) {
      setAddUserError(e.message);
    } finally {
      setAddingUser(false);
    }
  }

  function openEditUser(user: HotelUser) {
    setEditUser(user);
    setEditUserForm({ name: user.name, email: user.email, role: user.role, isActive: user.isActive });
    setEditUserError("");
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditUserError("");
    setSavingUser(true);
    try {
      const updated: HotelUser = await adminApiFetch(`/admin/hotels/${id}/users/${editUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(editUserForm),
      });
      logAdminAction("hotel.user.update", { hotelId: id, userId: editUser.id });
      setHotel((h) => h ? { ...h, users: h.users.map((u) => u.id === updated.id ? updated : u) } : h);
      setEditUser(null);
    } catch (e: any) {
      setEditUserError(e.message);
    } finally {
      setSavingUser(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteUserTarget) return;
    setDeletingUser(true);
    try {
      await adminApiFetch(`/admin/hotels/${id}/users/${deleteUserTarget.id}`, { method: "DELETE" });
      logAdminAction("hotel.user.delete", { hotelId: id, userId: deleteUserTarget.id });
      setHotel((h) => h ? { ...h, users: h.users.filter((u) => u.id !== deleteUserTarget.id) } : h);
      setDeleteUserTarget(null);
    } catch (e: any) {
      setError(e.message);
      setDeleteUserTarget(null);
    } finally {
      setDeletingUser(false);
    }
  }

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E5E0D4] border-t-[#1B52A8]" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="p-8 space-y-3">
        <p className="text-sm text-red-600">{error || "Hotel not found."}</p>
        <Link href="/admin/hotels" className="text-sm font-medium text-[#1B52A8] hover:underline">← Back to Hotels</Link>
      </div>
    );
  }

  const pagedUsers = hotel.users.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE);
  const userPages = Math.ceil(hotel.users.length / USERS_PER_PAGE);

  return (
    <div className="p-8 space-y-6">

      {/* Breadcrumb */}
      <Link href="/admin/hotels" className="inline-flex items-center gap-1 text-sm font-medium text-[#1B52A8] hover:underline">
        ← Hotels
      </Link>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Header card */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {editingName ? (
                <>
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                    className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-lg font-bold text-[#0C1B33] focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20 focus:border-[#1B52A8]"
                  />
                  <button onClick={saveName} disabled={savingName} className="rounded-lg bg-[#1B52A8] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-[#163F82] transition">
                    {savingName ? "…" : "Save"}
                  </button>
                  <button onClick={() => setEditingName(false)} className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-xs text-[#0C1B33]/60 hover:bg-[#F4F2ED] transition">Cancel</button>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-[#0C1B33]">{hotel.name}</h1>
                  <button onClick={() => setEditingName(true)} className="rounded-lg p-1.5 text-[#0C1B33]/30 hover:bg-[#F4F2ED] hover:text-[#0C1B33]/60 transition" title="Edit name">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
            <p className="mt-1 text-sm text-[#0C1B33]/60">📞 {hotel.phone}</p>
            <p className="mt-0.5 text-xs text-[#0C1B33]/40">Joined {new Date(hotel.createdAt).toLocaleDateString()}</p>
          </div>

          {/* API Key */}
          <div className="rounded-xl border border-[#E5E0D4] bg-[#F4F2ED] px-4 py-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/45">API Key</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-[#0C1B33]/70 font-mono">{apiKeyVisible ? hotel.apiKey : "••••••••••••••••••••••••"}</code>
              <button onClick={() => setApiKeyVisible((v) => !v)} className="text-xs text-[#0C1B33]/40 hover:text-[#0C1B33]/70 transition">
                {apiKeyVisible ? "Hide" : "Show"}
              </button>
              <button onClick={copyApiKey} className="rounded-lg bg-[#1B52A8] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#163F82] transition">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 gap-4 border-t border-[#E5E0D4] pt-5">
          {[
            { label: "Guests",   value: hotel._count.guests },
            { label: "Bookings", value: hotel._count.bookings },
            { label: "Messages", value: hotel._count.messages },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xl font-bold text-[#0C1B33]">{value.toLocaleString()}</p>
              <p className="text-xs text-[#0C1B33]/45 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[#0C1B33]">Subscription</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(hotel.subscriptionStatus)}`}>
                {hotel.subscriptionStatus}
              </span>
              {hotel.billingEndDate && (
                <span className="text-xs text-[#0C1B33]/45">Ends {new Date(hotel.billingEndDate).toLocaleDateString()}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setBillingError(""); setShowTrial(true); }}
              className="rounded-lg border border-[#1B52A8]/30 px-3 py-1.5 text-xs font-semibold text-[#1B52A8] hover:bg-[#1B52A8]/5 transition"
            >
              Start Trial
            </button>
            <button
              onClick={() => { setBillingError(""); setSelectedPlanId(""); setShowAssignPlan(true); }}
              className="rounded-lg bg-[#1B52A8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#163F82] transition"
            >
              Assign Plan
            </button>
          </div>
        </div>
        <div className="px-6 py-5">
          {billingError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{billingError}</div>
          )}
          {hotel.plan ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 text-sm">
              <div>
                <p className="text-xs text-[#0C1B33]/40 font-medium mb-0.5">Plan</p>
                <p className="font-semibold text-[#0C1B33]">{hotel.plan.name}</p>
              </div>
              <div>
                <p className="text-xs text-[#0C1B33]/40 font-medium mb-0.5">Price</p>
                <p className="font-bold text-[#B8912E] font-mono">{planPrice(hotel.plan)}</p>
              </div>
              <div>
                <p className="text-xs text-[#0C1B33]/40 font-medium mb-0.5">Conversations</p>
                <p className="text-[#0C1B33]/70">{hotel.plan.conversationLimit === 0 ? "Unlimited" : hotel.plan.conversationLimit.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-[#0C1B33]/40 font-medium mb-0.5">AI Replies</p>
                <p className="text-[#0C1B33]/70">{hotel.plan.aiReplyLimit === 0 ? "Unlimited" : hotel.plan.aiReplyLimit.toLocaleString()}</p>
              </div>
              {(hotel.plan.extraConversationCharge > 0 || hotel.plan.extraAiReplyCharge > 0) && (
                <div className="col-span-2 sm:col-span-4">
                  <p className="text-xs text-[#0C1B33]/40 font-medium mb-0.5">Overage</p>
                  <p className="text-xs text-[#0C1B33]/60">
                    {hotel.plan.extraConversationCharge > 0 && `¢${hotel.plan.extraConversationCharge}/extra conv`}
                    {hotel.plan.extraConversationCharge > 0 && hotel.plan.extraAiReplyCharge > 0 && " · "}
                    {hotel.plan.extraAiReplyCharge > 0 && `¢${hotel.plan.extraAiReplyCharge}/extra AI reply`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#0C1B33]/40 italic">No plan assigned. Start a trial or assign a plan.</p>
          )}
        </div>
      </div>

      {/* Staff / Users */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
          <h2 className="text-sm font-semibold text-[#0C1B33]">Staff ({hotel.users.length})</h2>
          <button
            onClick={() => { setAddUserError(""); setAddUserForm(emptyUserForm); setShowAddUser(true); }}
            className="flex items-center gap-1.5 rounded-lg bg-[#1B52A8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#163F82] transition"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E0D4] text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/50">
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D4]">
              {pagedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#0C1B33]/40">
                    No staff yet. Click "Add User" to create the first one.
                  </td>
                </tr>
              ) : (
                pagedUsers.map((u) => (
                  <tr key={u.id} className="transition hover:bg-[#F4F2ED]/60">
                    <td className="px-5 py-3.5 font-medium text-[#0C1B33]">{u.name}</td>
                    <td className="px-5 py-3.5 text-[#0C1B33]/60">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadgeColors[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditUser(u)} className="rounded-lg border border-[#E5E0D4] px-2.5 py-1 text-xs font-medium text-[#1B52A8] hover:bg-[#1B52A8]/5 transition">Edit</button>
                        <button onClick={() => setDeleteUserTarget(u)} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {userPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#E5E0D4] bg-[#F4F2ED]/50 px-5 py-3">
            <button disabled={userPage <= 1} onClick={() => setUserPage((p) => p - 1)} className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-xs font-medium text-[#0C1B33]/60 disabled:opacity-40 hover:bg-white transition">← Prev</button>
            <span className="text-xs text-[#0C1B33]/50">{userPage} / {userPages}</span>
            <button disabled={userPage >= userPages} onClick={() => setUserPage((p) => p + 1)} className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-xs font-medium text-[#0C1B33]/60 disabled:opacity-40 hover:bg-white transition">Next →</button>
          </div>
        )}
      </div>

      {/* Room Types */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
          <h2 className="text-sm font-semibold text-[#0C1B33]">Room Types ({hotel.roomTypes.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E0D4] text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/50">
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-right">Base Price</th>
                <th className="px-5 py-3 text-right">Capacity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D4]">
              {hotel.roomTypes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-sm text-[#0C1B33]/40">No room types configured yet.</td>
                </tr>
              ) : (
                hotel.roomTypes.map((rt) => (
                  <tr key={rt.id} className="transition hover:bg-[#F4F2ED]/60">
                    <td className="px-5 py-3.5 font-medium text-[#0C1B33]">{rt.name}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-[#B8912E] font-mono">
                      {CURRENCIES.find((c) => c.code === localeCurrency)?.symbol ?? "₹"}{rt.basePrice.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right text-[#0C1B33]/70">{rt.capacity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Locale & Display Settings */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
          <h2 className="text-sm font-semibold text-[#0C1B33]">Locale &amp; Display Settings</h2>
          <p className="mt-0.5 text-xs text-[#0C1B33]/45">Country, currency, and date format applied across this hotel's entire dashboard.</p>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="grid gap-5 sm:grid-cols-3">
            {/* Country */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Country</label>
              <select
                value={localeCountry}
                onChange={(e) => {
                  const country = COUNTRIES.find((c) => c.code === e.target.value);
                  setLocaleCountry(e.target.value);
                  if (country) setLocaleCurrency(country.currency);
                }}
                className={inputCls}
              >
                <option value="">— Not specified —</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[#0C1B33]/40">Auto-fills currency when selected</p>
            </div>

            {/* Currency */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Currency</label>
              <select value={localeCurrency} onChange={(e) => setLocaleCurrency(e.target.value)} className={inputCls}>
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-[#0C1B33]/40">
                Symbol: <span className="font-semibold text-[#0C1B33]/60">{CURRENCIES.find((c) => c.code === localeCurrency)?.symbol ?? "₹"}</span>
                &nbsp;· Code: <span className="font-mono text-[#0C1B33]/60">{localeCurrency}</span>
              </p>
            </div>

            {/* Date format */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Date Format</label>
              <select value={localeDateFormat} onChange={(e) => setLocaleDateFormat(e.target.value)} className={inputCls}>
                {DATE_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label} — e.g. {f.example}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-[#0C1B33]/40">
                Preview: <span className="font-semibold text-[#0C1B33]/60">{DATE_FORMATS.find((f) => f.value === localeDateFormat)?.example ?? "25/12/2024"}</span>
              </p>
            </div>
          </div>

          {/* Live preview */}
          {(localeCountry || localeCurrency) && (
            <div className="flex items-center gap-3 rounded-xl border border-[#1B52A8]/15 bg-[#1B52A8]/5 px-4 py-3">
              {localeCountry && (
                <span className="text-2xl">{COUNTRIES.find((c) => c.code === localeCountry)?.flag}</span>
              )}
              <div className="text-xs text-[#1B52A8]/80">
                <span className="font-semibold text-[#0C1B33]">
                  {localeCountry ? COUNTRIES.find((c) => c.code === localeCountry)?.label : "No country set"}
                </span>
                <span className="mx-1.5 text-[#0C1B33]/30">·</span>
                <span>{CURRENCIES.find((c) => c.code === localeCurrency)?.symbol ?? "₹"} {localeCurrency}</span>
                <span className="mx-1.5 text-[#0C1B33]/30">·</span>
                <span>{DATE_FORMATS.find((f) => f.value === localeDateFormat)?.example ?? "25/12/2024"}</span>
              </div>
            </div>
          )}

          {localeError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{localeError}</div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={saveLocale}
              disabled={savingLocale}
              className="flex items-center gap-2 rounded-xl bg-[#1B52A8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163F82] disabled:opacity-60"
            >
              {savingLocale && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {savingLocale ? "Saving…" : "Save Locale Settings"}
            </button>
            {localeSaved && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-red-700">Danger Zone</h2>
        <p className="mb-4 text-xs text-[#0C1B33]/50">Deleting a hotel permanently removes all its data — staff, guests, bookings, and messages. This action cannot be undone.</p>
        <button onClick={() => setShowDelete(true)} className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition">
          Delete this hotel
        </button>
      </div>

      {/* ── Add User Modal ── */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
              <h2 className="text-base font-bold text-[#0C1B33]">Add Staff User</h2>
            </div>
            {addUserError && (
              <div className="mx-6 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{addUserError}</div>
            )}
            <form onSubmit={handleAddUser} className="space-y-3 px-6 py-5">
              {[
                { label: "Full Name", key: "name", type: "text", placeholder: "e.g. John Doe" },
                { label: "Email",     key: "email", type: "email", placeholder: "john@hotel.com" },
                { label: "Password",  key: "password", type: "password", placeholder: "Min 8 characters" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">{label}</label>
                  <input required type={type} value={(addUserForm as any)[key]}
                    onChange={(e) => setAddUserForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={inputCls} placeholder={placeholder} />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Role</label>
                <select value={addUserForm.role} onChange={(e) => setAddUserForm((f) => ({ ...f, role: e.target.value }))} className={inputCls}>
                  {HOTEL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition">Cancel</button>
                <button type="submit" disabled={addingUser} className="flex-1 rounded-lg bg-[#1B52A8] py-2 text-sm font-semibold text-white hover:bg-[#163F82] disabled:opacity-60 transition">
                  {addingUser ? "Adding…" : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
              <h2 className="text-base font-bold text-[#0C1B33]">Edit User</h2>
            </div>
            {editUserError && (
              <div className="mx-6 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{editUserError}</div>
            )}
            <form onSubmit={handleEditUser} className="space-y-3 px-6 py-5">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Full Name</label>
                <input required value={editUserForm.name} onChange={(e) => setEditUserForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Email</label>
                <input required type="email" value={editUserForm.email} onChange={(e) => setEditUserForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Role</label>
                <select value={editUserForm.role} onChange={(e) => setEditUserForm((f) => ({ ...f, role: e.target.value }))} className={inputCls}>
                  {HOTEL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Active</span>
                <button
                  type="button"
                  onClick={() => setEditUserForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${editUserForm.isActive ? "bg-[#1B52A8]" : "bg-slate-300"}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${editUserForm.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <span className="text-xs text-[#0C1B33]/50">{editUserForm.isActive ? "Active" : "Inactive"}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditUser(null)} className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition">Cancel</button>
                <button type="submit" disabled={savingUser} className="flex-1 rounded-lg bg-[#1B52A8] py-2 text-sm font-semibold text-white hover:bg-[#163F82] disabled:opacity-60 transition">
                  {savingUser ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete User Confirmation ── */}
      {deleteUserTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-base font-bold text-[#0C1B33]">Remove User?</h2>
            <p className="mb-5 text-sm text-[#0C1B33]/65">
              <span className="font-semibold">{deleteUserTarget.name}</span> ({deleteUserTarget.email}) will lose access to this hotel permanently.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteUserTarget(null)} className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition">Cancel</button>
              <button onClick={handleDeleteUser} disabled={deletingUser} className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-red-700 transition">
                {deletingUser ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Start Trial Modal ── */}
      {showTrial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
              <h2 className="text-base font-bold text-[#0C1B33]">Start Trial</h2>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm text-[#0C1B33]/65">Set the trial duration for <span className="font-semibold">{hotel.name}</span>. The hotel gets full access during this period at no charge.</p>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Trial Duration (days)</label>
                <input type="number" min={1} max={90} value={trialDays} onChange={(e) => setTrialDays(e.target.value)} className={inputCls} />
              </div>
              {billingError && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{billingError}</div>}
              <div className="flex gap-2">
                <button onClick={() => setShowTrial(false)} className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition">Cancel</button>
                <button onClick={handleStartTrial} disabled={startingTrial} className="flex-1 rounded-lg bg-[#1B52A8] py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-[#163F82] transition">
                  {startingTrial ? "Starting…" : "Start Trial"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Plan Modal ── */}
      {showAssignPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
              <h2 className="text-base font-bold text-[#0C1B33]">Assign Plan</h2>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm text-[#0C1B33]/65">Choose a subscription plan for <span className="font-semibold">{hotel.name}</span>. This activates billing and snapshots the plan terms.</p>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Plan</label>
                <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className={inputCls}>
                  <option value="">— Select a plan —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {planPrice(p)}
                    </option>
                  ))}
                </select>
              </div>
              {selectedPlanId && (() => {
                const p = plans.find((pl) => pl.id === selectedPlanId);
                if (!p) return null;
                return (
                  <div className="rounded-xl border border-[#E5E0D4] bg-[#F4F2ED] px-4 py-3 text-xs text-[#0C1B33]/70 space-y-1">
                    <p className="font-semibold text-[#0C1B33]">{p.name} — <span className="text-[#B8912E] font-mono">{planPrice(p)}</span></p>
                    <p>{p.conversationLimit === 0 ? "Unlimited" : p.conversationLimit.toLocaleString()} conversations · {p.aiReplyLimit === 0 ? "Unlimited" : p.aiReplyLimit.toLocaleString()} AI replies</p>
                    {(p.extraConversationCharge > 0 || p.extraAiReplyCharge > 0) && (
                      <p className="text-[#0C1B33]/45">Overage: {p.extraConversationCharge > 0 ? `¢${p.extraConversationCharge}/conv` : ""}{p.extraConversationCharge > 0 && p.extraAiReplyCharge > 0 ? " · " : ""}{p.extraAiReplyCharge > 0 ? `¢${p.extraAiReplyCharge}/reply` : ""}</p>
                    )}
                  </div>
                );
              })()}
              {billingError && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{billingError}</div>}
              <div className="flex gap-2">
                <button onClick={() => setShowAssignPlan(false)} className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition">Cancel</button>
                <button onClick={handleAssignPlan} disabled={!selectedPlanId || assigningPlan} className="flex-1 rounded-lg bg-[#1B52A8] py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-[#163F82] transition">
                  {assigningPlan ? "Assigning…" : "Assign Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Hotel Confirmation ── */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-base font-bold text-[#0C1B33]">Delete Hotel?</h2>
            <p className="mb-1 text-sm text-[#0C1B33]/65">Type <span className="font-semibold">{hotel.name}</span> to confirm permanent deletion.</p>
            <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className={`mb-4 mt-2 ${inputCls}`} placeholder={hotel.name} />
            <div className="flex gap-2">
              <button onClick={() => { setShowDelete(false); setDeleteConfirm(""); }} className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition">Cancel</button>
              <button onClick={handleDeleteHotel} disabled={deleteConfirm !== hotel.name || deleting} className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-red-700 transition">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
