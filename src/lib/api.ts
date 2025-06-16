// src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL as string;

export interface Method {
  id: string;
  name: string;
  gpPerHour: number;
}

export async function fetchMethods(): Promise<Method[]> {
  const res = await fetch(`${API_URL}/methods`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – Error fetching methods`);
  }
  return res.json();
}
