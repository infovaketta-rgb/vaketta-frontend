import { create } from "zustand";

// Frontend-only metadata attached to outbound template messages so the bubble
// can render the rich WhatsApp template card (header image / body / footer /
// action buttons). The backend persists templates as plain text messages, so
// this metadata is populated optimistically when the staff member sends a
// template and copied over when the real socket message replaces the tmp.
export type TemplateBubbleMeta = {
  header?: {
    format?:    "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
    text?:      string;
    mediaUrl?:  string;
    sampleUrl?: string;
  };
  body?:    { text: string };
  footer?:  { text: string };
  buttons?: Array<{
    type:         "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE";
    text:         string;
    url?:         string;
    phoneNumber?: string;
    couponCode?:  string;
  }>;
};

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
  deleted:     boolean;
  deletedBy:   string | null;
  jobId:       string | null;
  template?:   TemplateBubbleMeta | null;
};

type MessageChannel = "WHATSAPP" | "INSTAGRAM";

type ChatState = {
  selectedGuestId: string | null;
  selectedGuestPhone: string | null;
  selectedGuestName: string | null;
  selectedGuestChannel: MessageChannel | null;
  messages: Message[];
  botEnabled: boolean;

  setSelectedGuest: (guestId: string | null, botEnabled?: boolean, phone?: string | null, name?: string | null, channel?: MessageChannel | null) => void;
  setSelectedGuestName: (name: string) => void;
  replaceMessages: (msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  markMessagesRead: (guestId: string) => void;
  updateMessageStatus: (messageId: string, status: string) => void;
  removeMessage: (messageId: string) => void;
  setBotEnabled: (enabled: boolean) => void;
  resetStore: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  selectedGuestId: null,
  selectedGuestPhone: null,
  selectedGuestName: null,
  selectedGuestChannel: null,
  messages: [],
  botEnabled: true,

  setSelectedGuest: (guestId, botEnabled = true, phone = null, name = null, channel = null) =>
    set(guestId === null
      ? { selectedGuestId: null, selectedGuestPhone: null, selectedGuestName: null, selectedGuestChannel: null, messages: [], botEnabled: true }
      : { selectedGuestId: guestId, selectedGuestPhone: phone, selectedGuestName: name, selectedGuestChannel: channel, messages: [], botEnabled }
    ),

  setSelectedGuestName: (name) => set({ selectedGuestName: name }),

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

    // When a real message arrives, locate its optimistic tmp counterpart so we
    // can copy over frontend-only metadata (e.g. template bubble structure)
    // before dropping it.
    const tmpMatch = !message.id.startsWith("tmp_")
      ? state.messages.find(
          (m) =>
            m.id.startsWith("tmp_") &&
            m.body === message.body &&
            m.direction === message.direction
        )
      : null;

    const enriched: Message = tmpMatch?.template
      ? { ...message, template: tmpMatch.template }
      : message;

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
      messages: [...cleaned, enriched],
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

  resetStore: () => set({
    selectedGuestId:      null,
    selectedGuestPhone:   null,
    selectedGuestName:    null,
    selectedGuestChannel: null,
    messages:             [],
    botEnabled:           true,
  }),
}));
