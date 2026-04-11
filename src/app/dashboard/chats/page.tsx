"use client";

import { useMounted } from "@/lib/useMounted";
import ChatList from "@/components/ChatList";
import ChatWindow from "@/components/ChatWindow";

export default function DashboardPage() {
  const mounted = useMounted();

  if (!mounted) return null; // 🔥 prevents hydration mismatch
  return (
    <div className="flex w-full h-full overflow-hidden">
      <ChatList/>
      <ChatWindow/>
      
    </div>
  );
}
