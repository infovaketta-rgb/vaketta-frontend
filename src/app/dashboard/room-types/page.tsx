"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";

type RoomType = {
  id:          string;
  name:        string;
  basePrice:   number;
  capacity:    number | null;
  maxAdults:   number | null;
  maxChildren: number | null;
  totalRooms:  number;
  createdAt:   string;
};

const emptyForm = {
  name: "", basePrice: "", capacity: "", maxAdults: "", maxChildren: "", totalRooms: "",
};

const inp = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]";
const inpSm = "rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]";
const lbl = "block text-xs font-medium text-gray-600 mb-1";
const lblSm = "block text-xs text-gray-500 mb-1";

function guestLabel(rt: RoomType) {
  if (rt.maxAdults) {
    const c = rt.maxChildren ? ` + ${rt.maxChildren} child${rt.maxChildren > 1 ? "ren" : ""}` : "";
    return `${rt.maxAdults} adult${rt.maxAdults > 1 ? "s" : ""}${c}`;
  }
  if (rt.capacity) return `${rt.capacity} guest${rt.capacity > 1 ? "s" : ""}`;
  return "—";
}

  // ── Shared form fields ────────────────────────────────────────────────────────
  function FormFields({ f, setF, isInline }: {
    f: typeof emptyForm;
    setF: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
    isInline?: boolean;
  }) {
    const i = isInline ? `${inpSm} w-32` : inp;
    const l = isInline ? lblSm : lbl;

    return (
      <>
        <div className={isInline ? "" : undefined}>
          <label className={l}>Name</label>
          <input type="text" required value={f.name}
            onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))}
            className={isInline ? `${inpSm} w-44` : inp} placeholder="e.g. Deluxe Room" />
        </div>

        <div>
          <label className={l}>Price (₹/night)</label>
          <input type="number" required min={0} value={f.basePrice}
            onChange={(e) => setF((p) => ({ ...p, basePrice: e.target.value }))}
            className={i} placeholder="2500" />
        </div>

        <div>
          <label className={l}>Total rooms</label>
          <input type="number" min={1} value={f.totalRooms}
            onChange={(e) => setF((p) => ({ ...p, totalRooms: e.target.value }))}
            className={i} placeholder="5" />
        </div>

        {/* Guest limits block */}
        <div className={isInline ? "flex flex-col gap-1" : "rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2"}>
          {!isInline && <p className="text-xs font-semibold text-gray-500">Guest limits <span className="font-normal text-gray-400">(optional — used to filter rooms in WhatsApp flows)</span></p>}
          <div className={isInline ? "flex gap-2" : "grid grid-cols-3 gap-3"}>
            <div>
              <label className={l}>Max adults</label>
              <input type="number" min={0} value={f.maxAdults}
                onChange={(e) => setF((p) => ({ ...p, maxAdults: e.target.value }))}
                className={i} placeholder="2" />
            </div>
            <div>
              <label className={l}>Max children</label>
              <input type="number" min={0} value={f.maxChildren}
                onChange={(e) => setF((p) => ({ ...p, maxChildren: e.target.value }))}
                className={i} placeholder="1" />
            </div>
            <div>
              <label className={l}>Total capacity</label>
              <input type="number" min={1} value={f.capacity}
                onChange={(e) => setF((p) => ({ ...p, capacity: e.target.value }))}
                className={i} placeholder="3" />
            </div>
          </div>
          {!isInline && (
            <p className="text-[11px] text-gray-400">
              "Total capacity" is the sum of all guests. Adults + children is the preferred approach — the flow builder will filter rooms based on these values.
            </p>
          )}
        </div>
      </>
    );
  }

export default function RoomTypesPage() {
  const mounted = useMounted();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    apiFetch("/room-types").then(setRoomTypes).catch(console.error);
  }, [mounted]);

  function toPayload(f: typeof emptyForm) {
    return {
      name:      f.name,
      basePrice: Number(f.basePrice),
      ...(f.capacity    ? { capacity:    Number(f.capacity)    } : {}),
      ...(f.maxAdults   ? { maxAdults:   Number(f.maxAdults)   } : {}),
      ...(f.maxChildren ? { maxChildren: Number(f.maxChildren) } : {}),
      ...(f.totalRooms  ? { totalRooms:  Number(f.totalRooms)  } : {}),
    };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const created = await apiFetch("/room-types", { method: "POST", body: JSON.stringify(toPayload(form)) });
      setRoomTypes((prev) => [...prev, created]);
      setForm(emptyForm);
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to create room type.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(rt: RoomType) {
    setEditingId(rt.id);
    setEditForm({
      name:        rt.name,
      basePrice:   String(rt.basePrice),
      capacity:    rt.capacity    != null ? String(rt.capacity)    : "",
      maxAdults:   rt.maxAdults   != null ? String(rt.maxAdults)   : "",
      maxChildren: rt.maxChildren != null ? String(rt.maxChildren) : "",
      totalRooms:  rt.totalRooms  != null ? String(rt.totalRooms)  : "",
    });
    setEditError("");
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditError("");
    try {
      const updated = await apiFetch(`/room-types/${editingId}`, { method: "PUT", body: JSON.stringify(toPayload(editForm)) });
      setRoomTypes((prev) => prev.map((rt) => (rt.id === editingId ? updated : rt)));
      setEditingId(null);
    } catch (err: any) {
      setEditError(err.message || "Failed to update room type.");
    }
  }

  async function handleDelete(id: string) {
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2B0D3E]">Room Types</h1>
          <p className="text-xs text-gray-400 mt-0.5">Set adults/children limits so the WhatsApp flow builder can filter rooms by guest count.</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(""); }}
          className="px-4 py-2 rounded-lg bg-[#7A3F91] text-white text-sm font-medium hover:bg-[#2B0D3E] transition"
        >
          {showForm ? "Cancel" : "+ Add Room Type"}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-xl shadow p-6 max-w-lg">
          <h2 className="text-base font-semibold text-[#2B0D3E] mb-4">New Room Type</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <FormFields f={form} setF={setForm} />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" disabled={loading}
              className="mt-1 rounded-lg bg-[#7A3F91] px-4 py-2 text-sm font-medium text-white hover:bg-[#2B0D3E] transition disabled:opacity-50">
              {loading ? "Creating..." : "Create Room Type"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-[#F2EAF7]">
            <tr className="text-left text-[#2B0D3E]">
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Base Price</th>
              <th className="px-5 py-3 font-semibold">Adults</th>
              <th className="px-5 py-3 font-semibold">Children</th>
              <th className="px-5 py-3 font-semibold">Capacity</th>
              <th className="px-5 py-3 font-semibold">Total Rooms</th>
              <th className="px-5 py-3 font-semibold">Created</th>
              <th className="px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roomTypes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                  No room types yet. Add one above.
                </td>
              </tr>
            ) : (
              roomTypes.map((rt) =>
                editingId === rt.id ? (
                  <tr key={rt.id} className="border-b bg-[#F2EAF7]/50">
                    <td className="px-5 py-3" colSpan={8}>
                      <form onSubmit={handleUpdate} className="flex flex-wrap items-end gap-3">
                        <FormFields f={editForm} setF={setEditForm} isInline />
                        <div className="flex gap-2 self-end">
                          <button type="submit"
                            className="rounded-lg bg-[#7A3F91] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2B0D3E] transition">
                            Save
                          </button>
                          <button type="button" onClick={() => setEditingId(null)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
                            Cancel
                          </button>
                        </div>
                        {editError && <p className="w-full text-xs text-red-600 mt-1">{editError}</p>}
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={rt.id} className="border-b hover:bg-[#F2EAF7] transition">
                    <td className="px-5 py-3 font-medium text-[#2B0D3E]">{rt.name}</td>
                    <td className="px-5 py-3 text-[#7A3F91] font-semibold">₹{rt.basePrice.toLocaleString()}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {rt.maxAdults != null ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                          {rt.maxAdults} 👤
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {rt.maxChildren != null ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {rt.maxChildren} 👶
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{rt.capacity != null ? `${rt.capacity} total` : "—"}</td>
                    <td className="px-5 py-3 text-gray-600 font-medium">{rt.totalRooms}</td>
                    <td className="px-5 py-3 text-gray-500">{new Date(rt.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 flex gap-2">
                      <button onClick={() => startEdit(rt)}
                        className="px-3 py-1 text-xs rounded-lg border border-[#7A3F91] text-[#7A3F91] hover:bg-[#7A3F91] hover:text-white transition">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(rt.id)} disabled={deletingId === rt.id}
                        className="px-3 py-1 text-xs rounded-lg border border-red-400 text-red-500 hover:bg-red-500 hover:text-white transition disabled:opacity-50">
                        {deletingId === rt.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
