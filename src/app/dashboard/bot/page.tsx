"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";
import { useToastStore } from "@/store/toastStore";
import type { FlowSummary } from "./flows/types";

// ── types ──────────────────────────────────────────────────────────────────

type MenuItemType = "INFO" | "BOOKING" | "ENQUIRY" | "FLOW";

type MenuItem = {
  id: string;
  key: string;
  label: string;
  replyText: string;
  type: MenuItemType;
  order: number;
  isActive: boolean;
  flowId?: string | null;
};

type RoomType = {
  id: string;
  name: string;
  basePrice: number;
  capacity: number | null;
  description: string | null;
};

type Config = {
  autoReplyEnabled: boolean;
  bookingEnabled: boolean;
  bookingFlowId: string | null;
  menuFlowId: string | null;
  aiEnabled: boolean;
  businessStartHour: number;
  businessEndHour: number;
  allDay: boolean;
  timezone: string;
  defaultLanguage: string;
  welcomeMessage: string;
  nightMessage: string;
  botMessages: Record<string, string>;
};

type Settings = {
  id: string;
  name: string;
  phone: string;
  config: Config | null;
  menu: { id: string; title: string; items: MenuItem[] } | null;
};

type FlowStep = {
  from: "bot" | "guest";
  message: string | null;     // display text (may be composed with system parts)
  label?: string;
  editKey?: string;            // botMessages key to save to
  editItemId?: string;         // menuItem id (saves to replyText)
  editValue?: string;          // raw value to put in textarea (NOT the full composed message)
};

// ── Default booking flow template ──────────────────────────────────────────
function buildDefaultBookingFlow() {
  const ids = {
    start:    "n-start",
    name:     "n-name",
    room:     "n-room",
    checkIn:  "n-checkin",
    checkOut: "n-checkout",
    summary:  "n-summary",
    confirm:  "n-confirm",
    branch:   "n-branch",
    create:   "n-create",
    endOk:    "n-end-ok",
    endNo:    "n-end-no",
  };

  const condYes = "cond-yes";
  const condDefault = "cond-default";

  const nodes = [
    { id: ids.start,   type: "start",      position: { x: 300, y: 20  }, data: { label: "Booking Start" } },
    { id: ids.name,    type: "question",   position: { x: 300, y: 120 }, data: { text: "Let's get you booked in! What is your *full name*?", questionType: "text", variableName: "guestName", validation: "none", validationError: "Please enter your full name." } },
    { id: ids.checkIn, type: "question",   position: { x: 300, y: 260 }, data: { text: "What is your *check-in date*? (DD/MM/YYYY)", questionType: "date", variableName: "checkIn", dateMin: "today", validationError: "Please enter a valid future date in DD/MM/YYYY format." } },
    { id: ids.checkOut,type: "question",   position: { x: 300, y: 400 }, data: { text: "What is your *check-out date*? (DD/MM/YYYY)", questionType: "date", variableName: "checkOut", validationError: "Please enter a valid date in DD/MM/YYYY format." } },
    { id: ids.room,    type: "show_rooms", position: { x: 300, y: 540 }, data: { text: "Which room type would you like?", filter: "available_only", checkInVar: "checkIn", checkOutVar: "checkOut", variableName: "room", validationError: "Please reply with a valid number." } },
    { id: ids.summary, type: "message",    position: { x: 300, y: 700 }, data: { text: "📋 *Booking Summary*\n\nName: *{{guestName}}*\nRoom: *{{roomTypeName}}*\nCheck-in: *{{checkIn}}*\nCheck-out: *{{checkOut}}*\nPrice: *₹{{roomPrice}}/night*" } },
    { id: ids.confirm, type: "question",   position: { x: 300, y: 860 }, data: { text: "Reply *YES* to confirm your booking or *NO* to cancel.", questionType: "yes_no", variableName: "confirm", yesLabel: "Confirm", noLabel: "Cancel", validationError: "" } },
    { id: ids.branch,  type: "branch",     position: { x: 300, y: 1010}, data: { conditions: [{ id: condYes, variable: "confirm", operator: "equals", compareValue: "yes", label: "YES" }], defaultHandleId: condDefault } },
    { id: ids.create,  type: "action",     position: { x: 120, y: 1160}, data: { actionType: "create_booking", guestNameVar: "guestName", roomTypeIdVar: "roomTypeId", checkInVar: "checkIn", checkOutVar: "checkOut" } },
    { id: ids.endOk,   type: "end",        position: { x: 120, y: 1310}, data: { farewellText: "✅ Booking request received! Reference: *{{bookingRef}}*\n\nThank you, {{guestName}}! We'll confirm shortly." } },
    { id: ids.endNo,   type: "end",        position: { x: 480, y: 1160}, data: { farewellText: "Booking cancelled. Reply *MENU* to see our options." } },
  ];

  const edges = [
    { id: "e1",  source: ids.start,   target: ids.name },
    { id: "e2",  source: ids.name,    target: ids.room },
    { id: "e3",  source: ids.room,    target: ids.checkIn },
    { id: "e4",  source: ids.checkIn, target: ids.checkOut },
    { id: "e5",  source: ids.checkOut,target: ids.summary },
    { id: "e6",  source: ids.summary, target: ids.confirm },
    { id: "e7",  source: ids.confirm, target: ids.branch },
    { id: "e8",  source: ids.branch,  target: ids.create,  sourceHandle: condYes },
    { id: "e9",  source: ids.branch,  target: ids.endNo,   sourceHandle: condDefault },
    { id: "e10", source: ids.create,  target: ids.endOk },
  ];

  return {
    name: "Booking Flow",
    description: "Default multi-step booking flow — customise in canvas",
    nodes,
    edges,
    isActive: true,
    isTemplate: false,
  };
}

// ── constants ──────────────────────────────────────────────────────────────

const TIMEZONES = [
  "UTC","Asia/Kolkata","Asia/Dubai","Asia/Singapore","Asia/Bangkok",
  "Asia/Tokyo","Asia/Shanghai","Asia/Karachi","Asia/Dhaka",
  "Europe/London","Europe/Paris","Europe/Berlin",
  "America/New_York","America/Chicago","America/Los_Angeles",
  "Australia/Sydney","Pacific/Auckland",
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi"   },
  { value: "ar", label: "Arabic"  },
  { value: "fr", label: "French"  },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German"  },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`,
}));

const BOT_MSG_META: Record<string, { label: string; hint: string; placeholder: string }> = {
  menuGreeting: {
    label: "Menu — Greeting line",
    hint: "First line of the main menu. Hotel name is used by default.",
    placeholder: "Welcome to *our hotel*! 🏨",
  },
  menuFooter: {
    label: "Menu — Footer instructions",
    hint: "Instructions shown below the menu items list.",
    placeholder: "Reply with the number of your choice.\n_Type *MENU* anytime to return here._",
  },
  bookingStart: {
    label: "Booking — Name prompt",
    hint: "Shown right after a guest picks a BOOKING option. Prompts for their full name.",
    placeholder: "Let's get you booked in! Please enter your *full name* as it should appear on the reservation.",
  },
  bookingUnavailable: {
    label: "Booking — Unavailable",
    hint: "Shown when booking is disabled or no room types exist.",
    placeholder: "Room booking is currently unavailable online. Please contact us directly.",
  },
  bookingNoRooms: {
    label: "Booking — No rooms",
    hint: "Shown when no room types are configured.",
    placeholder: "Sorry, we have no rooms available at the moment.\n\nPlease contact us directly for assistance.",
  },
  bookingRoomNote: {
    label: "Booking — Room list footer",
    hint: "Instructions shown at the bottom of the room-type list.",
    placeholder: "Reply with a number (1–N).\n_Reply *0* to cancel._",
  },
  bookingCheckInText: {
    label: "Booking — Check-in prompt",
    hint: "Body of the check-in date request sent after guest picks a room.",
    placeholder: "Please enter your check-in date:\n\n*DD/MM/YYYY*  _(e.g. 15/06/2026)_\n\n_Reply *0* to cancel._",
  },
  bookingCheckOutText: {
    label: "Booking — Check-out prompt",
    hint: "Body of the check-out date request sent after check-in is accepted.",
    placeholder: "When will you be checking out?\n\n*DD/MM/YYYY*  _(must be after 15 June 2026)_\n\n_Reply *0* to cancel._",
  },
  bookingSummaryNote: {
    label: "Booking — Summary note",
    hint: "Footer text shown below the booking summary, before guest confirms.",
    placeholder: "_Final amount confirmed at check-in._\n\nReply *YES* to confirm or *NO* to cancel.",
  },
  bookingSuccess: {
    label: "Booking — Confirmed body",
    hint: "Shown after guest replies YES. Reference number is automatically prepended.",
    placeholder: "Our team will review and confirm your booking shortly. You'll receive a message here once approved.\n\n*What happens next?*\n• We'll confirm availability within a few hours\n• You'll receive confirmation with payment details",
  },
  bookingCancel: {
    label: "Booking — Cancelled",
    hint: "Shown when guest cancels mid-booking (replies 0, NO, or CANCEL).",
    placeholder: "❌ Booking cancelled.\n\n_Reply *MENU* to see our services._",
  },
  enquiryDefault: {
    label: "Enquiry — Default opening",
    hint: "Fallback opening when an ENQUIRY item has no custom reply text.",
    placeholder: "Our team will assist you shortly. Please share your query and we'll respond as soon as possible.",
  },
  menuFallback: {
    label: "Menu — Fallback message",
    hint: "Shown if this hotel has no menu configured at all.",
    placeholder: "Reply *MENU* to see our options.",
  },
};

const TYPE_COLOR: Record<MenuItemType, string> = {
  INFO:    "bg-gray-100 text-gray-600 border-gray-200",
  BOOKING: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ENQUIRY: "bg-blue-50 text-blue-700 border-blue-200",
  FLOW:    "bg-purple-50 text-purple-700 border-purple-200",
};
const TYPE_LABEL: Record<MenuItemType, string> = { INFO: "Info", BOOKING: "Booking", ENQUIRY: "Enquiry", FLOW: "Flow" };
const TYPE_DOT:   Record<MenuItemType, string> = { INFO: "bg-gray-400", BOOKING: "bg-emerald-500", ENQUIRY: "bg-blue-500", FLOW: "bg-purple-500" };

const DIVIDER = "━━━━━━━━━━━━━━━━";

function fmtHour(h: number) {
  if (h === 0)  return "12:00 AM";
  if (h < 12)   return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

function getMsg(botMsgs: Record<string, string>, key: string): string {
  return botMsgs[key]?.trim() ? botMsgs[key] : BOT_MSG_META[key]?.placeholder ?? "";
}

// ── flow builders ──────────────────────────────────────────────────────────

function buildMenuText(hotelName: string, menuTitle: string, items: MenuItem[], botMsgs: Record<string, string> = {}): string {
  const active = items.filter((i) => i.isActive);
  if (!active.length) return "_No active menu items yet._";
  const defaultGreeting = `Welcome to *${hotelName || "our hotel"}*! 🏨`;
  const greeting = botMsgs["menuGreeting"]?.trim() || defaultGreeting;
  const footer   = botMsgs["menuFooter"]?.trim() || `Reply with the number of your choice.\n_Type *MENU* anytime to return here._`;
  let t = `${greeting}\n\n*${menuTitle || "How can we help you?"}*\n\n${DIVIDER}\n`;
  for (const item of active) {
    const icon = item.type === "BOOKING" ? "📅" : item.type === "ENQUIRY" ? "💬" : item.type === "FLOW" ? "🔀" : "ℹ️";
    t += `*${item.key}.* ${item.label}  ${icon}\n`;
  }
  t += `${DIVIDER}\n\n${footer}`;
  return t;
}

function buildBookingFlow(item: MenuItem, rooms: RoomType[], botMsgs: Record<string, string>): FlowStep[] {
  const startMsg      = getMsg(botMsgs, "bookingStart");
  const successMsg    = getMsg(botMsgs, "bookingSuccess");
  const roomNote      = getMsg(botMsgs, "bookingRoomNote");
  const checkInText   = getMsg(botMsgs, "bookingCheckInText");
  const checkOutText  = getMsg(botMsgs, "bookingCheckOutText");
  const summaryNote   = getMsg(botMsgs, "bookingSummaryNote");
  const opener        = item.replyText ? item.replyText : `📝 *Room Booking*\n\n${startMsg}`;

  let roomList = `Thanks, *John Smith*! 🏨\n\nPlease choose a room type:\n\n${DIVIDER}\n`;
  if (rooms.length) {
    rooms.forEach((r, i) => {
      roomList += `*${i + 1}.* ${r.name} — ₹${r.basePrice.toLocaleString("en-IN")}/night\n`;
      const parts: string[] = [];
      if (r.capacity) parts.push(`Fits ${r.capacity} guest${r.capacity > 1 ? "s" : ""}`);
      if (r.description) parts.push(r.description.length > 50 ? r.description.slice(0, 47) + "…" : r.description);
      if (parts.length) roomList += `     _${parts.join(" · ")}_\n`;
    });
  } else {
    roomList += `_No rooms configured yet — add Room Types first_\n`;
  }
  roomList += `${DIVIDER}\n\n${roomNote}`;

  const room0Name = rooms[0]?.name || "Deluxe Room";
  const room0Price = rooms[0]?.basePrice || 3000;

  return [
    { from: "guest", message: `*${item.key}*`, label: `Guest selects "${item.label}"` },
    { from: "bot",   message: `${opener}\n\n_Reply *0* to cancel at any time._`,
      editItemId: item.replyText ? item.id : undefined,
      editKey:    item.replyText ? undefined : "bookingStart",
      editValue:  item.replyText ? item.replyText : startMsg },
    { from: "guest", message: "John Smith", label: "Guest enters full name" },
    { from: "bot",   message: roomList, label: "Room list — from your Room Types",
      editKey: "bookingRoomNote", editValue: roomNote },
    { from: "guest", message: "1", label: "Guest selects a room" },
    { from: "bot",   message: `✅ *${room0Name}* selected!\n\n📅 *Check-in date*\n${checkInText}`,
      editKey: "bookingCheckInText", editValue: checkInText },
    { from: "guest", message: "15/06/2026", label: "Guest enters check-in date" },
    { from: "bot",   message: `✅ Check-in: *15 June 2026*\n\n📅 *Check-out date*\n${checkOutText}`,
      editKey: "bookingCheckOutText", editValue: checkOutText },
    { from: "guest", message: "18/06/2026", label: "Guest enters check-out date" },
    { from: "bot",   message: `📋 *Booking Summary*\n\n${DIVIDER}\n👤 *Guest:* John Smith\n🏨 *Room:* ${room0Name}\n📅 *Check-in:* 15 June 2026\n📅 *Check-out:* 18 June 2026\n🌙 *Duration:* 3 nights\n💰 *Estimated Total:* ₹${(room0Price * 3).toLocaleString("en-IN")}\n${DIVIDER}\n\n${summaryNote}`,
      editKey: "bookingSummaryNote", editValue: summaryNote },
    { from: "guest", message: "YES", label: "Guest confirms" },
    { from: "bot",   message: `✅ *Booking Request Received!*\n\n*Reference:* #A1B2C3D4\n\n${successMsg}\n\n_Reply *MENU* for other services._`,
      editKey: "bookingSuccess", editValue: successMsg },
  ];
}

function buildEnquiryFlow(item: MenuItem, botMsgs: Record<string, string>): FlowStep[] {
  const enquiryMsg = item.replyText || getMsg(botMsgs, "enquiryDefault");
  return [
    { from: "guest", message: `*${item.key}*`, label: `Guest selects "${item.label}"` },
    { from: "bot",   message: `${enquiryMsg}\n\n_Reply *MENU* at any time to return to the main menu._`,
      editItemId: item.replyText ? item.id : undefined,
      editKey:    item.replyText ? undefined : "enquiryDefault",
      editValue:  item.replyText ? item.replyText : enquiryMsg },
    { from: "guest", message: "Hello, I'd like to enquire about room rates.", label: "Guest sends their query" },
    { from: "bot",   message: null, label: "🔕 Bot is silent — staff responds from Chats" },
  ];
}

function buildInfoFlow(item: MenuItem): FlowStep[] {
  return [
    { from: "guest", message: `*${item.key}*`, label: `Guest selects "${item.label}"` },
    { from: "bot",   message: `${item.replyText || "_No reply text — edit this item_"}\n\n_Reply *MENU* for other options._`,
      editItemId: item.id, editValue: item.replyText },
  ];
}

// ── tiny UI ────────────────────────────────────────────────────────────────

const inp = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]";

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${enabled ? "bg-[#7A3F91]" : "bg-gray-200"}`}>
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${enabled ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function SaveBtn({ saving, saved, onSave, label = "Save" }: { saving: boolean; saved: boolean; onSave: () => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      {saved && (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>Saved
        </span>
      )}
      <button onClick={onSave} disabled={saving}
        className="rounded-lg bg-[#7A3F91] px-4 py-2 text-sm font-medium text-white hover:bg-[#2B0D3E] transition disabled:opacity-50">
        {saving ? "Saving…" : label}
      </button>
    </div>
  );
}

// ── inline-editable bot bubble ─────────────────────────────────────────────

function BotBubble({
  message, canEdit, editValue, onSave,
}: {
  message: string | null;
  canEdit?: boolean;
  editValue?: string;           // raw value to edit (NOT the composed display message)
  onSave?: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  function startEdit() {
    // Use editValue (the raw editable portion) if provided, otherwise fall back to message
    setDraft(editValue ?? message ?? "");
    setEditing(true);
    setTimeout(() => taRef.current?.focus(), 50);
  }

  async function commitEdit() {
    if (!onSave) return;
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  }

  if (message === null) {
    return (
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs">🔕</div>
        <div className="rounded-2xl rounded-tl-sm border border-dashed border-gray-300 bg-gray-50 px-4 py-2.5 text-xs text-gray-400 italic">
          Bot is silent — staff takes over in Chats
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7A3F91] text-[10px] font-bold text-white">Bot</div>
      <div className="group relative flex-1 max-w-sm">
        {editing ? (
          <div className="rounded-2xl rounded-tl-sm border-2 border-[#7A3F91]/40 bg-white shadow-sm overflow-hidden">
            <textarea
              ref={taRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={Math.max(4, draft.split("\n").length + 1)}
              className="w-full resize-none px-4 py-3 text-xs font-mono text-gray-800 leading-relaxed focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-3 py-2">
              <button onClick={() => setEditing(false)}
                className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 transition">
                Cancel
              </button>
              <button onClick={commitEdit} disabled={saving}
                className="rounded-lg bg-[#7A3F91] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2B0D3E] transition disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-2.5 text-xs leading-relaxed text-gray-800 shadow-sm">
              {message}
            </div>
            {canEdit && (
              <button
                onClick={startEdit}
                className="absolute -right-7 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 opacity-0 transition group-hover:opacity-100 hover:bg-amber-200"
                title="Edit this message"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GuestBubble({ message, label }: { message: string; label?: string }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      {label && <p className="pr-9 text-[10px] text-gray-400">{label}</p>}
      <div className="flex items-end gap-2">
        <div className="whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[#DCF8C6] px-4 py-2.5 text-xs leading-relaxed text-gray-800 shadow-sm max-w-xs">
          {message}
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600">You</div>
      </div>
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

type Tab = "flow" | "menu" | "config" | "flows";

export default function BotPage() {
  const mounted = useMounted();
  const router  = useRouter();
  const { addToast } = useToastStore();

  const [settings, setSettings]       = useState<Settings | null>(null);
  const [rooms, setRooms]             = useState<RoomType[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<Tab>("flow");
  const [selectedId, setSelectedId]   = useState("__menu__");

  // config
  const [config, setConfig]           = useState<Config | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savedConfig, setSavedConfig]   = useState(false);

  // bot messages (within config tab)
  const [botMsgs, setBotMsgs]         = useState<Record<string, string>>({});
  const [savingMsgs, setSavingMsgs]   = useState(false);
  const [savedMsgs, setSavedMsgs]     = useState(false);

  // menu title
  const [menuTitle, setMenuTitle]     = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [savedTitle, setSavedTitle]   = useState(false);

  // flows tab
  const [flowsList,     setFlowsList]     = useState<FlowSummary[]>([]);
  const [flowsLoaded,   setFlowsLoaded]   = useState(false);
  const [creatingFlow,  setCreatingFlow]  = useState(false);

  // menu item editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft]         = useState<Partial<MenuItem>>({});
  const [newItem, setNewItem]             = useState({ key: "", label: "", replyText: "", type: "INFO" as MenuItemType, order: "", flowId: "" });
  const [addingItem, setAddingItem]       = useState(false);
  const [addError, setAddError]           = useState("");

  useEffect(() => {
    if (!mounted) return;
    Promise.all([
      apiFetch("/hotel-settings"),
      apiFetch("/room-types"),
      apiFetch("/hotel-settings/flows"),
    ]).then(([s, r, fl]: [Settings, RoomType[], FlowSummary[]]) => {
        setSettings(s);
        setRooms(r);
        setFlowsList(fl);
        setFlowsLoaded(true);
        const cfg = s.config ?? {
          autoReplyEnabled: true, bookingEnabled: true, bookingFlowId: null, menuFlowId: null, aiEnabled: false,
          businessStartHour: 9, businessEndHour: 21, allDay: false,
          timezone: "UTC", defaultLanguage: "en",
          welcomeMessage: "", nightMessage: "", botMessages: {},
        };
        setConfig(cfg);
        setMenuTitle(s.menu?.title ?? "How can we help you?");
        setBotMsgs((cfg.botMessages as Record<string, string>) ?? {});
      })
      .finally(() => setLoading(false));
  }, [mounted]);

  // ── updaters ───────────────────────────────────────────────────────────────

  function patchItem(id: string, patch: Partial<MenuItem>) {
    setSettings((s) => {
      if (!s?.menu) return s;
      return { ...s, menu: { ...s.menu, items: s.menu.items.map((i) => i.id === id ? { ...i, ...patch } : i) } };
    });
  }

  async function saveConfig() {
    if (!config) return;
    setSavingConfig(true); setSavedConfig(false);
    try {
      await apiFetch("/hotel-settings", { method: "PATCH", body: JSON.stringify(config) });
      setSavedConfig(true); setTimeout(() => setSavedConfig(false), 3000);
    } finally { setSavingConfig(false); }
  }

  async function saveBotMessages() {
    setSavingMsgs(true); setSavedMsgs(false);
    try {
      await apiFetch("/hotel-settings/bot-messages", { method: "PATCH", body: JSON.stringify(botMsgs) });
      setSettings((s) => s?.config ? { ...s, config: { ...s.config, botMessages: botMsgs } } : s);
      setSavedMsgs(true); setTimeout(() => setSavedMsgs(false), 3000);
    } finally { setSavingMsgs(false); }
  }

  async function saveMenuTitle() {
    setSavingTitle(true); setSavedTitle(false);
    try {
      await apiFetch("/hotel-settings/menu", { method: "PATCH", body: JSON.stringify({ title: menuTitle }) });
      setSettings((s) => s?.menu ? { ...s, menu: { ...s.menu, title: menuTitle } } : s);
      setSavedTitle(true); setTimeout(() => setSavedTitle(false), 3000);
    } finally { setSavingTitle(false); }
  }

  async function handleToggleItem(item: MenuItem) {
    const u: MenuItem = await apiFetch(`/hotel-settings/menu/items/${item.id}`, {
      method: "PUT", body: JSON.stringify({ isActive: !item.isActive }),
    });
    patchItem(item.id, { isActive: u.isActive });
  }

  async function handleSaveEditItem() {
    if (!editingItemId) return;
    // Clear flowId when switching away from FLOW type
    const payload = { ...editDraft };
    if (editDraft.type && editDraft.type !== "FLOW") payload.flowId = null;
    const u: MenuItem = await apiFetch(`/hotel-settings/menu/items/${editingItemId}`, {
      method: "PUT", body: JSON.stringify(payload),
    });
    patchItem(editingItemId, u);
    setEditingItemId(null);
  }

  async function handleDeleteItem(id: string) {
    await apiFetch(`/hotel-settings/menu/items/${id}`, { method: "DELETE" });
    setSettings((s) => s?.menu ? { ...s, menu: { ...s.menu, items: s.menu.items.filter((i) => i.id !== id) } } : s);
  }

  async function handleAddItem() {
    setAddError("");
    if (!newItem.key || !newItem.label) { setAddError("Key and label are required."); return; }
    if (newItem.type === "INFO" && !newItem.replyText) { setAddError("Reply text is required for INFO items."); return; }
    if (newItem.type === "FLOW" && !newItem.flowId) { setAddError("Please select a flow for FLOW type items."); return; }
    setAddingItem(true);
    try {
      const len = settings?.menu?.items.length ?? 0;
      const created: MenuItem = await apiFetch("/hotel-settings/menu/items", {
        method: "POST",
        body: JSON.stringify({
          ...newItem,
          order: Number(newItem.order) || len + 1,
          flowId: newItem.type === "FLOW" ? (newItem.flowId || null) : null,
        }),
      });
      setSettings((s) => s
        ? { ...s, menu: s.menu ? { ...s.menu, items: [...s.menu.items, created] } : { id: "", title: menuTitle, items: [created] } }
        : s);
      setNewItem({ key: "", label: "", replyText: "", type: "INFO", order: "", flowId: "" });
    } catch { setAddError("Failed to add item."); }
    finally { setAddingItem(false); }
  }

  // Save a bot bubble edit — either a botMessages key or an item's replyText
  async function handleBubbleSave(step: FlowStep, value: string) {
    if (step.editKey) {
      const next = { ...botMsgs, [step.editKey]: value };
      setBotMsgs(next);
      await apiFetch("/hotel-settings/bot-messages", { method: "PATCH", body: JSON.stringify(next) });
      setSettings((s) => s?.config ? { ...s, config: { ...s.config, botMessages: next } } : s);
    } else if (step.editItemId) {
      const u: MenuItem = await apiFetch(`/hotel-settings/menu/items/${step.editItemId}`, {
        method: "PUT", body: JSON.stringify({ replyText: value }),
      });
      patchItem(step.editItemId, { replyText: u.replyText });
    }
  }

  async function loadFlows() {
    if (flowsLoaded) return;
    const data: FlowSummary[] = await apiFetch("/hotel-settings/flows");
    setFlowsList(data);
    setFlowsLoaded(true);
  }

  async function handleCreateFlow() {
    setCreatingFlow(true);
    try {
      const flow: FlowSummary & { id: string } = await apiFetch("/hotel-settings/flows", {
        method: "POST",
        body: JSON.stringify({ name: "New Flow" }),
      });
      router.push(`/dashboard/bot/flows/${flow.id}`);
    } finally {
      setCreatingFlow(false);
    }
  }

  async function handleDeleteFlow(id: string) {
    if (!confirm("Delete this flow?")) return;
    await apiFetch(`/hotel-settings/flows/${id}`, { method: "DELETE" });
    setFlowsList((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleToggleFlowActive(flow: FlowSummary) {
    if (flow.isTemplate) return; // read-only
    const updated: FlowSummary = await apiFetch(`/hotel-settings/flows/${flow.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !flow.isActive }),
    });
    setFlowsList((prev) => prev.map((f) => (f.id === flow.id ? updated : f)));
  }

  // ── guards ─────────────────────────────────────────────────────────────────

  if (!mounted || loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-400">
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading…
      </div>
    );
  }
  if (!settings) return <div className="p-8 text-sm text-red-500">Failed to load settings.</div>;

  const items       = settings.menu?.items ?? [];
  const sortedItems = [...items].sort((a, b) => a.order - b.order);
  const menuMsg     = buildMenuText(settings.name, settings.menu?.title ?? "How can we help you?", items, botMsgs);
  const selectedItem = items.find((i) => i.id === selectedId);

  // ── flow steps ─────────────────────────────────────────────────────────────

  let flowSteps: FlowStep[] = [];
  let flowTitle = "Main Menu";
  let flowSub   = "Sent when a guest first messages, or types MENU";
  let flowEnd   = "Guest makes a selection →";

  const defaultGreeting = `Welcome to *${settings.name || "our hotel"}*! 🏨`;
  if (selectedId === "__menu__" || !selectedItem) {
    flowSteps = [
      { from: "guest", message: "Hi", label: "Guest sends any message" },
      { from: "bot",   message: menuMsg,
        editKey: "menuGreeting",
        editValue: botMsgs["menuGreeting"]?.trim() || defaultGreeting },
    ];
  } else if (selectedItem.type === "BOOKING") {
    flowTitle = "Booking Flow";
    flowSub   = `"${selectedItem.label}" — step-by-step booking`;
    flowEnd   = "✓ Booking created";
    flowSteps = buildBookingFlow(selectedItem, rooms, botMsgs);
  } else if (selectedItem.type === "ENQUIRY") {
    flowTitle = "Enquiry Flow";
    flowSub   = `"${selectedItem.label}" — hands off to staff`;
    flowEnd   = "Staff replies from Chats";
    flowSteps = buildEnquiryFlow(selectedItem, botMsgs);
  } else if (selectedItem.type === "FLOW") {
    const linkedFlow = flowsList.find((f) => f.id === selectedItem.flowId);
    flowTitle = "Custom Flow";
    flowSub   = linkedFlow
      ? `"${selectedItem.label}" → ${linkedFlow.name}`
      : `"${selectedItem.label}" — no flow linked`;
    flowEnd   = "Flow ends / session resets";
    flowSteps = [
      { from: "guest", message: `*${selectedItem.key}*`, label: `Guest selects "${selectedItem.label}"` },
      ...(linkedFlow
        ? [{ from: "bot" as const, message: `🔀 *Running flow: ${linkedFlow.name}*\n\nThe bot will follow the visual flow you built in the canvas.\n\n_Reply *MENU* at any time to restart._` }]
        : [{ from: "bot" as const, message: null, label: "⚠️ No flow linked — edit this item and select a flow" }]
      ),
    ];
  } else {
    flowTitle = "Info Reply";
    flowSub   = `"${selectedItem.label}" — one-shot reply`;
    flowEnd   = "Guest returns to menu";
    flowSteps = buildInfoFlow(selectedItem);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "flow",   label: "Flow Preview" },
    { id: "menu",   label: "Menu Items"   },
    { id: "config", label: "Configuration"},
    { id: "flows",  label: "✦ Flows"      },
  ];

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left sidebar ──────────────────────────────────────────────── */}
      <div className="flex w-52 shrink-0 flex-col border-r border-gray-100 bg-white">
        {/* status */}
        <div className="border-b border-gray-50 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${config?.autoReplyEnabled ? "bg-green-500" : "bg-gray-400"}`} />
            <span className="text-xs font-semibold text-gray-700">
              {config?.autoReplyEnabled ? "Auto-reply ON" : "Auto-reply OFF"}
            </span>
          </div>
          {config?.autoReplyEnabled && (
            <p className="mt-0.5 text-[10px] text-gray-400">{fmtHour(config.businessStartHour)} – {fmtHour(config.businessEndHour)}</p>
          )}
        </div>

        {/* main menu entry */}
        <div className="px-3 pt-3">
          <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Entry</p>
          <button
            onClick={() => { setSelectedId("__menu__"); setTab("flow"); }}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
              selectedId === "__menu__" && tab === "flow" ? "bg-[#7A3F91] text-white" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <span className="font-medium">Main Menu</span>
          </button>
        </div>

        {/* items list */}
        {sortedItems.length > 0 ? (
          <div className="flex-1 overflow-y-auto px-3 pt-2 pb-2">
            <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Options</p>
            <ul className="flex flex-col gap-0.5">
              {sortedItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setSelectedId(item.id);
                      setTab("flow");
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition ${
                      selectedId === item.id && tab === "flow"
                        ? "bg-[#7A3F91]/10 text-[#7A3F91] ring-1 ring-[#7A3F91]/20"
                        : "text-gray-700 hover:bg-gray-50"
                    } ${!item.isActive ? "opacity-40" : ""}`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[item.type]}`} />
                    <span className="flex-1 truncate text-xs font-medium">
                      <span className="font-mono text-gray-400">{item.key}. </span>{item.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="px-4 py-4 text-center text-xs text-gray-400">
            No menu items yet.<br />
            <button onClick={() => setTab("menu")} className="font-semibold text-[#7A3F91]">Add one →</button>
          </p>
        )}

        {/* legend */}
        <div className="mt-auto border-t border-gray-50 px-4 py-3 space-y-1.5">
          {(["INFO","BOOKING","ENQUIRY","FLOW"] as MenuItemType[]).map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[t]}`} />
              <span className="text-[10px] text-gray-400">
                {t === "INFO" ? "Reply & return" : t === "BOOKING" ? "6-step booking" : t === "ENQUIRY" ? "Staff takeover" : "Custom flow"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right area ────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* tab bar */}
        <div className="flex shrink-0 items-center gap-0 border-b border-gray-100 bg-white px-4">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
                tab === t.id ? "border-[#7A3F91] text-[#7A3F91]" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── FLOW PREVIEW ────────────────────────────────────────────── */}
        {tab === "flow" && (
          <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-6">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{flowTitle}</h3>
                  <p className="text-xs text-gray-400">{flowSub}</p>
                </div>
                {selectedItem && (
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {selectedItem.type === "FLOW" && selectedItem.flowId && (
                      <button
                        onClick={() => router.push(`/dashboard/bot/flows/${selectedItem.flowId}`)}
                        className="rounded-lg bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 transition hover:bg-purple-200"
                      >
                        Edit Flow →
                      </button>
                    )}
                    <span className="text-xs text-gray-400">Active</span>
                    <Toggle enabled={selectedItem.isActive} onChange={() => handleToggleItem(selectedItem)} />
                  </div>
                )}
              </div>

              {/* WhatsApp phone chrome */}
              <div className="overflow-hidden rounded-2xl shadow-md">
                <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
                    {(settings.name || "H")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{settings.name || "Hotel"}</p>
                    <p className="text-[10px] text-white/70">+{settings.phone} · WhatsApp Bot</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 bg-[#ECE5DD] px-4 py-5" style={{ minHeight: 360 }}>
                  {flowSteps.map((step, i) =>
                    step.from === "bot" ? (
                      <BotBubble
                        key={i}
                        message={step.message}
                        canEdit={!!(step.editKey || step.editItemId)}
                        editValue={step.editValue}
                        onSave={step.editKey || step.editItemId
                          ? (val) => handleBubbleSave(step, val)
                          : undefined}
                      />
                    ) : (
                      <GuestBubble key={i} message={step.message!} label={step.label} />
                    )
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 border-t border-gray-300/50" />
                    <span className="whitespace-nowrap text-[10px] text-gray-400">{flowEnd}</span>
                    <div className="flex-1 border-t border-gray-300/50" />
                  </div>
                </div>
              </div>

              <p className="mt-3 text-center text-[11px] text-gray-400">
                Hover any bot message → click ✏️ to edit it inline and save directly.
              </p>
            </div>
          </div>
        )}

        {/* ── MENU ITEMS ───────────────────────────────────────────────── */}
        {tab === "menu" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* menu title */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-50 px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-900">Menu Title</h2>
                <p className="mt-0.5 text-xs text-gray-400">The heading guests see when the main menu is displayed.</p>
              </div>
              <div className="flex items-end gap-3 px-6 py-5">
                <input value={menuTitle} onChange={(e) => setMenuTitle(e.target.value)} className={inp} />
                <SaveBtn saving={savingTitle} saved={savedTitle} onSave={saveMenuTitle} />
              </div>
            </div>

            {/* items table */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-50 px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-900">Menu Options</h2>
                <p className="mt-0.5 text-xs text-gray-400">Each option triggers a conversation flow when the guest replies with its key.</p>
              </div>
              <div className="px-6 py-5 space-y-4">
                {items.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left">
                        <tr>
                          {["Key","Label","Type","Reply / Opening Text","Active",""].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sortedItems.map((item) =>
                          editingItemId === item.id ? (
                            <tr key={item.id} className="bg-purple-50/40">
                              <td className="px-3 py-2">
                                <input value={editDraft.key ?? item.key}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, key: e.target.value }))}
                                  className="w-14 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none" />
                              </td>
                              <td className="px-3 py-2">
                                <input value={editDraft.label ?? item.label}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, label: e.target.value }))}
                                  className="w-28 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none" />
                              </td>
                              <td className="px-3 py-2">
                                <select value={editDraft.type ?? item.type}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, type: e.target.value as MenuItemType }))}
                                  className="rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none">
                                  <option value="INFO">INFO</option>
                                  <option value="BOOKING">BOOKING</option>
                                  <option value="ENQUIRY">ENQUIRY</option>
                                  <option value="FLOW">FLOW</option>
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                {(editDraft.type ?? item.type) === "FLOW" ? (
                                  <select
                                    value={editDraft.flowId ?? item.flowId ?? ""}
                                    onChange={(e) => setEditDraft((d) => ({ ...d, flowId: e.target.value || null }))}
                                    className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none"
                                  >
                                    <option value="">— select a flow —</option>
                                    {flowsList.filter((f) => f.isActive).map((f) => (
                                      <option key={f.id} value={f.id}>{f.isTemplate ? "★ " : ""}{f.name}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input value={editDraft.replyText ?? item.replyText}
                                    onChange={(e) => setEditDraft((d) => ({ ...d, replyText: e.target.value }))}
                                    className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none"
                                    placeholder="Optional opening message…" />
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <Toggle enabled={editDraft.isActive ?? item.isActive}
                                  onChange={(v) => setEditDraft((d) => ({ ...d, isActive: v }))} />
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex gap-1">
                                  <button onClick={handleSaveEditItem}
                                    className="rounded bg-[#7A3F91] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#2B0D3E]">Save</button>
                                  <button onClick={() => setEditingItemId(null)}
                                    className="rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-50">Cancel</button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr key={item.id} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-3 font-mono text-xs font-semibold text-[#7A3F91]">{item.key}</td>
                              <td className="px-4 py-3 text-xs font-medium text-gray-700">{item.label}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${TYPE_COLOR[item.type]}`}>
                                  {TYPE_LABEL[item.type]}
                                </span>
                              </td>
                              <td className="px-4 py-3 max-w-xs">
                                {item.type === "FLOW" && item.flowId ? (
                                  <p className="truncate text-xs font-medium text-purple-600">
                                    🔀 {flowsList.find((f) => f.id === item.flowId)?.name ?? item.flowId.slice(0, 8) + "…"}
                                  </p>
                                ) : (
                                  <p className="truncate text-xs text-gray-500">{item.replyText || <span className="italic text-gray-300">—</span>}</p>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Toggle enabled={item.isActive} onChange={() => handleToggleItem(item)} />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <button onClick={() => { setEditingItemId(item.id); setEditDraft({}); }}
                                    className="text-gray-400 hover:text-[#7A3F91] transition" title="Edit">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button onClick={() => handleDeleteItem(item.id)}
                                    className="text-gray-300 hover:text-red-500 transition" title="Delete">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">No menu items yet. Add one below.</p>
                )}

                {/* Add form */}
                <div className="rounded-xl border border-dashed border-gray-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500">Add Menu Item</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-400 mb-1">Key</label>
                      <input value={newItem.key} onChange={(e) => setNewItem((f) => ({ ...f, key: e.target.value }))}
                        placeholder="1" className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#7A3F91]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-400 mb-1">Label</label>
                      <input value={newItem.label} onChange={(e) => setNewItem((f) => ({ ...f, label: e.target.value }))}
                        placeholder="Room Booking" className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#7A3F91]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-400 mb-1">Type</label>
                      <select value={newItem.type} onChange={(e) => setNewItem((f) => ({ ...f, type: e.target.value as MenuItemType }))}
                        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#7A3F91]">
                        <option value="INFO">INFO</option>
                        <option value="BOOKING">BOOKING</option>
                        <option value="ENQUIRY">ENQUIRY</option>
                        <option value="FLOW">FLOW</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-400 mb-1">Order</label>
                      <input type="number" value={newItem.order} onChange={(e) => setNewItem((f) => ({ ...f, order: e.target.value }))}
                        placeholder="1" className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#7A3F91]" />
                    </div>
                  </div>
                  {newItem.type === "FLOW" ? (
                    <div>
                      <label className="block text-[10px] font-medium text-gray-400 mb-1">Flow *</label>
                      <select
                        value={newItem.flowId}
                        onChange={(e) => setNewItem((f) => ({ ...f, flowId: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#7A3F91]"
                      >
                        <option value="">— select a flow —</option>
                        {flowsList.filter((f) => f.isActive).map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.isTemplate ? "★ " : ""}{f.name}
                          </option>
                        ))}
                      </select>
                      {flowsList.filter((f) => f.isActive).length === 0 && (
                        <p className="mt-1 text-[10px] text-amber-600">No active flows yet — create one in the ✦ Flows tab first.</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-medium text-gray-400 mb-1">
                        {newItem.type === "INFO" ? "Reply Text *" : "Opening Message (optional)"}
                      </label>
                      <textarea rows={2} value={newItem.replyText}
                        onChange={(e) => setNewItem((f) => ({ ...f, replyText: e.target.value }))}
                        placeholder={newItem.type === "INFO" ? "Text sent when guest selects this option…" : "Optional greeting before the flow starts…"}
                        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#7A3F91]" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    {addError ? <p className="text-xs text-red-500">{addError}</p> : <span />}
                    <button onClick={handleAddItem} disabled={addingItem}
                      className="rounded-lg bg-[#7A3F91] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#2B0D3E] transition disabled:opacity-50">
                      {addingItem ? "Adding…" : "+ Add Item"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIGURATION ───────────────────────────────────────────── */}
        {tab === "config" && config && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Auto-reply settings */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Auto-Reply Settings</h2>
                  <p className="mt-0.5 text-xs text-gray-400">Control when and how the bot responds to guests.</p>
                </div>
                <SaveBtn saving={savingConfig} saved={savedConfig} onSave={saveConfig} />
              </div>
              <div className="px-6 py-5 space-y-5">
                {[
                  { key: "autoReplyEnabled", label: "Auto-Reply Enabled",  sub: "Bot responds to guests automatically" },
                  { key: "bookingEnabled",   label: "Booking Enabled",     sub: "Allow bookings to be created via WhatsApp" },
                  { key: "aiEnabled",        label: "AI Assistant",        sub: "OpenAI answers unrecognised guest questions — replies counted as AI Replies" },
                ].map(({ key, label, sub }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{label}</p>
                      <p className="text-xs text-gray-400">{sub}</p>
                    </div>
                    <Toggle enabled={(config as any)[key]} onChange={(v) => setConfig((c) => c && ({ ...c, [key]: v }))} />
                  </div>
                ))}

                {/* Menu flow picker — makes the main menu fully flow-driven */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Main Menu Flow</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      When set, this flow replaces the hardcoded menu text. Build greetings, time-based routing, media messages, and more.
                    </p>
                  </div>
                  <select
                    className={inp}
                    value={config.menuFlowId ?? ""}
                    onChange={(e) => setConfig((c) => c && ({ ...c, menuFlowId: e.target.value || null }))}
                  >
                    <option value="">— Use default menu (text list) —</option>
                    {flowsList
                      .filter((f) => f.isActive)
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.isTemplate ? "🌐 " : "🔀 "}{f.name}
                        </option>
                      ))}
                  </select>
                  {config.menuFlowId && (
                    <div className="flex gap-2">
                      <a
                        href={`/dashboard/bot/flows/${config.menuFlowId}`}
                        className="text-xs text-indigo-600 underline hover:text-indigo-800"
                      >
                        Open in canvas →
                      </a>
                      <button
                        className="text-xs text-gray-400 hover:text-red-500 transition"
                        onClick={() => setConfig((c) => c && ({ ...c, menuFlowId: null }))}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Booking flow picker */}
                {config.bookingEnabled && (
                  <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Custom Booking Flow</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        When set, BOOKING menu items will use this visual flow instead of the built-in booking wizard.
                      </p>
                    </div>
                    <select
                      className={inp}
                      value={config.bookingFlowId ?? ""}
                      onChange={(e) => setConfig((c) => c && ({ ...c, bookingFlowId: e.target.value || null }))}
                    >
                      <option value="">— Use built-in booking wizard —</option>
                      {flowsList
                        .filter((f) => f.isActive)
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.isTemplate ? "🌐 " : "🔀 "}{f.name}
                          </option>
                        ))}
                    </select>
                    {config.bookingFlowId && (
                      <div className="flex gap-2">
                        <a
                          href={`/dashboard/bot/flows/${config.bookingFlowId}`}
                          className="text-xs text-[#7A3F91] underline hover:text-[#2B0D3E]"
                        >
                          Open in canvas →
                        </a>
                        <button
                          className="text-xs text-gray-400 hover:text-red-500 transition"
                          onClick={() => setConfig((c) => c && ({ ...c, bookingFlowId: null }))}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                    {!config.bookingFlowId && (
                      <button
                        className="text-xs text-[#7A3F91] hover:text-[#2B0D3E] underline transition"
                        onClick={async () => {
                          const defaultFlow = buildDefaultBookingFlow();
                          try {
                            const created = await apiFetch("/hotel-settings/flows", {
                              method: "POST",
                              body: JSON.stringify(defaultFlow),
                            });
                            setFlowsList((prev) => [...prev, created]);
                            setConfig((c) => c && ({ ...c, bookingFlowId: created.id }));
                          } catch (err: any) {
                            addToast(err.message || "Failed to create default booking flow.", "error");
                          }
                        }}
                      >
                        + Create default booking flow
                      </button>
                    )}
                  </div>
                )}

                <div className="border-t border-gray-50 pt-4 space-y-3">
                  {/* 24-hour toggle */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Open 24 Hours</p>
                      <p className="text-[10px] text-gray-400">Bot always replies; night message disabled</p>
                    </div>
                    <div
                      onClick={() => setConfig((c) => c && ({ ...c, allDay: !c.allDay }))}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                        config.allDay ? "bg-[#7A3F91]" : "bg-gray-300"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        config.allDay ? "translate-x-4" : "translate-x-0.5"
                      }`} />
                    </div>
                  </label>

                  {/* Hour selectors (hidden when allDay) */}
                  {!config.allDay && (
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: "businessStartHour", label: "Start Hour" },
                        { key: "businessEndHour",   label: "End Hour"   },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                          <select value={(config as any)[key]}
                            onChange={(e) => setConfig((c) => c && ({ ...c, [key]: Number(e.target.value) }))}
                            className={inp}>
                            {HOURS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Timezone</label>
                    <select value={config.timezone}
                      onChange={(e) => setConfig((c) => c && ({ ...c, timezone: e.target.value }))} className={inp}>
                      {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Language</label>
                    <select value={config.defaultLanguage}
                      onChange={(e) => setConfig((c) => c && ({ ...c, defaultLanguage: e.target.value }))} className={inp}>
                      {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                </div>

                {[
                  { key: "welcomeMessage", label: "Welcome Message (Business Hours)", ph: "Sent when a guest messages during business hours…" },
                  { key: "nightMessage",   label: "Night Message (After Hours)",       ph: "Sent when a guest messages outside business hours…" },
                ].map(({ key, label, ph }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <textarea rows={3} value={(config as any)[key]}
                      onChange={(e) => setConfig((c) => c && ({ ...c, [key]: e.target.value }))}
                      placeholder={ph} className={inp} />
                  </div>
                ))}
              </div>
            </div>

            {/* Bot message templates */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Bot Message Templates</h2>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Customise every automatic reply the bot sends. Leave blank to use the built-in default.
                    You can also edit messages directly in the <button onClick={() => setTab("flow")} className="font-semibold text-[#7A3F91]">Flow Preview</button>.
                  </p>
                </div>
                <SaveBtn saving={savingMsgs} saved={savedMsgs} onSave={saveBotMessages} label="Save All" />
              </div>
              <div className="px-6 py-5 space-y-4">
                {Object.entries(BOT_MSG_META).map(([key, meta]) => (
                  <div key={key} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{meta.label}</p>
                        <p className="text-[11px] text-gray-400">{meta.hint}</p>
                      </div>
                      {botMsgs[key] && (
                        <button
                          onClick={() => setBotMsgs((m) => { const n = { ...m }; delete n[key]; return n; })}
                          className="shrink-0 text-[10px] text-gray-400 hover:text-red-500 transition">
                          Reset
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={botMsgs[key] ?? ""}
                      onChange={(e) => setBotMsgs((m) => ({ ...m, [key]: e.target.value }))}
                      placeholder={meta.placeholder}
                      className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#7A3F91] placeholder:text-gray-300"
                    />
                    {!botMsgs[key] && (
                      <p className="mt-1 text-[10px] italic text-gray-300">
                        Default: {meta.placeholder.slice(0, 90)}{meta.placeholder.length > 90 ? "…" : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ── FLOWS TAB ────────────────────────────────────────────────── */}
        {tab === "flows" && (() => {
          if (!flowsLoaded) { loadFlows(); }
          return (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Bot Flows</h2>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Build visual conversation flows. Global templates (created by Vaketta admin) are read-only.
                  </p>
                </div>
                <button
                  onClick={handleCreateFlow}
                  disabled={creatingFlow}
                  className="rounded-lg bg-[#7A3F91] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2B0D3E] disabled:opacity-50"
                >
                  {creatingFlow ? "Creating…" : "+ New Flow"}
                </button>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                {!flowsLoaded ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-[#7A3F91]" />
                  </div>
                ) : flowsList.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400">No flows yet. Create one to get started.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-center">Active</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {flowsList.map((flow) => (
                        <tr key={flow.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-800">{flow.name}</p>
                            {flow.description && <p className="text-xs text-gray-400">{flow.description}</p>}
                          </td>
                          <td className="px-4 py-3">
                            {flow.isTemplate ? (
                              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">Global Template</span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">My Flow</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              disabled={flow.isTemplate}
                              onClick={() => handleToggleFlowActive(flow)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-40 ${flow.isActive ? "bg-[#7A3F91]" : "bg-gray-300"}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${flow.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              onClick={() => router.push(`/dashboard/bot/flows/${flow.id}`)}
                              className="rounded px-2 py-1 text-xs font-medium text-[#7A3F91] transition hover:bg-purple-50"
                            >
                              {flow.isTemplate ? "View" : "Edit"}
                            </button>
                            {!flow.isTemplate && (
                              <button
                                onClick={() => handleDeleteFlow(flow.id)}
                                className="rounded px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
