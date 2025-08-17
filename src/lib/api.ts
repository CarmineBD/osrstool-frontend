// src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL as string;

export interface Method {
  id: string;
  name: string;
  category: string;
  variants: Variant[];
}

type Requirement = {
  items: { id: number; quantity: number }[];
  levels: Record<string, number>;
  quests: Record<string, number>;
  achievement_diaries: Record<string, number>;
};

export interface Variant {
  id: string;
  label: string;
  afkiness: number;
  clickIntensity: number;
  riskLevel: string;
  xpHour: Record<string, number>;
  requirements: Requirement;
  recommendations: Requirement;
  highProfit: number;
  lowProfit: number;
  missingRequirements?: {
    items: { id: number; quantity: number }[];
    levels: Record<string, number>;
    quests: Record<string, number>;
    achievement_diaries: Record<string, number>;
  };

  inputs: { id: string; quantity: number }[];
  outputs: { id: string; quantity: number }[];
  description?: string;
}

export async function fetchMethods(username?: string): Promise<Method[]> {
  const url = new URL(`${API_URL}/methods`);
  if (username) url.searchParams.set("username", username);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – Error fetching methods`);
  }
  const json = await res.json();
  return json.data;
}
