"use client";

interface CarouselCard {
  imageUrl:    string;
  title:       string;
  price:       number;
  description: string;
  buttonId:    string;
}

interface Props {
  content: string;
}

// Renders an outbound CAROUSEL message as a horizontally scrollable strip of
// room cards (mirroring how WhatsApp displays them to the guest). The cards
// are display-only — the actual selection happens guest-side when they tap
// "Select Room" inside WhatsApp.
export function RoomCarouselCards({ content }: Props) {
  let cards: CarouselCard[] = [];
  try {
    const parsed = JSON.parse(content) as { cards?: CarouselCard[] };
    if (Array.isArray(parsed?.cards)) cards = parsed.cards;
  } catch {
    // Malformed payload — render nothing rather than crash the chat.
  }

  if (!cards.length) {
    return (
      <p className="text-xs italic text-gray-400 px-2 py-1">No rooms to display.</p>
    );
  }

  return (
    <div
      className="wa-room-strip flex gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
    >
      {/* Hide WebKit scrollbar via a scoped style tag */}
      <style>{`.wa-room-strip::-webkit-scrollbar { display: none; }`}</style>

      {cards.map((c, i) => (
        <div
          key={`${c.buttonId}-${i}`}
          className="shrink-0 w-44 rounded-xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden flex flex-col"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.imageUrl}
            alt={c.title}
            className="w-full h-28 object-cover bg-gray-100"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />

          <div className="p-2.5 flex flex-col gap-1 flex-1">
            <p className="text-sm font-semibold text-[#0C1B33] truncate">{c.title}</p>
            <p className="text-sm font-medium text-[#7A3F91]">₹{c.price}/night</p>
            <p className="text-xs text-gray-500 line-clamp-2 leading-snug">{c.description}</p>

            <div className="mt-auto pt-2">
              <div className="text-center text-xs font-medium text-[#7A3F91] border border-[#7A3F91]/30 rounded-md py-1.5 select-none">
                Select Room
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default RoomCarouselCards;
