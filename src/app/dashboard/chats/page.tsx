"use client";

import { useMounted } from "@/lib/useMounted";
import ChatList from "@/components/ChatList";
import ChatWindow from "@/components/ChatWindow";
import { useChatStore } from "@/store/chatStore";

export default function DashboardPage() {
  const mounted = useMounted();
  const selectedGuestId = useChatStore((s) => s.selectedGuestId);

  if (!mounted) return null;
  return (
    <div className="flex w-full h-full overflow-hidden">
      <div className={`${selectedGuestId ? "hidden md:flex" : "flex"} w-full md:w-80`}>
        <ChatList />
      </div>
      <div className={`${selectedGuestId ? "flex" : "hidden md:flex"} flex-1 min-w-0`}>
        <ChatWindow />
      </div>
    </div>
  );
}
