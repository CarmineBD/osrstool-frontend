import { authFetch } from "@/lib/http";

export type MeData = {
  id: string;
  email: string;
  username: string | null;
  plan?: string;
  role?: string;
  likes?: number;
  likesCount?: number;
  terms?: {
    currentVersion: string;
    accepted: boolean;
  };
};

export type MeResponse = {
  data?: MeData;
};

export type DeleteMeResponse = {
  data?: {
    deleted?: boolean;
  };
};

export const ME_QUERY_KEY = ["me"] as const;

export class MeRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MeRequestError";
    this.status = status;
  }
}

function resolveApiUrl(): string {
  const useProxy =
    import.meta.env.DEV &&
    (import.meta.env.VITE_API_USE_PROXY as string | undefined) !== "false";
  const apiUrl = useProxy
    ? "/api"
    : (
        (import.meta.env.VITE_API_URL as string | undefined) ||
        (import.meta.env.VITE_API_BASE_URL as string | undefined)
      )?.replace(/\/$/, "");

  if (!apiUrl) {
    throw new Error("VITE_API_URL is missing");
  }

  return apiUrl;
}

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
  const normalizedUsername =
    typeof data.username === "string" && data.username.trim().length > 0
      ? data.username
      : null;
  const rawTerms =
    data.terms && typeof data.terms === "object"
      ? (data.terms as Record<string, unknown>)
      : null;
  const normalizedTerms =
    rawTerms &&
    typeof rawTerms.currentVersion === "string" &&
    rawTerms.currentVersion.trim().length > 0 &&
    typeof rawTerms.accepted === "boolean"
      ? {
          currentVersion: rawTerms.currentVersion.trim(),
          accepted: rawTerms.accepted,
        }
      : undefined;

  return {
    ...response,
    data: {
      ...data,
      username: normalizedUsername,
      ...(normalizedTerms ? { terms: normalizedTerms } : {}),
      ...(normalizedLikes === undefined
        ? {}
        : {
            likes: normalizedLikes,
            likesCount: normalizedLikes,
          }),
    },
  };
}

function parseErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const root = value as Record<string, unknown>;
  if (typeof root.message === "string" && root.message.trim().length > 0) {
    return root.message;
  }

  const nestedError =
    root.error && typeof root.error === "object"
      ? (root.error as Record<string, unknown>)
      : undefined;

  if (
    nestedError &&
    typeof nestedError.message === "string" &&
    nestedError.message.trim().length > 0
  ) {
    return nestedError.message;
  }

  return null;
}

export async function fetchMe(): Promise<MeResponse> {
  const apiUrl = resolveApiUrl();

  const usersMeResponse = await authFetch(`${apiUrl}/users/me`, {
    method: "GET",
  });

  if (usersMeResponse.ok) {
    const payload: unknown = await usersMeResponse.json();
    return normalizeMeResponse(payload);
  }

  if (usersMeResponse.status !== 404) {
    throw new Error(
      `HTTP ${usersMeResponse.status} - Error fetching /users/me`,
    );
  }

  const meResponse = await authFetch(`${apiUrl}/me`, { method: "GET" });
  if (!meResponse.ok) {
    throw new Error(`HTTP ${meResponse.status} - Error fetching /me`);
  }

  const payload: unknown = await meResponse.json();
  return normalizeMeResponse(payload);
}

export async function completeAccountUsername(
  username: string,
): Promise<{ data?: { username: string | null } }> {
  const apiUrl = resolveApiUrl();

  const primaryResponse = await authFetch(
    `${apiUrl}/users/me/account-username`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    },
  );

  let response = primaryResponse;
  if (primaryResponse.status === 404) {
    response = await authFetch(`${apiUrl}/me/account-username`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });
  }

  if (!response.ok) {
    let message = `HTTP ${response.status} - Error completing account username`;

    try {
      const payload: unknown = await response.json();
      message = parseErrorMessage(payload) ?? message;
    } catch {
      // Ignore invalid error bodies and preserve the fallback message.
    }

    throw new MeRequestError(message, response.status);
  }

  const payload: unknown = await response.json();
  return payload as { data?: { username: string | null } };
}

export async function acceptCurrentTerms(): Promise<{
  data?: {
    terms?: {
      currentVersion: string;
      accepted: boolean;
    };
  };
}> {
  const apiUrl = resolveApiUrl();

  const primaryResponse = await authFetch(
    `${apiUrl}/users/me/terms/acceptance`,
    {
      method: "POST",
    },
  );

  let response = primaryResponse;
  if (primaryResponse.status === 404) {
    response = await authFetch(`${apiUrl}/me/terms/acceptance`, {
      method: "POST",
    });
  }

  if (!response.ok) {
    let message = `HTTP ${response.status} - Error accepting current terms`;

    try {
      const payload: unknown = await response.json();
      message = parseErrorMessage(payload) ?? message;
    } catch {
      // Ignore invalid error bodies and preserve the fallback message.
    }

    throw new MeRequestError(message, response.status);
  }

  const payload: unknown = await response.json();
  return payload as {
    data?: {
      terms?: {
        currentVersion: string;
        accepted: boolean;
      };
    };
  };
}

export async function deleteCurrentUser(): Promise<DeleteMeResponse> {
  const apiUrl = resolveApiUrl();

  const primaryResponse = await authFetch(`${apiUrl}/users/me`, {
    method: "DELETE",
  });

  let response = primaryResponse;
  if (primaryResponse.status === 404) {
    response = await authFetch(`${apiUrl}/me`, {
      method: "DELETE",
    });
  }

  if (!response.ok) {
    let message = `HTTP ${response.status} - Error deleting account`;

    try {
      const payload: unknown = await response.json();
      message = parseErrorMessage(payload) ?? message;
    } catch {
      // Ignore invalid error bodies and preserve the fallback message.
    }

    throw new MeRequestError(message, response.status);
  }

  const payload: unknown = await response.json();
  return payload as DeleteMeResponse;
}
