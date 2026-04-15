"use client";

// ── System variables always available in every flow ───────────────────────────
export const SYSTEM_VARS = [
  { name: "hotelName",    desc: "Hotel name"             },
  { name: "guestName",    desc: "Guest's registered name" },
  { name: "guestPhone",   desc: "Guest's phone number"    },
  { name: "currentDate",  desc: "Today's date (localised)" },
  { name: "currentTime",  desc: "Current time (localised)" },
  { name: "currentDay",   desc: "Day of week (e.g. Monday)" },
];

type PaletteItem = {
  type:  string;
  label: string;
  icon:  string;
  desc:  string;
  color: string;
};

const CATEGORIES: { title: string; items: PaletteItem[] }[] = [
  {
    title: "Conversation",
    items: [
      { type: "message",  label: "Message",   icon: "💬", desc: "Send text to guest",           color: "bg-gray-50   border-gray-300   text-gray-700   hover:bg-gray-100"   },
      { type: "question", label: "Question",  icon: "❓", desc: "Ask & collect an answer",      color: "bg-blue-50   border-blue-300   text-blue-700   hover:bg-blue-100"   },
      { type: "branch",   label: "Branch",    icon: "🔀", desc: "Route by variable or value",   color: "bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100" },
      { type: "jump",     label: "Jump",      icon: "↩", desc: "Jump to any node in this flow", color: "bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100" },
    ],
  },
  {
    title: "Hotel",
    items: [
      { type: "show_rooms",         label: "Show Rooms",         icon: "🏨", desc: "Display room list + collect pick",    color: "bg-blue-50  border-blue-400  text-blue-700  hover:bg-blue-100"  },
      { type: "check_availability", label: "Check Availability", icon: "📅", desc: "Route: available / unavailable",      color: "bg-teal-50  border-teal-300  text-teal-700  hover:bg-teal-100"  },
      { type: "time_condition",     label: "Time Condition",     icon: "🕐", desc: "Route by business hours / weekend",   color: "bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100" },
      { type: "show_menu",          label: "Show Menu",          icon: "📋", desc: "Emit hotel's WhatsApp menu inline",   color: "bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100" },
    ],
  },
  {
    title: "Actions",
    items: [
      { type: "action", label: "Action", icon: "⚡", desc: "Booking, review, variable…",  color: "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100" },
      { type: "end",    label: "End",    icon: "⏹", desc: "End of this flow path",        color: "bg-red-50    border-red-300    text-red-700    hover:bg-red-100"    },
    ],
  },
];

export default function NodePalette() {
  function onDragStart(e: React.DragEvent, type: string) {
    e.dataTransfer.setData("application/reactflow", type);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="flex w-44 min-h-0 flex-1 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm overflow-y-auto">
      {CATEGORIES.map((cat) => (
        <div key={cat.title}>
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-400">
            {cat.title}
          </p>
          <div className="flex flex-col gap-1">
            {cat.items.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => onDragStart(e, item.type)}
                title={item.desc}
                className={`flex cursor-grab items-start gap-2 rounded-lg border px-2 py-1.5 select-none active:cursor-grabbing transition ${item.color}`}
              >
                <span className="mt-0.5 text-sm leading-none">{item.icon}</span>
                <div>
                  <p className="text-[11px] font-semibold leading-tight">{item.label}</p>
                  <p className="text-[9px] leading-tight opacity-70">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* System variables panel */}
      <div>
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-400">
          System Vars
        </p>
        <div className="rounded-lg border border-purple-100 bg-purple-50 p-2 space-y-1">
          <p className="text-[9px] text-purple-500 mb-1">Available in every flow — use in any text field</p>
          {SYSTEM_VARS.map(({ name, desc }) => (
            <div key={name} className="flex flex-col">
              <code className="text-[10px] font-mono font-bold text-purple-700">{`{{${name}}}`}</code>
              <span className="text-[9px] text-purple-400">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
