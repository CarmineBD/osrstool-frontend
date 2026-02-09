import { authFetch } from "@/lib/http";

export type MeData = {
  id: string;
  email: string;
  plan?: string;
  role?: string;
  likes?: number;
  likesCount?: number;
};

export type MeResponse = {
  data?: MeData;
};

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeMeResponse(value: unknown): MeResponse {
  const response = (value ?? {}) as MeResponse;
  const data = response.data;
  if (!data) return response;

  const normalizedLikes = toNumber(data.likesCount ?? data.likes);
  if (normalizedLikes === undefined) {
    return response;
  }

  return {
    ...response,
    data: {
      ...data,
      likes: normalizedLikes,
      likesCount: normalizedLikes,
    },
  };
}

export async function fetchMe(): Promise<MeResponse> {
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(
    /\/$/,
    ""
  );

  if (!apiUrl) {
    throw new Error("VITE_API_URL is missing");
  }

  const usersMeResponse = await authFetch(`${apiUrl}/users/me`, {
    method: "GET",
  });

  if (usersMeResponse.ok) {
    const payload: unknown = await usersMeResponse.json();
    return normalizeMeResponse(payload);
  }

  if (usersMeResponse.status !== 404) {
    throw new Error(`HTTP ${usersMeResponse.status} - Error fetching /users/me`);
  }

  const meResponse = await authFetch(`${apiUrl}/me`, { method: "GET" });
  if (!meResponse.ok) {
    throw new Error(`HTTP ${meResponse.status} - Error fetching /me`);
  }

  const payload: unknown = await meResponse.json();
  return normalizeMeResponse(payload);
}
