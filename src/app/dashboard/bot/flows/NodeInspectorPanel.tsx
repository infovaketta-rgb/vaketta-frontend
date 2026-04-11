"use client";

import { useCallback } from "react";
import type {
  FlowNode,
  BranchCondition,
  HotelContext,
  QuestionNodeData,
  CheckAvailabilityNodeData,
  ShowRoomsNodeData,
  ActionNodeData,
  JumpNodeData,
} from "./types";
import { SYSTEM_VARS } from "./NodePalette";

interface Props {
  node:         FlowNode | null;
  readOnly:     boolean;
  hotelCtx?:    HotelContext | null;
  definedVars?: string[];
  onChange:     (id: string, data: Record<string, unknown>) => void;
  onDelete:     (id: string) => void;
}

const OPERATORS: Record<string, string> = {
  equals:      "equals",
  not_equals:  "≠",
  contains:    "contains",
  starts_with: "starts with",
  gt:          ">",
  lt:          "<",
};

let _condId = 0;
function newCondId() { return `cond-${Date.now()}-${_condId++}`; }

// ── Small shared UI atoms ──────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
      {children}
    </label>
  );
}

function SectionBox({ title, color = "purple", children }: { title: string; color?: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    purple: "border-purple-100 bg-purple-50 text-purple-700",
    green:  "border-green-100  bg-green-50  text-green-700",
    teal:   "border-teal-100   bg-teal-50   text-teal-700",
    blue:   "border-blue-100   bg-blue-50   text-blue-700",
    amber:  "border-amber-100  bg-amber-50  text-amber-700",
    red:    "border-red-100    bg-red-50    text-red-700",
    gray:   "border-gray-200   bg-gray-50   text-gray-600",
  };
  return (
    <div className={`rounded-lg border p-2.5 space-y-2 ${colors[color] ?? colors["gray"]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}

function VarSelect({
  label, value, vars, onChange, disabled, required,
}: {
  label: string; value: string; vars: string[]; onChange: (v: string) => void;
  disabled?: boolean; required?: boolean;
}) {
  return (
    <div>
      <Label>{label}{required ? " *" : ""}</Label>
      <select
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7A3F91] disabled:bg-gray-50 disabled:text-gray-400"
      >
        <option value="">— not mapped —</option>
        {vars.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NodeInspectorPanel({
  node, readOnly, hotelCtx, definedVars = [], onChange, onDelete,
}: Props) {
  const inp = "w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7A3F91] disabled:bg-gray-50 disabled:text-gray-400";

  const set = useCallback(
    (patch: Record<string, unknown>) => {
      if (!node) return;
      onChange(node.id, { ...node.data, ...patch });
    },
    [node, onChange]
  );

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!node) {
    return (
      <div className="flex w-64 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-center text-xs text-gray-400 shadow-sm">
        <span className="text-2xl">👆</span>
        Click a node to inspect it
        {hotelCtx && (
          <div className="mt-3 w-full rounded-lg bg-purple-50 p-2 text-left text-[10px] text-purple-700 space-y-0.5">
            <p className="font-bold">{hotelCtx.hotelName}</p>
            <p>{hotelCtx.roomTypes.length} room type{hotelCtx.roomTypes.length !== 1 ? "s" : ""}</p>
            <p>{hotelCtx.bookingEnabled ? "✓ Booking enabled" : "✗ Booking disabled"}</p>
            {definedVars.length > 0 && (
              <p className="text-[9px] text-purple-500 pt-1">
                Vars: {definedVars.join(", ")}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  const varListId = `vars-${node.id}`;

  return (
    <div className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{node.type?.replace(/_/g, " ")}</p>
        {!readOnly && (
          <button
            onClick={() => onDelete(node.id)}
            className="rounded p-0.5 text-red-400 transition hover:bg-red-50"
            title="Delete node"
          >
            🗑
          </button>
        )}
      </div>

      {/* Hotel context badge */}
      {hotelCtx && (
        <div className="rounded-lg bg-purple-50 px-2 py-1.5 text-[10px] text-purple-700 leading-relaxed">
          <span className="font-bold">{hotelCtx.hotelName}</span>
          {" · "}{hotelCtx.roomTypes.length} room{hotelCtx.roomTypes.length !== 1 ? "s" : ""}
          {" · "}{hotelCtx.bookingEnabled ? "Booking ✓" : "Booking ✗"}
        </div>
      )}

      {/* Datalist for var autocomplete */}
      {definedVars.length > 0 && (
        <datalist id={varListId}>
          {definedVars.map((v) => <option key={v} value={v} />)}
        </datalist>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* start                                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {node.type === "start" && (
        <div>
          <Label>Label (optional)</Label>
          <input disabled={readOnly} className={inp} value={(node.data as any).label ?? ""}
            onChange={(e) => set({ label: e.target.value })} placeholder="Flow entry point" />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* message                                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {node.type === "message" && (
        <>
          <div>
            <Label>Message text</Label>
            <textarea disabled={readOnly} rows={4} className={`${inp} resize-none`}
              value={(node.data as any).text ?? ""}
              onChange={(e) => set({ text: e.target.value })}
              placeholder="What should the bot say?" />
          </div>
          <VarChipRow vars={definedVars} readOnly={readOnly}
            onInsert={(v) => set({ text: ((node.data as any).text ?? "") + `{{${v}}}` })} />
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* question                                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {node.type === "question" && (() => {
        const d = node.data as QuestionNodeData;
        const qt = d.questionType ?? "text";

        return (
          <>
            {/* Question type selector */}
            <div>
              <Label>Question type</Label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { v: "text",           l: "Text",    icon: "T" },
                  { v: "date",           l: "Date",    icon: "📅" },
                  { v: "number",         l: "Number",  icon: "#" },
                  { v: "yes_no",         l: "Yes/No",  icon: "Y/N" },
                  { v: "rating",         l: "Rating",  icon: "★" },
                  { v: "room_selection", l: "Room",    icon: "🏨" },
                ].map(({ v, l, icon }) => (
                  <button key={v} disabled={readOnly || (v === "room_selection" && !hotelCtx)}
                    onClick={() => set({ questionType: v, validation: "none", validationError: "" })}
                    title={v === "room_selection" ? "Legacy — use Show Rooms node instead" : l}
                    className={`rounded-lg py-1 text-[10px] font-semibold transition border ${
                      qt === v
                        ? "bg-[#7A3F91] border-[#7A3F91] text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-[#7A3F91] hover:text-[#7A3F91]"
                    } disabled:opacity-40`}
                  >
                    {icon}
                    <span className="ml-0.5">{l}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt text */}
            <div>
              <Label>Question prompt</Label>
              <textarea disabled={readOnly} rows={3} className={`${inp} resize-none`}
                value={d.text ?? ""} onChange={(e) => set({ text: e.target.value })}
                placeholder="What to ask the guest?" />
            </div>
            <VarChipRow vars={definedVars} readOnly={readOnly}
              onInsert={(v) => set({ text: (d.text ?? "") + `{{${v}}}` })} />

            {/* Variable name */}
            <div>
              <Label>Store answer as</Label>
              <input disabled={readOnly} className={inp} value={d.variableName ?? ""}
                list={varListId} onChange={(e) => set({ variableName: e.target.value })}
                placeholder="e.g. guestName" />
            </div>

            {/* ── type-specific options ── */}

            {qt === "text" && (
              <>
                <div>
                  <Label>Validation</Label>
                  <select disabled={readOnly} className={inp} value={d.validation ?? "none"}
                    onChange={(e) => set({ validation: e.target.value })}>
                    <option value="none">None</option>
                    <option value="date">Date</option>
                    <option value="number">Number</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                {d.validation !== "none" && (
                  <div>
                    <Label>Validation error message</Label>
                    <input disabled={readOnly} className={inp} value={d.validationError ?? ""}
                      onChange={(e) => set({ validationError: e.target.value })}
                      placeholder="Please enter a valid value." />
                  </div>
                )}
              </>
            )}

            {qt === "date" && (
              <SectionBox title="Date constraints" color="blue">
                <div>
                  <Label>Minimum date</Label>
                  <select disabled={readOnly} className={inp} value={d.dateMin ?? "none"}
                    onChange={(e) => set({ dateMin: e.target.value })}>
                    <option value="none">No minimum</option>
                    <option value="today">Today (reject past dates)</option>
                  </select>
                </div>
                <div>
                  <Label>Maximum days from today (0 = no max)</Label>
                  <input type="number" min={0} disabled={readOnly} className={inp}
                    value={d.dateMaxDays ?? ""} placeholder="e.g. 365"
                    onChange={(e) => set({ dateMaxDays: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div>
                  <Label>Validation error</Label>
                  <input disabled={readOnly} className={inp} value={d.validationError ?? ""}
                    onChange={(e) => set({ validationError: e.target.value })}
                    placeholder="Please enter a valid date." />
                </div>
              </SectionBox>
            )}

            {qt === "number" && (
              <SectionBox title="Number constraints" color="blue">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Min value</Label>
                    <input type="number" disabled={readOnly} className={inp} value={d.numberMin ?? ""}
                      onChange={(e) => set({ numberMin: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                  <div>
                    <Label>Max value</Label>
                    <input type="number" disabled={readOnly} className={inp} value={d.numberMax ?? ""}
                      onChange={(e) => set({ numberMax: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                </div>
                <div>
                  <Label>Validation error</Label>
                  <input disabled={readOnly} className={inp} value={d.validationError ?? ""}
                    onChange={(e) => set({ validationError: e.target.value })} placeholder="Please enter a valid number." />
                </div>
              </SectionBox>
            )}

            {qt === "yes_no" && (
              <SectionBox title="Yes / No labels" color="blue">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Yes label</Label>
                    <input disabled={readOnly} className={inp} value={d.yesLabel ?? ""}
                      onChange={(e) => set({ yesLabel: e.target.value })} placeholder="Yes" />
                  </div>
                  <div>
                    <Label>No label</Label>
                    <input disabled={readOnly} className={inp} value={d.noLabel ?? ""}
                      onChange={(e) => set({ noLabel: e.target.value })} placeholder="No" />
                  </div>
                </div>
                <p className="text-[10px] text-blue-500">
                  Stores <code className="bg-white px-0.5 rounded">yes</code> or <code className="bg-white px-0.5 rounded">no</code> in <em>{d.variableName || "variable"}</em>.
                  Use a Branch node to route on this value.
                </p>
              </SectionBox>
            )}

            {qt === "rating" && (
              <SectionBox title="Rating options" color="amber">
                <div>
                  <Label>Max stars (default 5)</Label>
                  <input type="number" min={2} max={10} disabled={readOnly} className={inp}
                    value={d.ratingMax ?? 5}
                    onChange={(e) => set({ ratingMax: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Positive threshold (e.g. 4 = show review link for 4+)</Label>
                  <input type="number" min={1} disabled={readOnly} className={inp}
                    value={d.ratingPositiveThreshold ?? ""}
                    placeholder="Leave blank to disable"
                    onChange={(e) => set({ ratingPositiveThreshold: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                {d.ratingPositiveThreshold && (
                  <div>
                    <Label>Review URL (shown on positive rating)</Label>
                    <input disabled={readOnly} className={inp} value={d.reviewUrl ?? ""}
                      onChange={(e) => set({ reviewUrl: e.target.value })}
                      placeholder="https://g.page/r/..." />
                  </div>
                )}
                <div>
                  <Label>Validation error</Label>
                  <input disabled={readOnly} className={inp} value={d.validationError ?? ""}
                    onChange={(e) => set({ validationError: e.target.value })}
                    placeholder={`Please rate from 1 to ${d.ratingMax ?? 5}.`} />
                </div>
                <p className="text-[10px] text-amber-600">
                  Also stores <code className="bg-white px-0.5 rounded">{d.variableName || "var"}_isPositive</code> as "yes"/"no" for branching.
                </p>
              </SectionBox>
            )}

            {qt === "room_selection" && (
              <>
                {hotelCtx && hotelCtx.roomTypes.length > 0 && (
                  <SectionBox title="Rooms shown at runtime" color="blue">
                    {hotelCtx.roomTypes.map((rt, i) => (
                      <div key={rt.id} className="flex justify-between text-[10px]">
                        <span>{i + 1}. {rt.name}</span>
                        <span className="text-gray-400">₹{rt.basePrice}/night</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-blue-400 pt-1 italic">
                      💡 Prefer the <strong>Show Rooms</strong> node — it supports availability filtering.
                    </p>
                  </SectionBox>
                )}
              </>
            )}
          </>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* check_availability                                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {node.type === "check_availability" && (() => {
        const d = node.data as CheckAvailabilityNodeData;
        return (
          <>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Reads three variables, checks live room availability, then routes to the
              <span className="text-green-600 font-semibold"> available</span> or
              <span className="text-red-500 font-semibold"> unavailable</span> output handle.
            </p>
            <SectionBox title="Variable mappings" color="teal">
              <VarSelect label="Room type ID var" value={d.roomTypeIdVar ?? ""} vars={definedVars} disabled={readOnly}
                onChange={(v) => set({ roomTypeIdVar: v })} required />
              <VarSelect label="Check-in date var" value={d.checkInVar ?? ""} vars={definedVars} disabled={readOnly}
                onChange={(v) => set({ checkInVar: v })} required />
              <VarSelect label="Check-out date var" value={d.checkOutVar ?? ""} vars={definedVars} disabled={readOnly}
                onChange={(v) => set({ checkOutVar: v })} required />
            </SectionBox>
            <div>
              <Label>Unavailable message (optional)</Label>
              <textarea disabled={readOnly} rows={2} className={`${inp} resize-none`}
                value={d.unavailableMessage ?? ""}
                onChange={(e) => set({ unavailableMessage: e.target.value })}
                placeholder="❌ Sorry, that room is fully booked for those dates." />
              <p className="mt-0.5 text-[10px] text-gray-400">Prepended to the unavailable branch output.</p>
            </div>
            <p className="text-[10px] text-teal-600">
              Also stores <code className="bg-teal-100 px-0.5 rounded">availabilityResult</code> ("available"/"unavailable") and <code className="bg-teal-100 px-0.5 rounded">availabilityCount</code> for use in Branch nodes.
            </p>
          </>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* show_rooms                                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {node.type === "show_rooms" && (() => {
        const d = node.data as ShowRoomsNodeData;
        const isAvailOnly = d.filter === "available_only";

        return (
          <>
            <div>
              <Label>Prompt text</Label>
              <textarea disabled={readOnly} rows={3} className={`${inp} resize-none`}
                value={d.text ?? ""} onChange={(e) => set({ text: e.target.value })}
                placeholder="Which room type would you like?" />
            </div>
            <VarChipRow vars={definedVars} readOnly={readOnly}
              onInsert={(v) => set({ text: (d.text ?? "") + `{{${v}}}` })} />

            <div>
              <Label>Room filter</Label>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
                {[
                  { v: "all",            l: "All rooms" },
                  { v: "available_only", l: "Available only" },
                ].map(({ v, l }) => (
                  <button key={v} disabled={readOnly}
                    onClick={() => set({ filter: v })}
                    className={`flex-1 py-1.5 font-medium transition ${
                      d.filter === v ? "bg-[#7A3F91] text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                    } disabled:opacity-60`}
                  >{l}</button>
                ))}
              </div>
            </div>

            {isAvailOnly && (
              <SectionBox title="Date variables (required for available-only filter)" color="teal">
                <VarSelect label="Check-in var" value={d.checkInVar ?? ""} vars={definedVars} disabled={readOnly}
                  onChange={(v) => set({ checkInVar: v })} required />
                <VarSelect label="Check-out var" value={d.checkOutVar ?? ""} vars={definedVars} disabled={readOnly}
                  onChange={(v) => set({ checkOutVar: v })} required />
              </SectionBox>
            )}

            <SectionBox title="Guest filter (leave 0 to skip)" color="gray">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Min capacity</Label>
                  <input type="number" min={0} disabled={readOnly} className={inp}
                    value={d.minCapacity ?? ""}
                    placeholder="Any"
                    onChange={(e) => set({ minCapacity: Number(e.target.value) || undefined })} />
                </div>
                <div>
                  <Label>Min adults</Label>
                  <input type="number" min={0} disabled={readOnly} className={inp}
                    value={d.minAdults ?? ""}
                    placeholder="Any"
                    onChange={(e) => set({ minAdults: Number(e.target.value) || undefined })} />
                </div>
                <div>
                  <Label>Min children</Label>
                  <input type="number" min={0} disabled={readOnly} className={inp}
                    value={d.minChildren ?? ""}
                    placeholder="Any"
                    onChange={(e) => set({ minChildren: Number(e.target.value) || undefined })} />
                </div>
              </div>
              <p className="text-[10px] text-gray-400">
                Only rooms whose <code className="bg-white px-0.5 rounded">maxAdults</code> / <code className="bg-white px-0.5 rounded">maxChildren</code> ≥ the minimum will be shown.
              </p>
            </SectionBox>

            <div>
              <Label>Store selection as (variable prefix)</Label>
              <input disabled={readOnly} className={inp} value={d.variableName ?? ""}
                onChange={(e) => set({ variableName: e.target.value })} placeholder="e.g. room" />
              {d.variableName && (
                <p className="mt-0.5 text-[10px] text-gray-400">
                  Stores: <code className="text-purple-600">{d.variableName}TypeId</code>,{" "}
                  <code className="text-purple-600">{d.variableName}TypeName</code>,{" "}
                  <code className="text-purple-600">{d.variableName}Price</code>,{" "}
                  <code className="text-purple-600">{d.variableName}MaxAdults</code>,{" "}
                  <code className="text-purple-600">{d.variableName}MaxChildren</code>
                </p>
              )}
            </div>

            <div>
              <Label>Validation error</Label>
              <input disabled={readOnly} className={inp} value={d.validationError ?? ""}
                onChange={(e) => set({ validationError: e.target.value })}
                placeholder="Please select a valid room number." />
            </div>

            {hotelCtx && hotelCtx.roomTypes.length > 0 && (
              <SectionBox title={`Preview (${hotelCtx.roomTypes.length} room types)`} color="blue">
                {hotelCtx.roomTypes.map((rt, i) => {
                  const guestInfo = rt.maxAdults
                    ? `${rt.maxAdults}A${rt.maxChildren ? `+${rt.maxChildren}C` : ""}`
                    : rt.capacity ? `${rt.capacity} guests` : null;
                  return (
                    <div key={rt.id} className="flex items-center justify-between text-[10px]">
                      <span className="font-medium">{i + 1}. {rt.name}</span>
                      <div className="flex gap-1.5 text-right">
                        {guestInfo && <span className="text-blue-500">{guestInfo}</span>}
                        <span className="text-gray-400">₹{rt.basePrice}/night</span>
                      </div>
                    </div>
                  );
                })}
                {isAvailOnly && <p className="text-[10px] text-teal-600 italic pt-1">Unavailable rooms hidden at runtime.</p>}
                <p className="text-[10px] text-gray-400">A = adults · C = children</p>
              </SectionBox>
            )}
          </>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* branch                                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {node.type === "branch" && (() => {
        const conditions: BranchCondition[] = (node.data as any).conditions ?? [];
        const defaultHandleId: string = (node.data as any).defaultHandleId ?? "default";

        function updateCond(idx: number, patch: Partial<BranchCondition>) {
          const updated = conditions.map((c, i) => i === idx ? { ...c, ...patch } : c);
          set({ conditions: updated, defaultHandleId });
        }

        return (
          <>
            {conditions.map((c, i) => (
              <div key={c.id} className="rounded-lg border border-yellow-200 bg-yellow-50 p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-yellow-500">Condition {i + 1}</span>
                  {!readOnly && (
                    <button onClick={() => set({ conditions: conditions.filter((_, j) => j !== i), defaultHandleId })}
                      className="text-red-400 text-xs">✕</button>
                  )}
                </div>
                <input disabled={readOnly} className={inp} placeholder="Label (shown on edge)"
                  value={c.label} onChange={(e) => updateCond(i, { label: e.target.value })} />
                <div>
                  <label className="block text-[9px] text-yellow-600 mb-0.5">Variable (left side)</label>
                  <input disabled={readOnly} className={inp} placeholder="e.g. confirm"
                    value={c.variable} list={varListId}
                    onChange={(e) => updateCond(i, { variable: e.target.value })} />
                </div>
                <select disabled={readOnly} className={inp} value={c.operator}
                  onChange={(e) => updateCond(i, { operator: e.target.value as any })}>
                  {Object.entries(OPERATORS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <div>
                  <label className="block text-[9px] text-yellow-600 mb-0.5">Compare value — type a literal or <code className="bg-yellow-100 px-0.5 rounded">{"{{anotherVar}}"}</code></label>
                  <input disabled={readOnly} className={inp} placeholder='e.g.  yes  or  {{roomTypeId}}'
                    value={c.compareValue} list={varListId}
                    onChange={(e) => updateCond(i, { compareValue: e.target.value })} />
                  {/* Quick-insert chips for defined vars */}
                  {definedVars.length > 0 && !readOnly && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {definedVars.map((v) => (
                        <button key={v} type="button"
                          onClick={() => updateCond(i, { compareValue: `{{${v}}}` })}
                          className="rounded bg-yellow-100 px-1 py-0.5 text-[9px] font-mono text-yellow-700 hover:bg-yellow-200 transition"
                        >{`{{${v}}}`}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!readOnly && (
              <button
                onClick={() => set({ conditions: [...conditions, { id: newCondId(), variable: "", operator: "equals", compareValue: "", label: "" }], defaultHandleId })}
                className="w-full rounded-lg border border-dashed border-yellow-300 py-1.5 text-xs text-yellow-600 transition hover:bg-yellow-50"
              >
                + Add condition
              </button>
            )}
            <p className="text-[10px] text-gray-400">Unmatched paths go to the default (gray) handle.</p>
            <p className="text-[10px] text-gray-400">
              Tip: use <code className="bg-gray-100 px-0.5 rounded text-purple-600">availabilityResult</code> to branch on check_availability output.
            </p>
          </>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* action                                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {node.type === "action" && (() => {
        const d = node.data as ActionNodeData;
        const at = d.actionType ?? "reset_to_menu";

        return (
          <>
            <div>
              <Label>Action type</Label>
              <select disabled={readOnly} className={inp} value={at}
                onChange={(e) => set({ actionType: e.target.value })}>
                <optgroup label="Booking">
                  <option value="create_booking">✅ Create Booking</option>
                  <option value="update_booking_status">🔄 Update Booking Status</option>
                </optgroup>
                <optgroup label="Communication">
                  <option value="set_variable">📝 Set Variable</option>
                  <option value="send_review_request">⭐ Send Review Request</option>
                  <option value="notify_staff">🔔 Notify Staff (keep flow)</option>
                  <option value="handoff_to_staff">👤 Handoff to Staff (end flow)</option>
                  <option value="reset_to_menu">🏠 Reset to Menu</option>
                </optgroup>
                <optgroup label="Legacy">
                  <option value="start_booking_flow">📅 Start Booking Flow (legacy)</option>
                </optgroup>
              </select>
            </div>

            {/* ── Shared: message before action ── */}
            <div>
              <Label>Message before action (optional)</Label>
              <textarea disabled={readOnly} rows={2} className={`${inp} resize-none`}
                value={d.message ?? ""} onChange={(e) => set({ message: e.target.value })}
                placeholder="Optional message sent before the action runs" />
              <VarChipRow vars={definedVars} readOnly={readOnly}
                onInsert={(v) => set({ message: (d.message ?? "") + `{{${v}}}` })} />
            </div>

            {/* ── create_booking ── */}
            {at === "create_booking" && (
              <>
                {hotelCtx && !hotelCtx.bookingEnabled && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1.5 text-[10px] text-amber-700">
                    ⚠ Booking is disabled for {hotelCtx.hotelName}. Enable in hotel settings first.
                  </div>
                )}
                <SectionBox title="Variable mappings *" color="green">
                  <VarSelect label="Guest name var *" value={d.guestNameVar ?? ""} vars={definedVars} disabled={readOnly}
                    onChange={(v) => set({ guestNameVar: v })} required />
                  <VarSelect label="Room type ID var * (from Show Rooms / Room pick)" value={d.roomTypeIdVar ?? ""} vars={definedVars} disabled={readOnly}
                    onChange={(v) => set({ roomTypeIdVar: v })} required />
                  <VarSelect label="Check-in date var *" value={d.checkInVar ?? ""} vars={definedVars} disabled={readOnly}
                    onChange={(v) => set({ checkInVar: v })} required />
                  <VarSelect label="Check-out date var *" value={d.checkOutVar ?? ""} vars={definedVars} disabled={readOnly}
                    onChange={(v) => set({ checkOutVar: v })} required />
                  <VarSelect label="Advance paid var (optional)" value={d.advancePaidVar ?? ""} vars={definedVars} disabled={readOnly}
                    onChange={(v) => set({ advancePaidVar: v || undefined })} />
                  <p className="text-[10px] text-green-500">
                    After booking: <code className="bg-white px-0.5 rounded text-purple-600">{"{{bookingRef}}"}</code> and <code className="bg-white px-0.5 rounded text-purple-600">{"{{bookingStatus}}"}</code> become available.
                  </p>
                </SectionBox>
              </>
            )}

            {/* ── update_booking_status ── */}
            {at === "update_booking_status" && (
              <SectionBox title="Booking status update" color="teal">
                <VarSelect label="Booking ref var (default: bookingRef)" value={d.bookingRefVar ?? ""} vars={["bookingRef", ...definedVars]} disabled={readOnly}
                  onChange={(v) => set({ bookingRefVar: v })} />
                <div>
                  <Label>New status *</Label>
                  <select disabled={readOnly} className={inp} value={d.newStatus ?? ""}
                    onChange={(e) => set({ newStatus: e.target.value as any })}>
                    <option value="">— choose —</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="HOLD">HOLD</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </SectionBox>
            )}

            {/* ── set_variable ── */}
            {at === "set_variable" && (
              <SectionBox title="Variable assignment" color="amber">
                <div>
                  <Label>Variable name *</Label>
                  <input disabled={readOnly} className={inp} value={d.variableToSet ?? ""}
                    onChange={(e) => set({ variableToSet: e.target.value })} placeholder="myVar" />
                </div>
                <div>
                  <Label>Value (supports {"{{interpolation}}"})</Label>
                  <input disabled={readOnly} className={inp} value={d.valueToSet ?? ""}
                    onChange={(e) => set({ valueToSet: e.target.value })}
                    placeholder={`Static value or {{otherVar}}`} />
                </div>
                <VarChipRow vars={definedVars} readOnly={readOnly}
                  onInsert={(v) => set({ valueToSet: (d.valueToSet ?? "") + `{{${v}}}` })} />
              </SectionBox>
            )}

            {/* ── send_review_request ── */}
            {at === "send_review_request" && (
              <SectionBox title="Review request" color="amber">
                <div>
                  <Label>Review URL (leave blank to use hotel setting)</Label>
                  <input disabled={readOnly} className={inp} value={d.reviewUrl ?? ""}
                    onChange={(e) => set({ reviewUrl: e.target.value })}
                    placeholder="https://g.page/r/..." />
                </div>
                <div>
                  <Label>Custom message (optional)</Label>
                  <textarea disabled={readOnly} rows={2} className={`${inp} resize-none`}
                    value={d.reviewMessage ?? ""}
                    onChange={(e) => set({ reviewMessage: e.target.value })}
                    placeholder="We'd love to hear about your stay!" />
                </div>
                <VarChipRow vars={definedVars} readOnly={readOnly}
                  onInsert={(v) => set({ reviewMessage: (d.reviewMessage ?? "") + `{{${v}}}` })} />
              </SectionBox>
            )}

            {/* ── notify_staff ── */}
            {at === "notify_staff" && (
              <p className="text-[10px] text-gray-500">
                Flags the guest as "handled by staff" (disables auto-reply) but keeps the flow running. Use <strong>Handoff to Staff</strong> to stop the flow and open a support thread.
              </p>
            )}

            {/* ── start_booking_flow (legacy) ── */}
            {at === "start_booking_flow" && (
              <>
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-2 py-1.5 text-[10px] text-amber-700">
                  ⚠ Legacy action. Use <strong>Create Booking</strong> + question nodes for new flows.
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" disabled={readOnly} checked={!!d.prefillFromVars}
                    onChange={(e) => set({ prefillFromVars: e.target.checked })}
                    className="rounded border-gray-300 text-[#7A3F91] focus:ring-[#7A3F91]" />
                  <span className="text-xs text-gray-700 font-medium">Pre-fill from collected vars</span>
                </label>
                {d.prefillFromVars && (
                  <SectionBox title="Pre-fill mappings" color="purple">
                    <VarSelect label="Guest name var" value={d.guestNameVar ?? ""} vars={definedVars} disabled={readOnly}
                      onChange={(v) => set({ guestNameVar: v })} />
                    <VarSelect label="Room type ID var" value={d.roomTypeIdVar ?? ""} vars={definedVars} disabled={readOnly}
                      onChange={(v) => set({ roomTypeIdVar: v })} />
                    <VarSelect label="Check-in date var" value={d.checkInVar ?? ""} vars={definedVars} disabled={readOnly}
                      onChange={(v) => set({ checkInVar: v })} />
                    <VarSelect label="Check-out date var" value={d.checkOutVar ?? ""} vars={definedVars} disabled={readOnly}
                      onChange={(v) => set({ checkOutVar: v })} />
                  </SectionBox>
                )}
              </>
            )}
          </>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* time_condition                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {node.type === "time_condition" && (
        <SectionBox title="How it works" color="blue">
          <p className="text-[10px] text-blue-700 leading-relaxed">
            Automatically reads the hotel's <strong>business hours</strong> and <strong>timezone</strong> from settings.
            Routes to one of three output handles on the right side of the node:
          </p>
          <div className="space-y-1 pt-1">
            {[
              { label: "business_hours", color: "text-green-600", desc: "Within configured start–end hours on weekdays" },
              { label: "after_hours",    color: "text-amber-600", desc: "Outside configured hours on weekdays"          },
              { label: "weekend",        color: "text-blue-600",  desc: "Saturday or Sunday"                           },
            ].map(({ label, color, desc }) => (
              <div key={label} className="flex items-start gap-1.5">
                <code className={`text-[10px] font-mono font-bold ${color}`}>{label}</code>
                <span className="text-[10px] text-blue-500">— {desc}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-blue-400 pt-1 italic">
            No configuration needed. If a handle has no edge, falls back to the first available output.
          </p>
        </SectionBox>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* jump                                                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {node.type === "jump" && (() => {
        const d = node.data as JumpNodeData;
        return (
          <>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Teleports execution to another node in this flow — useful for returning to a choice point or building loops.
            </p>
            <div>
              <Label>Target node ID *</Label>
              <input disabled={readOnly} className={inp} value={d.targetNodeId ?? ""}
                onChange={(e) => set({ targetNodeId: e.target.value })}
                placeholder="Paste a node ID from the canvas" />
              <p className="mt-0.5 text-[10px] text-gray-400">
                Click the target node and copy its ID from the URL or node header.
              </p>
            </div>
            <div>
              <Label>Canvas label (optional)</Label>
              <input disabled={readOnly} className={inp} value={d.label ?? ""}
                onChange={(e) => set({ label: e.target.value })}
                placeholder="e.g. Back to menu" />
            </div>
            <div className="rounded-lg border border-violet-100 bg-violet-50 p-2 text-[10px] text-violet-700">
              ⚠ Jumps count as hops. The MAX_HOPS=30 guard prevents infinite loops.
            </div>
          </>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* show_menu                                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {node.type === "show_menu" && (
        <SectionBox title="How it works" color="purple">
          <p className="text-[10px] text-purple-700 leading-relaxed">
            Emits the hotel's formatted WhatsApp menu — the same output as the default menu message.
          </p>
          <p className="text-[10px] text-purple-500 leading-relaxed">
            Use this node to embed the menu inside a larger flow. For example: greet the guest → check time → show menu.
          </p>
          <p className="text-[10px] text-purple-400 italic">
            Connect to an <strong>End</strong> node after this to close the flow, or leave it as the last node.
          </p>
        </SectionBox>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* System variables reference                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <SectionBox title="System Variables" color="gray">
        <p className="text-[10px] text-gray-500 mb-1">Available in every text field via <code className="bg-white px-0.5 rounded text-purple-600">{"{{name}}"}</code></p>
        {SYSTEM_VARS.map(({ name, desc }) => (
          <div key={name} className="flex items-center justify-between gap-1">
            <code className="text-[10px] font-mono text-purple-600">{`{{${name}}}`}</code>
            <span className="text-[9px] text-gray-400">{desc}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(`{{${name}}}`).catch(() => {})}
              className="text-[9px] rounded bg-purple-50 px-1 py-0.5 text-purple-500 hover:bg-purple-100 transition"
            >copy</button>
          </div>
        ))}
      </SectionBox>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* end                                                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {node.type === "end" && (
        <>
          <div>
            <Label>Farewell message (optional)</Label>
            <textarea disabled={readOnly} rows={4} className={`${inp} resize-none`}
              value={(node.data as any).farewellText ?? ""}
              onChange={(e) => set({ farewellText: e.target.value })}
              placeholder="Thanks for chatting! Have a great day 😊" />
          </div>
          <VarChipRow vars={definedVars} readOnly={readOnly}
            onInsert={(v) => set({ farewellText: ((node.data as any).farewellText ?? "") + `{{${v}}}` })} />
          {definedVars.length > 0 && (
            <p className="text-[10px] text-gray-400">
              Available: {definedVars.map(v => (
                <code key={v} className="text-purple-600 bg-gray-50 px-0.5 rounded">{`{{${v}}}`}</code>
              )).reduce<React.ReactNode[]>((a, el, i) => i ? [...a, ", ", el] : [el], [])}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Helper: clickable var chips to insert {{var}} into text ───────────────────
function VarChipRow({ vars, readOnly, onInsert }: {
  vars: string[]; readOnly: boolean; onInsert: (v: string) => void;
}) {
  if (!vars.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {vars.map((v) => (
        <button key={v} disabled={readOnly}
          onClick={() => onInsert(v)}
          className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-purple-600 hover:bg-purple-50 transition disabled:opacity-40"
          title={`Insert {{${v}}}`}
        >
          {`{{${v}}}`}
        </button>
      ))}
    </div>
  );
}
