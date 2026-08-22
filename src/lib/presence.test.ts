import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchPresenceOnline,
  getOrCreatePresenceVisitorId,
  sendPresenceHeartbeat,
} from "@/lib/presence";

vi.mock("@/lib/http", () => ({
  authFetch: vi.fn(),
}));

import { authFetch } from "@/lib/http";

describe("presence helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("creates one in-memory visitor id without persisting it", () => {
    window.localStorage.setItem(
      "osrs-tool-presence-visitor-id",
      "legacy-visitor-id",
    );

    const first = getOrCreatePresenceVisitorId();
    const second = getOrCreatePresenceVisitorId();

    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(window.localStorage.length).toBe(0);
  });

  it("posts the anonymous visitor id to the heartbeat endpoint", async () => {
    vi.mocked(authFetch).mockResolvedValue(
      new Response(JSON.stringify({ online: 127 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await sendPresenceHeartbeat("visitor-123");

    expect(authFetch).toHaveBeenCalledTimes(1);
    const requestInput = vi.mocked(authFetch).mock.calls[0]?.[0];
    const requestUrl =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;
    const requestInit = vi.mocked(authFetch).mock.calls[0]?.[1];
    const url = new URL(requestUrl, window.location.origin);

    expect(url.pathname.endsWith("/presence/heartbeat")).toBe(true);
    expect(requestInit?.method).toBe("POST");
    expect(requestInit?.body).toBe(JSON.stringify({ visitorId: "visitor-123" }));
    expect(result).toEqual({ online: 127 });
  });

  it("loads the public online count endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ online: 33 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(fetchPresenceOnline()).resolves.toEqual({ online: 33 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInput = fetchSpy.mock.calls[0]?.[0];
    const requestUrl =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;
    const url = new URL(requestUrl, window.location.origin);

    expect(url.pathname.endsWith("/presence/online")).toBe(true);

    fetchSpy.mockRestore();
  });
});
