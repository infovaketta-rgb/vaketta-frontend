/**
 * Regression tests for template message normalization.
 *
 * The bug: the optimistic bubble stored the raw template payload (plain
 * renderedBody + a separate `template` meta field) while the persisted row
 * stores `body` = JSON {renderedBody, components}. The two shapes rendered
 * differently until a refresh.
 *
 * The fix: buildTemplateMessageBody() is the single writer of the stored shape
 * (mirroring templates.service) and resolveTemplateBubble() the single reader,
 * so an optimistic message and its persisted counterpart resolve identically.
 */

import { describe, it, expect } from "vitest";
import {
  buildTemplateMessageBody,
  renderTemplateBody,
  resolveTemplateBubble,
} from "./ChatWindow";
import type { Message } from "@/store/chatStore";

const COMPONENTS = {
  header:  { format: "IMAGE", mediaUrl: "https://cdn/x.jpg" },
  body:    { text: "Hi {{name}}, your booking {{ref}} is confirmed." },
  footer:  { text: "Vaketta Hotels" },
  buttons: [{ type: "URL" as const, text: "View", url: "https://x.test" }],
};

const VALUES = { name: "Sam", ref: "BK-1" };

/** The exact row templates.service persists for the same send. */
function persistedRow(body: string): Message {
  return {
    id: "real-1", direction: "OUT", body, messageType: "template",
    mediaUrl: null, mimeType: null, fileName: null,
    timestamp: "2026-07-29T10:00:00.000Z", status: "SENT",
    guestId: "g1", deleted: false, deletedBy: null, jobId: null,
  };
}

describe("renderTemplateBody", () => {
  it("interpolates {{var}} placeholders", () => {
    expect(renderTemplateBody("Hi {{name}}!", { name: "Sam" })).toBe("Hi Sam!");
  });

  it("leaves unknown placeholders intact (matches backend behavior)", () => {
    expect(renderTemplateBody("Hi {{name}}!", {})).toBe("Hi {{name}}!");
  });

  it("tolerates whitespace inside the braces", () => {
    expect(renderTemplateBody("Hi {{ name }}!", { name: "Sam" })).toBe("Hi Sam!");
  });
});

describe("buildTemplateMessageBody — matches the persisted shape", () => {
  it("produces {renderedBody, components} JSON, never the raw payload", () => {
    const parsed = JSON.parse(buildTemplateMessageBody(COMPONENTS, VALUES));

    expect(parsed.renderedBody).toBe("Hi Sam, your booking BK-1 is confirmed.");
    expect(parsed.components.body.text).toBe("Hi Sam, your booking BK-1 is confirmed.");
    expect(parsed.components.header).toEqual({
      format: "IMAGE", text: undefined, mediaUrl: "https://cdn/x.jpg", sampleUrl: undefined,
    });
    expect(parsed.components.footer).toEqual({ text: "Vaketta Hotels" });
    expect(parsed.components.buttons).toHaveLength(1);
  });

  it("omits header/footer/buttons when the template has none", () => {
    const parsed = JSON.parse(buildTemplateMessageBody({ body: { text: "Plain" } }, {}));

    expect(parsed.components.header).toBeUndefined();
    expect(parsed.components.footer).toBeUndefined();
    expect(parsed.components.buttons).toBeUndefined();
    expect(parsed.renderedBody).toBe("Plain");
  });

  it("drops a header format the backend never emits", () => {
    const parsed = JSON.parse(
      buildTemplateMessageBody({ header: { format: "LOCATION" }, body: { text: "x" } }, {})
    );
    expect(parsed.components.header.format).toBeUndefined();
  });

  it("reads header.type when format is absent", () => {
    const parsed = JSON.parse(
      buildTemplateMessageBody({ header: { type: "TEXT", text: "Hello" }, body: { text: "x" } }, {})
    );
    expect(parsed.components.header.format).toBe("TEXT");
  });
});

describe("resolveTemplateBubble — optimistic and persisted render identically", () => {
  it("resolves the optimistic body to the same meta+body as the persisted row", () => {
    const body = buildTemplateMessageBody(COMPONENTS, VALUES);

    const optimistic = resolveTemplateBubble({ ...persistedRow(body), id: "tmp_1", status: "SENDING" });
    const persisted  = resolveTemplateBubble(persistedRow(body));

    expect(optimistic).toEqual(persisted);
    expect(optimistic.body).toBe("Hi Sam, your booking BK-1 is confirmed.");
    expect(optimistic.meta?.header?.mediaUrl).toBe("https://cdn/x.jpg");
  });

  it("never surfaces raw JSON as the bubble text", () => {
    const { body } = resolveTemplateBubble(persistedRow(buildTemplateMessageBody(COMPONENTS, VALUES)));

    expect(body).not.toContain("renderedBody");
    expect(body).not.toContain("components");
    expect(body).not.toContain("{");
  });

  it("falls back to plain text for a non-JSON body (legacy rows)", () => {
    const { meta, body } = resolveTemplateBubble(persistedRow("just text"));

    expect(meta).toBeNull();
    expect(body).toBe("just text");
  });

  it("prefers an in-memory template field when present (legacy path)", () => {
    const row = { ...persistedRow("plain"), template: { body: { text: "from meta" } } };

    expect(resolveTemplateBubble(row).meta).toEqual({ body: { text: "from meta" } });
  });

  it("returns no meta for non-template messages", () => {
    const row = { ...persistedRow("hello"), messageType: "text" };

    expect(resolveTemplateBubble(row).meta).toBeNull();
    expect(resolveTemplateBubble(row).body).toBe("hello");
  });
});
