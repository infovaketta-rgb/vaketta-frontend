import { create } from "zustand";

export type Message = {
  id:          string;
  direction:   "IN" | "OUT";
  body:        string | null;
  messageType: string;
  mediaUrl:    string | null;
  mimeType:    string | null;
  fileName:    string | null;
  timestamp:   string;
  status:      string;
  guestId:     string;
};

type ChatState = {
  selectedGuestId: string | null;
  selectedGuestPhone: string | null;
  messages: Message[];
  botEnabled: boolean;

  setSelectedGuest: (guestId: string, botEnabled?: boolean, phone?: string | null) => void;
  replaceMessages: (msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  markMessagesRead: (guestId: string) => void;
  updateMessageStatus: (messageId: string, status: string) => void;
  removeMessage: (messageId: string) => void;
  setBotEnabled: (enabled: boolean) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  selectedGuestId: null,
  selectedGuestPhone: null,
  messages: [],
  botEnabled: true,

  setSelectedGuest: (guestId, botEnabled = true, phone = null) =>
    set({
      selectedGuestId: guestId,
      selectedGuestPhone: phone,
      messages: [], // reset when switching conversation
      botEnabled,
    }),

  // ✅ ONLY used after API fetch
  replaceMessages: (msgs) =>
    set({ messages: msgs }),

  addMessage: (message) =>
  set((state) => {
    if (message.guestId !== state.selectedGuestId) {
      return state;
    }

    // prevent duplicates by real id
    if (state.messages.some((m) => m.id === message.id)) {
      return state;
    }

    // if real message arrives, drop any optimistic temp entry with the same body+direction
    const filtered = message.id.startsWith("tmp_")
      ? state.messages
      : state.messages.filter(
          (m) =>
            !(m.id.startsWith("tmp_") && m.body === message.body && m.direction === message.direction)
        );

    // also drop REPLACED placeholders
    const cleaned = filtered.filter((m) => m.status !== "REPLACED");

    return {
      messages: [...cleaned, message],
    };
  }),
  markMessagesRead: (guestId: string) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.guestId === guestId && m.direction === "IN"
          ? { ...m, status: "READ" }
          : m
      ),
    })),

  updateMessageStatus: (messageId: string, status: string) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, status } : m
      ),
    })),

  removeMessage: (messageId: string) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    })),

  setBotEnabled: (enabled) => set({ botEnabled: enabled }),
}));
