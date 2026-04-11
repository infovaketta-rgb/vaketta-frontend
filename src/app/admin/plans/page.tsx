"use client";

import { useEffect, useState } from "react";
import { adminApiFetch } from "@/lib/adminApi";

// ── Types ──────────────────────────────────────────────────────────────────────

type Plan = {
  id:                      string;
  name:                    string;
  currency:                string;
  country:                 string;
  priceMonthly:            number;
  conversationLimit:       number;
  aiReplyLimit:            number;
  extraConversationCharge: number;
  extraAiReplyCharge:      number;
  isActive:                boolean;
  createdAt:               string;
  _count?: { hotels: number };
};

type FormState = {
  name:                    string;
  country:                 string;
  currency:                string;
  priceMonthly:            string;
  conversationLimit:       string;
  aiReplyLimit:            string;
  extraConversationCharge: string;
  extraAiReplyCharge:      string;
};

// ── Data ───────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "ALL", label: "🌍 Global (All Countries)", currency: "USD" },
  { code: "IN",  label: "🇮🇳 India",                currency: "INR" },
  { code: "US",  label: "🇺🇸 United States",        currency: "USD" },
  { code: "AE",  label: "🇦🇪 UAE",                  currency: "AED" },
  { code: "GB",  label: "🇬🇧 United Kingdom",       currency: "GBP" },
  { code: "SG",  label: "🇸🇬 Singapore",            currency: "SGD" },
  { code: "MY",  label: "🇲🇾 Malaysia",             currency: "MYR" },
  { code: "TH",  label: "🇹🇭 Thailand",             currency: "THB" },
  { code: "AU",  label: "🇦🇺 Australia",            currency: "AUD" },
  { code: "CA",  label: "🇨🇦 Canada",               currency: "CAD" },
  { code: "JP",  label: "🇯🇵 Japan",                currency: "JPY" },
  { code: "SA",  label: "🇸🇦 Saudi Arabia",         currency: "SAR" },
  { code: "QA",  label: "🇶🇦 Qatar",               currency: "QAR" },
  { code: "ID",  label: "🇮🇩 Indonesia",            currency: "IDR" },
  { code: "PH",  label: "🇵🇭 Philippines",          currency: "PHP" },
  { code: "LK",  label: "🇱🇰 Sri Lanka",            currency: "LKR" },
  { code: "NP",  label: "🇳🇵 Nepal",               currency: "NPR" },
];

const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar ($)",           symbol: "$"    },
  { code: "EUR", label: "EUR — Euro (€)",                symbol: "€"    },
  { code: "GBP", label: "GBP — British Pound (£)",       symbol: "£"    },
  { code: "INR", label: "INR — Indian Rupee (₹)",        symbol: "₹"    },
  { code: "AED", label: "AED — UAE Dirham (د.إ)",        symbol: "د.إ"  },
  { code: "SAR", label: "SAR — Saudi Riyal (﷼)",        symbol: "﷼"    },
  { code: "QAR", label: "QAR — Qatari Riyal (QR)",       symbol: "QR"   },
  { code: "SGD", label: "SGD — Singapore Dollar (S$)",   symbol: "S$"   },
  { code: "MYR", label: "MYR — Malaysian Ringgit (RM)",  symbol: "RM"   },
  { code: "THB", label: "THB — Thai Baht (฿)",           symbol: "฿"    },
  { code: "AUD", label: "AUD — Australian Dollar (A$)",  symbol: "A$"   },
  { code: "CAD", label: "CAD — Canadian Dollar (C$)",    symbol: "C$"   },
  { code: "JPY", label: "JPY — Japanese Yen (¥)",        symbol: "¥"    },
  { code: "IDR", label: "IDR — Indonesian Rupiah (Rp)",  symbol: "Rp"   },
  { code: "PHP", label: "PHP — Philippine Peso (₱)",     symbol: "₱"    },
  { code: "LKR", label: "LKR — Sri Lankan Rupee (Rs)",   symbol: "Rs"   },
  { code: "NPR", label: "NPR — Nepalese Rupee (रू)",    symbol: "रू"   },
];

function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}


function getCountryLabel(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.label ?? code;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function priceDisplay(minor: number, currency = "USD") {
  const sym = getCurrencySymbol(currency);
  return `${sym}${(minor / 100).toFixed(2)}`;
}

function limitDisplay(n: number) {
  return n === 0 ? "Unlimited" : n.toLocaleString();
}

const EMPTY_FORM: FormState = {
  name:                    "",
  country:                 "ALL",
  currency:                "USD",
  priceMonthly:            "",
  conversationLimit:       "",
  aiReplyLimit:            "",
  extraConversationCharge: "",
  extraAiReplyCharge:      "",
};

// ── Input / button shared styles ──────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-[#E5E0D4] bg-white px-3 py-2 text-sm text-[#0C1B33] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20 focus:border-[#1B52A8] transition";

// ── Plan Modal ─────────────────────────────────────────────────────────────────

function PlanModal({
  title, form, saving, error, onChange, onSave, onClose,
}: {
  title:    string;
  form:     FormState;
  saving:   boolean;
  error:    string;
  onChange: (f: FormState) => void;
  onSave:   () => void;
  onClose:  () => void;
}) {
  function handleCountryChange(countryCode: string) {
    const country = COUNTRIES.find((c) => c.code === countryCode);
    onChange({
      ...form,
      country: countryCode,
      currency: country?.currency ?? form.currency,
    });
  }

  const sym = getCurrencySymbol(form.currency);
  const selectedCountry = COUNTRIES.find((c) => c.code === form.country);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-[#0C1B33]">{title}</h3>
            <p className="mt-0.5 text-xs text-[#0C1B33]/50">Enter all prices in major currency units (e.g. dollars, rupees)</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-xl leading-none transition">
            ×
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
          {/* Plan Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Plan Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              placeholder="e.g. Starter, Professional, Enterprise"
              className={inputCls}
            />
          </div>

          {/* Country + Currency row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">
                Target Country / Region
              </label>
              <select
                value={form.country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className={inputCls}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              {form.country !== "ALL" && (
                <p className="mt-1 text-[11px] text-[#0C1B33]/45">
                  Plan visible to hotels in {selectedCountry?.label.replace(/^.*?\s/, "") ?? form.country}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">
                Billing Currency
              </label>
              <select
                value={form.currency}
                onChange={(e) => onChange({ ...form, currency: e.target.value })}
                className={inputCls}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[#0C1B33]/45">
                Symbol: <strong className="text-[#0C1B33]">{sym}</strong> · Code: <code className="font-mono">{form.currency}</code>
              </p>
            </div>
          </div>

          {/* Pricing fields */}
          <div className="rounded-xl border border-[#E5E0D4] bg-[#F4F2ED]/60 px-4 py-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/50">Pricing</p>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#0C1B33]/65">
                Monthly Price (in {form.currency} — enter whole units, e.g. 49 for {sym}49)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">{sym}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.priceMonthly}
                  onChange={(e) => onChange({ ...form, priceMonthly: e.target.value })}
                  placeholder="49"
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#0C1B33]/65">
                  Extra Conv. Charge <span className="text-slate-400">(per conversation)</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">{sym}</span>
                  <input type="number" min="0" step="0.01" value={form.extraConversationCharge}
                    onChange={(e) => onChange({ ...form, extraConversationCharge: e.target.value })}
                    placeholder="0.00" className={`${inputCls} pl-8`} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#0C1B33]/65">
                  Extra AI Reply Charge <span className="text-slate-400">(per reply)</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">{sym}</span>
                  <input type="number" min="0" step="0.01" value={form.extraAiReplyCharge}
                    onChange={(e) => onChange({ ...form, extraAiReplyCharge: e.target.value })}
                    placeholder="0.00" className={`${inputCls} pl-8`} />
                </div>
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="rounded-xl border border-[#E5E0D4] bg-[#F4F2ED]/60 px-4 py-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/50">Monthly Limits <span className="font-normal normal-case text-slate-400">(0 = unlimited)</span></p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#0C1B33]/65">Conversation Limit</label>
                <input type="number" min="0" value={form.conversationLimit}
                  onChange={(e) => onChange({ ...form, conversationLimit: e.target.value })}
                  placeholder="e.g. 1500" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#0C1B33]/65">AI Reply Limit</label>
                <input type="number" min="0" value={form.aiReplyLimit}
                  onChange={(e) => onChange({ ...form, aiReplyLimit: e.target.value })}
                  placeholder="e.g. 500" className={inputCls} />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-[#E5E0D4] px-4 py-2 text-sm text-[#0C1B33]/70 hover:bg-[#E5E0D4] transition">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#1B52A8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#163F82] disabled:opacity-50 transition"
          >
            {saving && <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            {saving ? "Saving…" : "Save Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PlansPage() {
  const [plans,   setPlans]   = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [createErr,  setCreateErr]  = useState("");
  const [creating,   setCreating]   = useState(false);

  const [editTarget, setEditTarget] = useState<Plan | null>(null);
  const [editForm,   setEditForm]   = useState<FormState>(EMPTY_FORM);
  const [editErr,    setEditErr]    = useState("");
  const [editing,    setEditing]    = useState(false);

  useEffect(() => { loadPlans(); }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      setPlans(await adminApiFetch("/admin/plans"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function validateForm(f: FormState): string {
    if (!f.name.trim()) return "Plan name is required.";
    if (isNaN(Number(f.priceMonthly)) || Number(f.priceMonthly) < 0) return "Enter a valid price.";
    if (isNaN(Number(f.conversationLimit)) || Number(f.conversationLimit) < 0) return "Enter a valid conversation limit.";
    if (isNaN(Number(f.aiReplyLimit))      || Number(f.aiReplyLimit)      < 0) return "Enter a valid AI reply limit.";
    return "";
  }

  async function handleCreate() {
    const err = validateForm(createForm);
    if (err) { setCreateErr(err); return; }
    setCreating(true); setCreateErr("");
    try {
      await adminApiFetch("/admin/plans", {
        method: "POST",
        body: JSON.stringify({
          name:                    createForm.name.trim(),
          country:                 createForm.country,
          currency:                createForm.currency,
          priceMonthly:            Math.round(Number(createForm.priceMonthly) * 100),
          conversationLimit:       Number(createForm.conversationLimit),
          aiReplyLimit:            Number(createForm.aiReplyLimit),
          extraConversationCharge: Math.round(Number(createForm.extraConversationCharge || 0) * 100),
          extraAiReplyCharge:      Math.round(Number(createForm.extraAiReplyCharge || 0) * 100),
        }),
      });
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      await loadPlans();
    } catch (e: any) {
      setCreateErr(e.message);
    } finally {
      setCreating(false);
    }
  }

  function openEdit(plan: Plan) {
    setEditTarget(plan);
    setEditForm({
      name:                    plan.name,
      country:                 plan.country ?? "ALL",
      currency:                plan.currency ?? "USD",
      priceMonthly:            String(plan.priceMonthly / 100),
      conversationLimit:       String(plan.conversationLimit),
      aiReplyLimit:            String(plan.aiReplyLimit),
      extraConversationCharge: String((plan.extraConversationCharge ?? 0) / 100),
      extraAiReplyCharge:      String((plan.extraAiReplyCharge ?? 0) / 100),
    });
    setEditErr("");
  }

  async function handleEdit() {
    if (!editTarget) return;
    const err = validateForm(editForm);
    if (err) { setEditErr(err); return; }
    setEditing(true); setEditErr("");
    try {
      await adminApiFetch(`/admin/plans/${editTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name:                    editForm.name.trim(),
          country:                 editForm.country,
          currency:                editForm.currency,
          priceMonthly:            Math.round(Number(editForm.priceMonthly) * 100),
          conversationLimit:       Number(editForm.conversationLimit),
          aiReplyLimit:            Number(editForm.aiReplyLimit),
          extraConversationCharge: Math.round(Number(editForm.extraConversationCharge || 0) * 100),
          extraAiReplyCharge:      Math.round(Number(editForm.extraAiReplyCharge || 0) * 100),
        }),
      });
      setEditTarget(null);
      await loadPlans();
    } catch (e: any) {
      setEditErr(e.message);
    } finally {
      setEditing(false);
    }
  }

  async function toggleActive(plan: Plan) {
    try {
      await adminApiFetch(`/admin/plans/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      await loadPlans();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0C1B33]">Plans</h1>
          <p className="mt-1 text-sm text-[#0C1B33]/50">
            Manage subscription plans. Each plan has a country target and its own billing currency.
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateForm(EMPTY_FORM); setCreateErr(""); }}
          className="flex items-center gap-2 rounded-xl bg-[#1B52A8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163F82]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Plan
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Plans table */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1B52A8] border-t-transparent" />
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-[#0C1B33]/40">
            <svg className="w-9 h-9 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">No plans yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E0D4] bg-[#F4F2ED] text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/50">
                  {["Plan", "Country", "Currency", "Price /mo", "Conversations", "AI Replies", "+Conv /unit", "+AI /unit", "Hotels", "Status", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0D4]">
                {plans.map((plan) => (
                  <tr key={plan.id} className={`transition hover:bg-[#F4F2ED]/60 ${!plan.isActive ? "opacity-45" : ""}`}>
                    <td className="px-5 py-3.5 font-semibold text-[#0C1B33]">{plan.name}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm">{getCountryLabel(plan.country ?? "ALL").split(" ")[0]}</span>
                      <span className="ml-1.5 text-xs text-[#0C1B33]/55">{plan.country ?? "ALL"}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#1B52A8]/8 px-2.5 py-0.5 text-xs font-semibold text-[#1B52A8]">
                        {plan.currency ?? "USD"}
                        <span className="text-[#0C1B33]/50">{getCurrencySymbol(plan.currency ?? "USD")}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#B8912E] font-mono">
                      {priceDisplay(plan.priceMonthly, plan.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-[#0C1B33]/70">{limitDisplay(plan.conversationLimit)}</td>
                    <td className="px-5 py-3.5 text-[#0C1B33]/70">{limitDisplay(plan.aiReplyLimit)}</td>
                    <td className="px-5 py-3.5 text-xs text-[#0C1B33]/55 font-mono">
                      {plan.extraConversationCharge ? priceDisplay(plan.extraConversationCharge, plan.currency) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#0C1B33]/55 font-mono">
                      {plan.extraAiReplyCharge ? priceDisplay(plan.extraAiReplyCharge, plan.currency) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[#0C1B33]/70">{plan._count?.hotels ?? 0}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                        plan.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${plan.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {plan.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEdit(plan)} className="text-xs font-medium text-[#1B52A8] hover:underline">
                          Edit
                        </button>
                        <span className="text-[#E5E0D4]">|</span>
                        <button
                          onClick={() => toggleActive(plan)}
                          className={`text-xs font-medium hover:underline ${plan.isActive ? "text-red-500" : "text-emerald-600"}`}
                        >
                          {plan.isActive ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <PlanModal
          title="Create New Plan"
          form={createForm} saving={creating} error={createErr}
          onChange={setCreateForm} onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editTarget && (
        <PlanModal
          title={`Edit: ${editTarget.name}`}
          form={editForm} saving={editing} error={editErr}
          onChange={setEditForm} onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
