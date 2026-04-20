"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

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
  description: string | null;
  createdAt: string;
  photos: RoomPhoto[];
};

export default function RoomTypeDetailPage() {
  const mounted = useMounted();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "", basePrice: "", capacity: "", maxAdults: "", maxChildren: "", totalRooms: "", description: "",
  });

  useEffect(() => {
    if (!mounted || !id) return;
    apiFetch(`/room-types/${id}`)
      .then((rt: RoomType) => {
        setRoomType(rt);
        setForm({
          name:        rt.name,
          basePrice:   String(rt.basePrice),
          capacity:    rt.capacity    != null ? String(rt.capacity)    : "",
          maxAdults:   rt.maxAdults   != null ? String(rt.maxAdults)   : "",
          maxChildren: rt.maxChildren != null ? String(rt.maxChildren) : "",
          totalRooms:  String(rt.totalRooms),
          description: rt.description ?? "",
        });
      })
      .catch(() => setError("Failed to load room type"))
      .finally(() => setLoading(false));
  }, [mounted, id]);

  async function handleSave() {
    if (!roomType) return;
    setSaving(true); setSaved(false); setError("");
    try {
      const updated = await apiFetch(`/room-types/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name:      form.name,
          basePrice: Number(form.basePrice),
          ...(form.capacity    ? { capacity:    Number(form.capacity)    } : {}),
          ...(form.maxAdults   ? { maxAdults:   Number(form.maxAdults)   } : {}),
          ...(form.maxChildren ? { maxChildren: Number(form.maxChildren) } : {}),
          ...(form.totalRooms  ? { totalRooms:  Number(form.totalRooms)  } : {}),
          ...(form.description ? { description: form.description         } : {}),
        }),
      });
      setRoomType((prev) => prev ? { ...prev, ...updated } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadPhoto(file: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("File too large. Max 10MB."); return; }
    if (!file.type.startsWith("image/")) { setError("Only image files allowed."); return; }

    setUploadingPhoto(true); setError("");
    try {
      const token = localStorage.getItem("TOKEN");
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`${API_BASE}/room-types/${id}/photos`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setRoomType((prev) => prev ? { ...prev, photos: [...prev.photos, data] } : prev);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    setDeletingPhotoId(photoId);
    try {
      await apiFetch(`/room-types/${id}/photos/${photoId}`, { method: "DELETE" });
      setRoomType((prev) => prev ? { ...prev, photos: prev.photos.filter((p) => p.id !== photoId) } : prev);
    } catch (err: any) {
      setError(err.message || "Delete failed");
    } finally {
      setDeletingPhotoId(null);
    }
  }

  async function handleSetMain(photoId: string) {
    try {
      await apiFetch(`/room-types/${id}/photos/${photoId}/main`, { method: "PATCH" });
      setRoomType((prev) => prev ? {
        ...prev,
        photos: prev.photos.map((p) => ({ ...p, isMain: p.id === photoId })),
      } : prev);
    } catch (err: any) {
      setError(err.message || "Failed to set main photo");
    }
  }

  function handleDragStart(photoId: string) {
    setDraggedPhotoId(photoId);
  }

  async function handleDrop(targetPhotoId: string) {
    if (!draggedPhotoId || draggedPhotoId === targetPhotoId || !roomType) return;

    const photos = [...roomType.photos];
    const fromIndex = photos.findIndex((p) => p.id === draggedPhotoId);
    const toIndex = photos.findIndex((p) => p.id === targetPhotoId);
    const [moved] = photos.splice(fromIndex, 1);
    photos.splice(toIndex, 0, moved!);

    const reordered = photos.map((p, i) => ({ ...p, order: i }));
    setRoomType((prev) => prev ? { ...prev, photos: reordered } : prev);
    setDraggedPhotoId(null);

    try {
      await apiFetch(`/room-types/${id}/photos/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ photoIds: reordered.map((p) => p.id) }),
      });
    } catch (err) {
      console.error("Reorder failed", err);
    }
  }

  const inp = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]";
  const lbl = "block text-xs font-medium text-gray-600 mb-1";

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-[#7A3F91]" />
    </div>
  );

  if (!roomType) return (
    <div className="p-8 text-sm text-red-500">Room type not found.</div>
  );

  return (
    <div className="p-8 h-full overflow-y-auto max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push("/dashboard/room-types")}
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#2B0D3E]">{roomType.name}</h1>
          <p className="text-xs text-gray-400">Edit room details and manage photos</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#7A3F91] text-white text-sm font-medium hover:bg-[#2B0D3E] transition disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left — Details form */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#2B0D3E]">Room Details</h2>

            <div>
              <label className={lbl}>Room Name *</label>
              <input type="text" value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className={inp} placeholder="e.g. Deluxe Sea View Room" />
            </div>

            <div>
              <label className={lbl}>Description</label>
              <textarea rows={3} value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className={inp} placeholder="Describe the room — amenities, view, size..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Base Price (₹/night) *</label>
                <input type="number" min={0} value={form.basePrice}
                  onChange={(e) => setForm((p) => ({ ...p, basePrice: e.target.value }))}
                  className={inp} placeholder="3000" />
              </div>
              <div>
                <label className={lbl}>Total Rooms</label>
                <input type="number" min={1} value={form.totalRooms}
                  onChange={(e) => setForm((p) => ({ ...p, totalRooms: e.target.value }))}
                  className={inp} placeholder="4" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-[#2B0D3E]">Guest Limits</h2>
              <p className="text-xs text-gray-400 mt-0.5">Used by WhatsApp flow builder to filter rooms by guest count</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Max Adults</label>
                <input type="number" min={0} value={form.maxAdults}
                  onChange={(e) => setForm((p) => ({ ...p, maxAdults: e.target.value }))}
                  className={inp} placeholder="2" />
              </div>
              <div>
                <label className={lbl}>Max Children</label>
                <input type="number" min={0} value={form.maxChildren}
                  onChange={(e) => setForm((p) => ({ ...p, maxChildren: e.target.value }))}
                  className={inp} placeholder="1" />
              </div>
              <div>
                <label className={lbl}>Total Capacity</label>
                <input type="number" min={1} value={form.capacity}
                  onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                  className={inp} placeholder="3" />
              </div>
            </div>
          </div>
        </div>

        {/* Right — Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#2B0D3E]">Room Photos</h2>
              <p className="text-xs text-gray-400 mt-0.5">First photo shown in WhatsApp carousel. Drag to reorder.</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7A3F91] text-white text-xs font-medium hover:bg-[#2B0D3E] transition disabled:opacity-50">
              {uploadingPhoto ? (
                <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />Uploading...</>
              ) : (
                <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>Add Photo</>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadPhoto(f); e.target.value = ""; }} />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleUploadPhoto(file);
            }}
            className={`border-2 border-dashed rounded-xl p-4 text-center transition ${
              dragOver ? "border-[#7A3F91] bg-purple-50" : "border-gray-200"
            }`}>
            <p className="text-xs text-gray-400">Drop images here or click Add Photo</p>
          </div>

          {/* Photo grid */}
          {roomType.photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg className="w-10 h-10 text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs text-gray-400">No photos yet — upload to enable WhatsApp carousel</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {roomType.photos
                .sort((a, b) => a.order - b.order)
                .map((photo) => (
                  <div key={photo.id}
                    draggable
                    onDragStart={() => handleDragStart(photo.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(photo.id)}
                    className={`relative rounded-xl overflow-hidden group cursor-grab active:cursor-grabbing border-2 transition ${
                      photo.isMain ? "border-[#7A3F91]" : "border-transparent hover:border-gray-200"
                    } ${draggedPhotoId === photo.id ? "opacity-50" : ""}`}>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="Room photo"
                      className="w-full h-28 object-cover" />

                    {/* Main badge */}
                    {photo.isMain && (
                      <div className="absolute top-1.5 left-1.5 bg-[#7A3F91] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        MAIN
                      </div>
                    )}

                    {/* Drag handle */}
                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition">
                      <div className="bg-black/40 rounded p-0.5">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 6h2v2H8zm0 4h2v2H8zm0 4h2v2H8zm6-8h2v2h-2zm0 4h2v2h-2zm0 4h2v2h-2z"/>
                        </svg>
                      </div>
                    </div>

                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-end justify-center gap-1.5 pb-2 opacity-0 group-hover:opacity-100">
                      {!photo.isMain && (
                        <button
                          onClick={() => handleSetMain(photo.id)}
                          className="bg-white text-[#7A3F91] text-[10px] font-semibold px-2 py-1 rounded-full hover:bg-purple-50 transition"
                          title="Set as main photo">
                          Set Main
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        disabled={deletingPhotoId === photo.id}
                        className="bg-red-500 text-white text-[10px] font-semibold px-2 py-1 rounded-full hover:bg-red-600 transition disabled:opacity-50"
                        title="Delete photo">
                        {deletingPhotoId === photo.id ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}