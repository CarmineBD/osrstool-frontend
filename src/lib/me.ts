import { authFetch } from "@/lib/http";

export type MeData = {
  id: string;
  email: string;
  plan: string;
  role: string;
};

export type MeResponse = {
  data?: MeData;
};

export async function fetchMe(): Promise<MeResponse> {
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(
    /\/$/,
    ""
  );

  if (!apiUrl) {
    throw new Error("VITE_API_URL is missing");
  }

  const response = await authFetch(`${apiUrl}/me`, { method: "GET" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} - Error fetching /me`);
  }

  return (await response.json()) as MeResponse;
}
