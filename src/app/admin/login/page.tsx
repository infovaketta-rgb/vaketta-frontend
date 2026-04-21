"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApiFetch } from "@/lib/adminApi";
import { saveAdminName } from "@/lib/adminAuth";
import { useMounted } from "@/lib/useMounted";

export default function AdminLoginPage() {
  const mounted = useMounted();
  const router  = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  if (!mounted) return null;

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await adminApiFetch("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      saveAdminName(data.admin?.name ?? "Admin");
      router.replace("/admin/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left — brand panel */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between bg-[#0C1B33] px-10 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B8912E] text-base font-bold text-white">
            V
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Vaketta</p>
            <p className="text-sm font-bold leading-none text-white">Admin Panel</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="h-px w-10 bg-[#B8912E]" />
          <h1 className="text-3xl font-bold leading-snug text-white">
            Platform<br />
            <span className="text-[#B8912E]">control</span><br />
            centre.
          </h1>
          <p className="max-w-xs text-sm leading-relaxed text-white/50">
            Manage hotels, subscriptions, billing plans, and bot flows across the entire Vaketta platform.
          </p>
        </div>

        <p className="text-xs text-white/25">Vaketta Chat &mdash; Admin access only</p>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#F4F2ED] px-6">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0C1B33] text-sm font-bold text-[#B8912E]">V</div>
          <span className="text-base font-bold text-[#0C1B33]">Vaketta Admin</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-[#0C1B33]">Admin sign in</h2>
            <p className="mt-1.5 text-sm text-[#64748B]">Authorised personnel only</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/60">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@vaketta.com"
                className="w-full rounded-xl border border-[#E5E0D4] bg-white px-4 py-3 text-sm text-[#0C1B33] placeholder-slate-400 shadow-sm focus:border-[#1B52A8] focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/60">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#E5E0D4] bg-white px-4 py-3 text-sm text-[#0C1B33] placeholder-slate-400 shadow-sm focus:border-[#1B52A8] focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-[#1B52A8] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163F82] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
