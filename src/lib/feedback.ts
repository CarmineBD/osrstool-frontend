import { authFetch } from "@/lib/http";

export const FEEDBACK_TYPES = [
  "feature",
  "bug",
  "improvement",
  "other",
] as const;

export const FEEDBACK_STATUSES = [
  "new",
  "considering",
  "planned",
  "completed",
  "rejected",
] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export type FeedbackCreatedBy = {
  id: string;
  username: string;
};

export type FeedbackSummary = {
  id: string;
  type: FeedbackType;
  status: FeedbackStatus;
  createdAt: string;
  createdBy: FeedbackCreatedBy;
};

export type FeedbackDetail = FeedbackSummary & {
  content: string;
};

export type FeedbackListResponse = {
  feedback: FeedbackSummary[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    hasNext: boolean;
  };
};

function resolveApiUrl(): string {
  const directUrl =
    (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  const useProxy =
    import.meta.env.DEV &&
    (import.meta.env.VITE_API_USE_PROXY as string | undefined) !== "false";

  if (useProxy) return "/api";
  return directUrl?.replace(/\/$/, "") ?? "";
}

function toApiUrl(path: string): URL {
  const apiUrl = resolveApiUrl();
  if (!apiUrl) throw new Error("VITE_API_URL is missing");

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (/^https?:\/\//i.test(apiUrl)) return new URL(`${apiUrl}${normalizedPath}`);
  return new URL(`${apiUrl}${normalizedPath}`, window.location.origin);
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const value: unknown = await response.json();
    if (!value || typeof value !== "object") return fallback;
    const root = value as { message?: unknown; error?: { message?: unknown } };
    if (typeof root.message === "string" && root.message.trim()) return root.message;
    if (typeof root.error?.message === "string" && root.error.message.trim()) {
      return root.error.message;
    }
  } catch {
    // Use the endpoint-specific fallback when the response body is not JSON.
  }
  return fallback;
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) throw new Error(await getErrorMessage(response, fallback));
  return (await response.json()) as T;
}

export async function createFeedback(input: {
  type: FeedbackType;
  content: string;
}): Promise<FeedbackDetail> {
  const response = await authFetch(toApiUrl("/feedback"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseResponse<{ feedback?: FeedbackDetail }>(
    response,
    `HTTP ${response.status} - Unable to send feedback`,
  );
  if (!json.feedback) throw new Error("Feedback response is missing feedback");
  return json.feedback;
}

export async function fetchAdminFeedback(
  page: number,
  perPage: number,
): Promise<FeedbackListResponse> {
  const url = toApiUrl("/feedback");
  url.searchParams.set("page", String(page));
  url.searchParams.set("perPage", String(perPage));
  const response = await authFetch(url, { method: "GET", cache: "no-store" });
  return parseResponse<FeedbackListResponse>(
    response,
    `HTTP ${response.status} - Unable to load feedback`,
  );
}

export async function fetchAdminFeedbackDetail(id: string): Promise<FeedbackDetail> {
  const response = await authFetch(toApiUrl(`/feedback/${encodeURIComponent(id)}`), {
    method: "GET",
    cache: "no-store",
  });
  const json = await parseResponse<{ feedback?: FeedbackDetail }>(
    response,
    `HTTP ${response.status} - Unable to load feedback details`,
  );
  if (!json.feedback) throw new Error("Feedback detail response is missing feedback");
  return json.feedback;
}

export async function updateAdminFeedbackStatus(
  id: string,
  status: FeedbackStatus,
): Promise<FeedbackDetail> {
  const response = await authFetch(toApiUrl(`/feedback/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const json = await parseResponse<{ feedback?: FeedbackDetail }>(
    response,
    `HTTP ${response.status} - Unable to update feedback`,
  );
  if (!json.feedback) throw new Error("Feedback update response is missing feedback");
  return json.feedback;
}
