/**
 * Instagram connect — IG_API_ONBOARDING manual-redirect flow.
 *
 * Meta's "Facebook Login for Business / IG_API_ONBOARDING" channel is a manual redirect
 * (NOT FB.login): the client navigates to facebook.com/<v>/dialog/oauth with
 * response_type=token + extras {"setup":{"channel":"IG_API_ONBOARDING"}}; the token comes
 * back in the URL fragment. These tests cover:
 *   - empty configId → clear error, NO redirect.
 *   - present configId → redirects to the dialog URL with the correct params.
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

/** Default mount-time GET responses. `igConfig` overrides /hotel-settings/instagram. */
function wireApi(igConfig: Record<string, unknown>) {
  apiFetch.mockImplementation((path: string) => {
    switch (path) {
      case "/hotel-settings":
        return Promise.resolve({});
      case "/hotel-settings/whatsapp":
        return Promise.resolve({ connected: false });
      case "/hotel-settings/instagram":
        return Promise.resolve(igConfig);
      case "/hotel-settings/instagram/subscribe/status":
        return Promise.resolve({ subscribed: false });
      default:
        return Promise.resolve({});
    }
  });
}

/** Find the Instagram section's "Connect via Facebook" button (there are two on the page). */
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

describe("Instagram connect — empty configId guard", () => {
  it("shows a clear error and does NOT redirect when configId is empty", async () => {
    wireApi({ accessToken: "", igAccountId: "", connected: false, configId: "" });
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    await screen.findByRole("heading", { name: /instagram integration/i });
    await user.click(igConnectButton());

    expect(
      await screen.findByText(/instagram onboarding is not configured/i)
    ).toBeInTheDocument();
    expect(assignSpy).not.toHaveBeenCalled();
  });
});

describe("Instagram connect — IG_API_ONBOARDING redirect", () => {
  it("redirects to the dialog with response_type=token + IG_API_ONBOARDING extras when configId is present", async () => {
    process.env.NEXT_PUBLIC_META_APP_ID = "1268699038798227";
    wireApi({ accessToken: "", igAccountId: "", connected: false, configId: "1866014670744123" });
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
    // extras = URL-encoded {"setup":{"channel":"IG_API_ONBOARDING"}}
    expect(url).toContain(encodeURIComponent(JSON.stringify({ setup: { channel: "IG_API_ONBOARDING" } })));
    // redirect_uri = this page's canonical URL
    expect(url).toContain(encodeURIComponent("https://vaketta.com/dashboard/configuration"));
    // must NOT use the code grant
    expect(url).not.toContain("response_type=code");
    expect(screen.queryByText(/instagram onboarding is not configured/i)).not.toBeInTheDocument();
  });
});
