// src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL as string;

export interface Method {
  id: string;
  name: string;
  gpPerHour: number;
}

export async function fetchMethods(username?: string): Promise<Method[]> {
  const url = new URL(`${API_URL}/methods`);
  if (username) {
    url.searchParams.set("username", username);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – Error fetching methods`);
  }
  return res.json();
}
