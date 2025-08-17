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
  stage: number;
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

  const normalizeXpHour = (
    xp: unknown
  ): { skill: string; experience: number }[] =>
    Array.isArray(xp)
      ? xp
      : xp && typeof xp === "object"
      ? Object.entries(xp as Record<string, number>).map(
          ([skill, experience]) => ({
            skill,
            experience: Number(experience),
          })
        )
      : [];

  const normalizeLevels = (levels: unknown): LevelRequirement[] =>
    Array.isArray(levels)
      ? levels
      : levels && typeof levels === "object"
      ? Object.entries(levels as Record<string, number>).map(
          ([skill, level]) => ({
            skill,
            level: Number(level),
          })
        )
      : [];

  const normalizeQuests = (quests: unknown): QuestRequirement[] =>
    Array.isArray(quests)
      ? quests
      : quests && typeof quests === "object"
      ? Object.entries(quests as Record<string, number>).map(
          ([name, stage]) => ({
            name,
            stage: Number(stage),
          })
        )
      : [];

  const normalizeDiaries = (diaries: unknown): DiaryRequirement[] =>
    Array.isArray(diaries)
      ? diaries
      : diaries && typeof diaries === "object"
      ? Object.entries(diaries as Record<string, number>).map(
          ([name, stage]) => ({
            name,
            stage: Number(stage),
          })
        )
      : [];

  const normalizeRequirement = (req: unknown): Requirement => {
    if (!req || typeof req !== "object") {
      return {
        items: [],
        levels: [],
        quests: [],
        achievement_diaries: [],
      };
    }
    const r = req as {
      items?: ItemRequirement[];
      levels?: unknown;
      quests?: unknown;
      achievement_diaries?: unknown;
    };
    return {
      items: r.items ?? [],
      levels: normalizeLevels(r.levels),
      quests: normalizeQuests(r.quests),
      achievement_diaries: normalizeDiaries(r.achievement_diaries),
    };
  };

  const methods = json.data as Method[];
  return methods.map((method) => ({
    ...method,
    variants: method.variants.map((v) => ({
      ...v,
      xpHour: normalizeXpHour(v.xpHour),
      requirements: normalizeRequirement(v.requirements),
      recommendations: normalizeRequirement(v.recommendations),
    })),
  }));
}
