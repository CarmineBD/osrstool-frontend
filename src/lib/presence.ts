import { authFetch } from "@/lib/http";

const LEGACY_PRESENCE_VISITOR_ID_STORAGE_KEY = "osrs-tool-presence-visitor-id";
export const PRESENCE_HEARTBEAT_INTERVAL_MS = 60_000;
let ephemeralPresenceVisitorId: string | null = null;
let hasRemovedLegacyPresenceVisitorId = false;

function resolveApiUrl(): string {
  const directUrl =
    (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  const useProxy =
    import.meta.env.DEV &&
    (import.meta.env.VITE_API_USE_PROXY as string | undefined) !== "false";

  if (useProxy) {
    return "/api";
  }

  return directUrl?.replace(/\/$/, "") ?? "";
}

const API_URL = resolveApiUrl();

function toApiUrl(path: string): URL {
  if (!API_URL) {
    throw new Error("VITE_API_URL is missing");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (/^https?:\/\//i.test(API_URL)) {
    return new URL(`${API_URL}${normalizedPath}`);
  }

  return new URL(`${API_URL}${normalizedPath}`, window.location.origin);
}

function parseApiErrorMessage(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const message = (value as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : undefined;
}

async function getApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const json: unknown = await response.json();
    return parseApiErrorMessage(json) ?? fallback;
  } catch {
    return fallback;
  }
}

function buildFallbackVisitorId(): string {
  return `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreatePresenceVisitorId(): string {
  if (ephemeralPresenceVisitorId) {
    return ephemeralPresenceVisitorId;
  }

  if (typeof window === "undefined") {
    ephemeralPresenceVisitorId = buildFallbackVisitorId();
    return ephemeralPresenceVisitorId;
  }

  if (!hasRemovedLegacyPresenceVisitorId) {
    window.localStorage.removeItem(LEGACY_PRESENCE_VISITOR_ID_STORAGE_KEY);
    hasRemovedLegacyPresenceVisitorId = true;
  }

  ephemeralPresenceVisitorId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : buildFallbackVisitorId();
  return ephemeralPresenceVisitorId;
}

export type PresenceOnlineResponse = {
  online: number;
};

export async function sendPresenceHeartbeat(
  visitorId: string,
): Promise<PresenceOnlineResponse> {
  const response = await authFetch(toApiUrl("/presence/heartbeat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId }),
  });

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        `HTTP ${response.status} - Error posting /presence/heartbeat`,
      ),
    );
  }

  return (await response.json()) as PresenceOnlineResponse;
}

export async function fetchPresenceOnline(): Promise<PresenceOnlineResponse> {
  const response = await fetch(toApiUrl("/presence/online"), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        `HTTP ${response.status} - Error fetching /presence/online`,
      ),
    );
  }

  return (await response.json()) as PresenceOnlineResponse;
}
