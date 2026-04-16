"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";
import { formatCurrency, formatDate } from "@/lib/locale";

export default function BookingDetailPage() {
  const mounted   = useMounted();
  const router    = useRouter();
  const { id }    = useParams() as { id: string };

  const [booking,  setBooking]  = useState<any | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    apiFetch(`/bookings/${id}`)
      .then(setBooking)
      .catch((e: any) => setError(e.message || "Failed to load booking"))
      .finally(() => setLoading(false));
  }, [mounted, id]);

  async function changeStatus(status: string) {
    setActioning(true);
    try {
      await apiFetch(`/bookings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setBooking((prev: any) => ({ ...prev, status }));
    } catch (e: any) {
      alert(e.message || "Failed to update status");
    } finally {
      setActioning(false);
    }
  }

  if (!mounted || loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F4F2ED]">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-gray-200 border-t-[#1B52A8]" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#F4F2ED]">
        <p className="text-sm text-red-500">{error || "Booking not found"}</p>
        <button
          onClick={() => router.push("/dashboard/bookings")}
          className="text-sm text-[#1B52A8] hover:underline"
        >
          ← Back to Bookings
        </button>
      </div>
    );
  }

  const nights = Math.ceil(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
    (1000 * 60 * 60 * 24)
  );
  const balance = (booking.totalPrice ?? 0) - (booking.advancePaid ?? 0);
  const phone   = booking.guest?.phone ?? "";

  return (
    <div className="h-full overflow-y-auto bg-[#F4F2ED] p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/bookings")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E0D4] bg-white text-[#0C1B33]/60 hover:bg-[#F4F2ED] transition text-sm"
          >
            ←
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#0C1B33]">Booking Detail</h1>
              {booking.referenceNumber && (
                <span className="font-mono text-xs font-semibold text-[#1B52A8] bg-[#1B52A8]/8 px-2 py-1 rounded-md">
                  {booking.referenceNumber}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[#0C1B33]/40">
              Created {formatDate(booking.createdAt)}
            </p>
          </div>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Left — 2 cols */}
        <div className="flex flex-col gap-4 lg:col-span-2">

          {/* Guest card */}
          <div className="rounded-xl border border-[#E5E0D4] bg-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40">
              Guest
            </p>
            <p className="text-lg font-bold text-[#0C1B33]">
              {booking.guestName || booking.guest?.name || "—"}
            </p>
            {phone && (
              <div className="mt-2 flex items-center gap-3">
                <span className="font-mono text-sm text-[#0C1B33]/60">{phone}</span>
                <a
                  href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 transition"
                >
                  <WhatsAppIcon />
                  WhatsApp
                </a>
              </div>
            )}
          </div>

          {/* Stay details card */}
          <div className="rounded-xl border border-[#E5E0D4] bg-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40">
              Stay Details
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-[#0C1B33]/50">Room Type</dt>
                <dd className="mt-0.5 font-medium text-[#0C1B33]">{booking.roomType?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[#0C1B33]/50">Duration</dt>
                <dd className="mt-0.5 font-medium text-[#0C1B33]">{nights} night{nights !== 1 ? "s" : ""}</dd>
              </div>
              <div>
                <dt className="text-[#0C1B33]/50">Check-in</dt>
                <dd className="mt-0.5 font-medium text-[#0C1B33]">{formatDate(booking.checkIn)}</dd>
              </div>
              <div>
                <dt className="text-[#0C1B33]/50">Check-out</dt>
                <dd className="mt-0.5 font-medium text-[#0C1B33]">{formatDate(booking.checkOut)}</dd>
              </div>
            </dl>
          </div>

          {/* Payment card */}
          <div className="rounded-xl border border-[#E5E0D4] bg-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40">
              Payment
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Price per night" value={formatCurrency(booking.pricePerNight ?? 0)} />
              <Row
                label={`${nights} night${nights !== 1 ? "s" : ""} × ${formatCurrency(booking.pricePerNight ?? 0)}`}
                value={formatCurrency(booking.totalPrice ?? 0)}
              />
              <hr className="border-[#E5E0D4] my-1" />
              <Row
                label="Total"
                value={formatCurrency(booking.totalPrice ?? 0)}
                valueClass="font-bold text-[#B8912E]"
              />
              <Row
                label="Advance paid"
                value={formatCurrency(booking.advancePaid ?? 0)}
                valueClass="text-emerald-600 font-medium"
              />
              <hr className="border-[#E5E0D4] my-1" />
              <Row
                label="Balance due"
                value={formatCurrency(balance)}
                valueClass={balance > 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}
              />
            </div>
          </div>
        </div>

        {/* Right — 1 col */}
        <div className="flex flex-col gap-4">

          {/* Actions card */}
          <div className="rounded-xl border border-[#E5E0D4] bg-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40">
              Actions
            </p>
            <div className="flex flex-col gap-2">
              {booking.status === "PENDING" && (
                <>
                  <ActionButton
                    label="Confirm"
                    onClick={() => changeStatus("CONFIRMED")}
                    disabled={actioning}
                    className="bg-emerald-500 text-white hover:bg-emerald-600"
                  />
                  <ActionButton
                    label="Hold"
                    onClick={() => changeStatus("HOLD")}
                    disabled={actioning}
                    className="bg-sky-500 text-white hover:bg-sky-600"
                  />
                  <ActionButton
                    label="Cancel"
                    onClick={() => changeStatus("CANCELLED")}
                    disabled={actioning}
                    className="border border-red-300 text-red-600 hover:bg-red-50"
                  />
                </>
              )}
              {booking.status === "HOLD" && (
                <>
                  <ActionButton
                    label="Confirm"
                    onClick={() => changeStatus("CONFIRMED")}
                    disabled={actioning}
                    className="bg-emerald-500 text-white hover:bg-emerald-600"
                  />
                  <ActionButton
                    label="Cancel"
                    onClick={() => changeStatus("CANCELLED")}
                    disabled={actioning}
                    className="border border-red-300 text-red-600 hover:bg-red-50"
                  />
                </>
              )}
              {booking.status === "CONFIRMED" && (
                <ActionButton
                  label="Cancel"
                  onClick={() => changeStatus("CANCELLED")}
                  disabled={actioning}
                  className="border border-red-300 text-red-600 hover:bg-red-50"
                />
              )}
              {booking.status === "CANCELLED" && (
                <p className="text-xs text-[#0C1B33]/40">No actions available.</p>
              )}
            </div>
          </div>

          {/* Info card */}
          <div className="rounded-xl border border-[#E5E0D4] bg-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40">
              Info
            </p>
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <p className="text-[#0C1B33]/40 mb-0.5">Booking ID</p>
                <p className="font-mono text-[#0C1B33]/70 break-all">{booking.id}</p>
              </div>
              {booking.referenceNumber && (
                <div>
                  <p className="text-[#0C1B33]/40 mb-0.5">Reference</p>
                  <p className="font-mono font-semibold text-[#1B52A8]">{booking.referenceNumber}</p>
                </div>
              )}
              <div>
                <p className="text-[#0C1B33]/40 mb-0.5">Status</p>
                <StatusBadge status={booking.status} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  valueClass = "text-[#0C1B33]",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#0C1B33]/55">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${className}`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING:   "bg-amber-100 text-amber-700",
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-600",
    HOLD:      "bg-sky-100 text-sky-700",
  };
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
