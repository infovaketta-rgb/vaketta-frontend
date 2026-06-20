/**
 * Instagram connect — empty-config_id UI error path.
 *
 * The config_id-based FB.login() flow requires PlatformSettings.instagramConfigId,
 * surfaced to the dashboard via GET /hotel-settings/instagram as `configId`. When it
 * is empty, clicking "Connect via Facebook" must show a clear error and must NOT call
 * FB.login() with an undefined config_id.
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

beforeEach(() => {
  vi.clearAllMocks();
  // FB SDK present so the guard (not the "SDK not loaded" branch) is what fires.
  (window as any).FB = { login: vi.fn() };
});

describe("Instagram connect — empty configId guard", () => {
  it("shows a clear error and does NOT call FB.login() when configId is empty", async () => {
    wireApi({ accessToken: "", igAccountId: "", connected: false, configId: "" });
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    // Wait for the IG section to render (mount-time fetch resolved).
    await screen.findByRole("heading", { name: /instagram integration/i });

    await user.click(igConnectButton());

    expect(
      await screen.findByText(/instagram onboarding is not configured/i)
    ).toBeInTheDocument();
    expect((window as any).FB.login).not.toHaveBeenCalled();
  });

  it("calls FB.login() with config_id when configId is present", async () => {
    wireApi({ accessToken: "", igAccountId: "", connected: false, configId: "1594195311668034" });
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    await screen.findByRole("heading", { name: /instagram integration/i });

    await user.click(igConnectButton());

    await waitFor(() => expect((window as any).FB.login).toHaveBeenCalledTimes(1));
    const opts = (window as any).FB.login.mock.calls[0][1];
    expect(opts).toMatchObject({ config_id: "1594195311668034", response_type: "code" });
    // no error shown
    expect(screen.queryByText(/instagram onboarding is not configured/i)).not.toBeInTheDocument();
  });
});
