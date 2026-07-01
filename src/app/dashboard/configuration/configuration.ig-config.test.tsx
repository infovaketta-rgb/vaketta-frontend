/**
 * Instagram connect — Business Login for Instagram (code flow).
 *
 * Tests:
 *   1. Missing NEXT_PUBLIC_INSTAGRAM_APP_ID + no saved URL → error shown, no redirect.
 *   2. Valid saved instagramEmbedUrl returned by API → used directly, no fallback.
 *   3. Invalid saved URL → fallback to computed URL from NEXT_PUBLIC_INSTAGRAM_APP_ID.
 *   4. Empty saved URL → fallback to computed URL (correct scopes, instagram.com host).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: any[]) => apiFetch(...args) }));
vi.mock("@/lib/useMounted", () => ({ useMounted: () => true }));
vi.mock("@/lib/auth", () => ({ saveHotelName: vi.fn() }));

import ConfigurationPage from "./page";

const VALID_SAVED_URL =
  "https://www.instagram.com/oauth/authorize" +
  "?client_id=850762578056255" +
  "&redirect_uri=https%3A%2F%2Fvaketta.com%2Fdashboard%2Fconfiguration" +
  "&scope=instagram_business_basic%2Cinstagram_business_manage_messages" +
  "&response_type=code";

/** Wire all API calls; instagramEmbedUrl defaults to empty (triggers fallback). */
function wireApi(igOverrides: Record<string, unknown> = {}) {
  apiFetch.mockImplementation((path: string) => {
    switch (path) {
      case "/hotel-settings":
        return Promise.resolve({});
      case "/hotel-settings/whatsapp":
        return Promise.resolve({ connected: false });
      case "/hotel-settings/instagram":
        return Promise.resolve({
          accessToken: "", igAccountId: "", connected: false,
          instagramEmbedUrl: "",
          ...igOverrides,
        });
      default:
        return Promise.resolve({});
    }
  });
}

/** Find the Instagram section's connect button. */
function igConnectButton() {
  const heading = screen.getByRole("heading", { name: /instagram integration/i });
  const section = heading.closest("div")!.parentElement!.parentElement!;
  return within(section as HTMLElement).getByRole("button", { name: /connect instagram/i });
}

let assignSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  assignSpy = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      origin:   "https://vaketta.com",
      pathname: "/dashboard/configuration",
      search:   "",
      hash:     "",
      href:     "https://vaketta.com/dashboard/configuration",
      assign:   assignSpy,
    },
  });
});

describe("Instagram connect — missing App ID and no saved URL", () => {
  it("shows a clear error and does NOT redirect", async () => {
    delete process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
    wireApi({ instagramEmbedUrl: "" });
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    await screen.findByRole("heading", { name: /instagram integration/i });
    await user.click(igConnectButton());

    expect(
      await screen.findByText(/instagram app id is not configured/i)
    ).toBeInTheDocument();
    expect(assignSpy).not.toHaveBeenCalled();
  });
});

describe("Instagram connect — saved URL (valid override)", () => {
  it("(b) uses the saved instagramEmbedUrl directly without falling back", async () => {
    process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID = "850762578056255";
    wireApi({ instagramEmbedUrl: VALID_SAVED_URL });
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    await screen.findByRole("heading", { name: /instagram integration/i });
    await user.click(igConnectButton());

    await waitFor(() => expect(assignSpy).toHaveBeenCalledTimes(1));
    const url = assignSpy.mock.calls[0]![0] as string;
    expect(url).toBe(VALID_SAVED_URL);
  });
});

describe("Instagram connect — fallback to computed URL", () => {
  it("(d) empty saved URL → builds correct URL from NEXT_PUBLIC_INSTAGRAM_APP_ID", async () => {
    process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID = "850762578056255";
    wireApi({ instagramEmbedUrl: "" });
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    await screen.findByRole("heading", { name: /instagram integration/i });
    await user.click(igConnectButton());

    await waitFor(() => expect(assignSpy).toHaveBeenCalledTimes(1));
    const url = assignSpy.mock.calls[0]![0] as string;

    expect(url).toContain("https://www.instagram.com/oauth/authorize");
    expect(url).toContain("client_id=850762578056255");
    expect(url).toContain("response_type=code");
    expect(url).toContain(encodeURIComponent("instagram_business_basic"));
    expect(url).toContain(encodeURIComponent("https://vaketta.com/dashboard/configuration"));
    // Must NOT use the old Facebook dialog or old scopes
    expect(url).not.toContain("facebook.com");
    expect(url).not.toContain("instagram_basic");
    expect(url).not.toContain("response_type=token");
  });

  it("(c) invalid saved URL → falls back to computed URL with console.warn", async () => {
    process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID = "850762578056255";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    wireApi({ instagramEmbedUrl: "https://graph.facebook.com/bad-url" });
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    await screen.findByRole("heading", { name: /instagram integration/i });
    await user.click(igConnectButton());

    await waitFor(() => expect(assignSpy).toHaveBeenCalledTimes(1));
    const url = assignSpy.mock.calls[0]![0] as string;

    // Must fall back — the saved URL pointed at graph.facebook.com
    expect(url).toContain("www.instagram.com/oauth/authorize");
    expect(url).not.toContain("graph.facebook.com");

    // Fallback must have triggered the console warning
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("falling back"),
    );
    warnSpy.mockRestore();
  });
});
