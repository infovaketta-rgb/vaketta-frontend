"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";

type RoomPhoto = {
  id: string;
  url: string;
  order: number;
  isMain: boolean;
};

type RoomType = {
  id: string;
  name: string;
  basePrice: number;
  capacity: number | null;
  maxAdults: number | null;
  maxChildren: number | null;
  totalRooms: number;
  createdAt: string;
  photos: RoomPhoto[];
};

const emptyForm = { name: "", basePrice: "", capacity: "", maxAdults: "", maxChildren: "", totalRooms: "" };

export default function RoomTypesPage() {
  const mounted = useMounted();
  const router = useRouter();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    apiFetch("/room-types").then(setRoomTypes).catch(console.error);
  }, [mounted]);

  function getMainPhoto(rt: RoomType): string | null {
    const main = rt.photos.find((p) => p.isMain);
    return main?.url ?? rt.photos[0]?.url ?? null;
  }

  function guestLabel(rt: RoomType) {
    if (rt.maxAdults) {
      const c = rt.maxChildren ? ` + ${rt.maxChildren}` : "";
      return `${rt.maxAdults}${c} guests`;
    }
    if (rt.capacity) return `${rt.capacity} guests`;
    return "—";
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const created = await apiFetch("/room-types", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          basePrice: Number(form.basePrice),
          ...(form.capacity    ? { capacity:    Number(form.capacity)    } : {}),
          ...(form.maxAdults   ? { maxAdults:   Number(form.maxAdults)   } : {}),
          ...(form.maxChildren ? { maxChildren: Number(form.maxChildren) } : {}),
          ...(form.totalRooms  ? { totalRooms:  Number(form.totalRooms)  } : {}),
        }),
      });
      setRoomTypes((prev) => [...prev, created]);
      setForm(emptyForm);
      setShowForm(false);
      router.push(`/dashboard/room-types/${created.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create room type.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this room type? This will also delete all its photos.")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/room-types/${id}`, { method: "DELETE" });
      setRoomTypes((prev) => prev.filter((rt) => rt.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#2B0D3E]">Room Types</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage your room types and photos for WhatsApp carousel.</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(""); }}
          className="px-4 py-2 rounded-lg bg-[#7A3F91] text-white text-sm font-medium hover:bg-[#2B0D3E] transition"
        >
          {showForm ? "Cancel" : "+ Add Room Type"}
        </button>
      </div>

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-base font-semibold text-[#2B0D3E] mb-4">New Room Type</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input type="text" required value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]"
                  placeholder="e.g. Deluxe Room" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price (₹/night) *</label>
                  <input type="number" required min={0} value={form.basePrice}
                    onChange={(e) => setForm((p) => ({ ...p, basePrice: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]"
                    placeholder="2500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Total Rooms</label>
                  <input type="number" min={1} value={form.totalRooms}
                    onChange={(e) => setForm((p) => ({ ...p, totalRooms: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]"
                    placeholder="4" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Adults</label>
                  <input type="number" min={0} value={form.maxAdults}
                    onChange={(e) => setForm((p) => ({ ...p, maxAdults: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]"
                    placeholder="2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Children</label>
                  <input type="number" min={0} value={form.maxChildren}
                    onChange={(e) => setForm((p) => ({ ...p, maxChildren: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]"
                    placeholder="1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Capacity</label>
                  <input type="number" min={1} value={form.capacity}
                    onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]"
                    placeholder="3" />
                </div>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 rounded-lg bg-[#7A3F91] px-4 py-2 text-sm font-medium text-white hover:bg-[#2B0D3E] transition disabled:opacity-50">
                  {loading ? "Creating..." : "Create & Add Photos"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty state */}
      {roomTypes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#7A3F91]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">No room types yet</h3>
          <p className="text-xs text-gray-400 mb-4">Add your first room type to get started</p>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg bg-[#7A3F91] text-white text-sm font-medium hover:bg-[#2B0D3E] transition">
            + Add Room Type
          </button>
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {roomTypes.map((rt) => {
          const mainPhoto = getMainPhoto(rt);
          return (
            <div key={rt.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
              onClick={() => router.push(`/dashboard/room-types/${rt.id}`)}>

              {/* Photo */}
              <div className="relative h-44 bg-gradient-to-br from-purple-50 to-purple-100">
                {mainPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mainPhoto} alt={rt.name}
                    className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <svg className="w-10 h-10 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-purple-300">No photos yet</p>
                  </div>
                )}

                {/* Photo count badge */}
                {rt.photos.length > 0 && (
                  <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
                    {rt.photos.length} photo{rt.photos.length > 1 ? "s" : ""}
                  </div>
                )}

                {/* Edit button overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-[#7A3F91] text-xs font-semibold px-3 py-1.5 rounded-full shadow">
                    Edit Room
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-[#2B0D3E] text-sm leading-tight">{rt.name}</h3>
                  <span className="text-[#7A3F91] font-bold text-sm shrink-0">
                    ₹{rt.basePrice.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {guestLabel(rt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    {rt.totalRooms} room{rt.totalRooms > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => router.push(`/dashboard/room-types/${rt.id}`)}
                    className="flex-1 text-xs py-1.5 rounded-lg border border-[#7A3F91] text-[#7A3F91] hover:bg-[#7A3F91] hover:text-white transition font-medium">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(rt.id)}
                    disabled={deletingId === rt.id}
                    className="flex-1 text-xs py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-500 hover:text-white transition font-medium disabled:opacity-50">
                    {deletingId === rt.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}