/**
 * Optimistic template messages now store the same JSON body the backend
 * persists. These tests pin the dedup contract: when the real socket message
 * arrives it must REPLACE the tmp bubble, never leave a duplicate — matching on
 * renderedBody rather than raw JSON so key-order/omitted-field differences
 * between the two serializers can't strand a stale bubble.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore, type Message } from "./chatStore";

const base: Omit<Message, "id" | "body"> = {
  direction: "OUT", messageType: "template",
  mediaUrl: null, mimeType: null, fileName: null,
  timestamp: "2026-07-29T10:00:00.000Z", status: "SENT",
  guestId: "g1", deleted: false, deletedBy: null, jobId: null,
};

const tmpBody  = JSON.stringify({ renderedBody: "Hi Sam", components: { body: { text: "Hi Sam" } } });
// Same content, different key order + an extra null field — as a differing serializer might emit.
const realBody = JSON.stringify({ components: { body: { text: "Hi Sam" }, footer: null }, renderedBody: "Hi Sam" });

beforeEach(() => {
  useChatStore.getState().resetStore();
  useChatStore.getState().setSelectedGuest("g1");
});

describe("template optimistic → real replacement", () => {
  it("replaces the tmp bubble when the real message arrives", () => {
    const add = useChatStore.getState().addMessage;
    add({ ...base, id: "tmp_1", body: tmpBody, status: "SENDING" });
    add({ ...base, id: "real-1", body: realBody });

    const { messages } = useChatStore.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0]!.id).toBe("real-1");
  });

  it("keeps a template with genuinely different content as a separate bubble", () => {
    const add = useChatStore.getState().addMessage;
    add({ ...base, id: "tmp_1", body: tmpBody, status: "SENDING" });
    add({
      ...base, id: "real-2",
      body: JSON.stringify({ renderedBody: "Hi Alex", components: { body: { text: "Hi Alex" } } }),
    });

    expect(useChatStore.getState().messages).toHaveLength(2);
  });

  it("does not confuse a plain text message with a template of the same text", () => {
    const add = useChatStore.getState().addMessage;
    add({ ...base, id: "tmp_1", body: tmpBody, status: "SENDING" });
    add({ ...base, id: "real-3", body: "Hi Sam", messageType: "text" });

    expect(useChatStore.getState().messages).toHaveLength(2);
  });

  it("still dedups plain text optimistic messages by exact body (unchanged)", () => {
    const add = useChatStore.getState().addMessage;
    add({ ...base, id: "tmp_1", body: "Hello", messageType: "text", status: "SENDING" });
    add({ ...base, id: "real-4", body: "Hello", messageType: "text" });

    const { messages } = useChatStore.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0]!.id).toBe("real-4");
  });
});
