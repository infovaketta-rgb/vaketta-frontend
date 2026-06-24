/**
 * Instagram connect — manual OAuth redirect (token flow, no code exchange).
 *
 * Confirmed working URL shape (manually tested):
 *   facebook.com/<v>/dialog/oauth?client_id=…&redirect_uri=…&response_type=token
 *   &scope=instagram_basic,pages_show_list,instagram_manage_messages
 * No extras, no display, no config_id gate.
 *
 * Tests:
 *   1. Missing NEXT_PUBLIC_META_APP_ID → error shown, NO redirect.
 *   2. App ID present → redirects to the dialog with the correct params.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the page's module dependencies.
const apiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: any[]) => apiFetch(...args) }));
vi.mock("@/lib/useMounted", () => ({ useMounted: () => true }));
vi.mock("@/lib/auth", () => ({ saveHotelName: vi.fn() }));

import ConfigurationPage from "./page";

/** Default mount-time GET responses. */
function wireApi() {
  apiFetch.mockImplementation((path: string) => {
    switch (path) {
      case "/hotel-settings":
        return Promise.resolve({});
      case "/hotel-settings/whatsapp":
        return Promise.resolve({ connected: false });
      case "/hotel-settings/instagram":
        return Promise.resolve({ accessToken: "", igAccountId: "", connected: false, configId: "" });
      case "/hotel-settings/instagram/subscribe/status":
        return Promise.resolve({ subscribed: false });
      default:
        return Promise.resolve({});
    }
  });
}

/** Find the Instagram section's "Connect via Facebook" button. */
function igConnectButton() {
  const heading = screen.getByRole("heading", { name: /instagram integration/i });
  const section = heading.closest("div")!.parentElement!.parentElement!;
  return within(section as HTMLElement).getByRole("button", { name: /connect via facebook/i });
}

let assignSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Stub navigation so the redirect doesn't actually happen in jsdom.
  assignSpy = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      origin: "https://vaketta.com",
      pathname: "/dashboard/configuration",
      search: "",
      hash: "",
      href: "https://vaketta.com/dashboard/configuration",
      assign: assignSpy,
    },
  });
});

describe("Instagram connect — missing App ID guard", () => {
  it("shows a clear error and does NOT redirect when NEXT_PUBLIC_META_APP_ID is unset", async () => {
    delete process.env.NEXT_PUBLIC_META_APP_ID;
    wireApi();
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    await screen.findByRole("heading", { name: /instagram integration/i });
    await user.click(igConnectButton());

    expect(
      await screen.findByText(/facebook app id is not configured/i)
    ).toBeInTheDocument();
    expect(assignSpy).not.toHaveBeenCalled();
  });
});

describe("Instagram connect — OAuth redirect", () => {
  it("redirects to the dialog with response_type=token and correct scope when App ID is present", async () => {
    process.env.NEXT_PUBLIC_META_APP_ID = "1268699038798227";
    wireApi();
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    await screen.findByRole("heading", { name: /instagram integration/i });
    await user.click(igConnectButton());

    await waitFor(() => expect(assignSpy).toHaveBeenCalledTimes(1));
    const url = assignSpy.mock.calls[0][0] as string;

    expect(url).toContain("https://www.facebook.com/");
    expect(url).toContain("/dialog/oauth");
    expect(url).toContain("client_id=1268699038798227");
    expect(url).toContain("response_type=token");
    // redirect_uri = this page's canonical URL
    expect(url).toContain(encodeURIComponent("https://vaketta.com/dashboard/configuration"));
    // Confirmed working scope (no extras, no openid, no pages_messaging)
    expect(url).toContain(encodeURIComponent("instagram_basic,pages_show_list,instagram_manage_messages"));
    // Must NOT use the code grant or the IG_API_ONBOARDING extras
    expect(url).not.toContain("response_type=code");
    expect(url).not.toContain("IG_API_ONBOARDING");
    expect(url).not.toContain("extras");
  });
});
