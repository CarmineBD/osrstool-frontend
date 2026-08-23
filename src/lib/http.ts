import { supabase } from "./supabaseClient";

const authFetchUserIds = new WeakMap<Response, string | null>();

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init?.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });
  authFetchUserIds.set(response, data.session?.user?.id ?? null);
  return response;
}

export function getAuthFetchUserId(response: Response): string | null {
  return authFetchUserIds.get(response) ?? null;
}
