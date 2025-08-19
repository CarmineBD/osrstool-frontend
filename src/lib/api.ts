// src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL as string;

export interface Method {
  id: string;
  name: string;
  category: string;
  variants: Variant[];
}

type ItemRequirement = {
  id: number;
  quantity: number;
  reason?: string;
};

type LevelRequirement = {
  skill: string;
  level: number;
  reason?: string;
};

type QuestRequirement = {
  name: string;
  stage: number;
  reason?: string;
};

type DiaryRequirement = {
  name: string;
  tier: number;
  reason?: string;
};

type Requirement = {
  items?: ItemRequirement[];
  levels?: LevelRequirement[];
  quests?: QuestRequirement[];
  achievement_diaries?: DiaryRequirement[];
};

export interface Variant {
  id?: string;
  label: string;
  description?: string;
  afkiness?: number;
  clickIntensity?: number;
  riskLevel?: string;
  wilderness?: boolean;
  xpHour?: { skill: string; experience: number }[];
  requirements: Requirement;
  recommendations?: Requirement;
  highProfit?: number;
  lowProfit?: number;
  missingRequirements?: { id: number; name: string; level: number }[];
  inputs: { id: number; quantity: number }[];
  outputs: { id: number; quantity: number }[];
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

export interface Item {
  name: string;
  iconUrl: string;
  highPrice?: number;
  lowPrice?: number;
}

export async function fetchItems(
  ids: number[]
): Promise<Record<number, Item>> {
  const url = new URL(`${API_URL}/items`);
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("fields", "name,iconUrl,highPrice,lowPrice");
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – Error fetching items`);
  }
  const json = await res.json();
  return json.data ?? json;
}
