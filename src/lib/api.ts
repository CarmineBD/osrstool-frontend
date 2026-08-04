// src/lib/api.ts
import { authFetch as apiFetch } from "./http";
import {
  MAX_ACTIONS_PER_HOUR,
  MAX_SKILL_LEVEL,
  SEARCH_QUERY_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  clampInteger,
  normalizeBoundedText,
} from "@/lib/validation";

function resolveApiUrl(): string {
  const directUrl =
    (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  const useProxy =
    import.meta.env.DEV &&
    (import.meta.env.VITE_API_USE_PROXY as string | undefined) !== "false";

  if (useProxy) {
    return "/api";
  }

  return directUrl?.replace(/\/$/, "") ?? "";
}

const API_URL = resolveApiUrl();

function toApiUrl(path: string): URL {
  if (!API_URL) {
    throw new Error("VITE_API_URL is missing");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (/^https?:\/\//i.test(API_URL)) {
    return new URL(`${API_URL}${normalizedPath}`);
  }

  return new URL(`${API_URL}${normalizedPath}`, window.location.origin);
}

export interface Method {
  id: string;
  slug: string;
  name: string;
  category: string;
  description?: string;
  icon_id?: number | null;
  enabled?: boolean;
  likes?: number;
  likedByMe?: boolean;
  variants: Variant[];
  variantCount?: number;
}

export type IoItemType = "input" | "output";

export interface IoItem {
  id: number;
  quantity: number;
  type?: IoItemType;
  reason?: string | null;
}

export interface ProfitGrowth {
  window: string;
  mode: string;
  previousPeriodProfit?: number;
  currentPeriodProfit?: number;
  growthAbs?: number;
  growthPct?: number;
  trendDirection?: "up" | "down" | "flat" | string;
  baselineTimestamp?: string;
  baselineLowProfit?: number;
  baselineHighProfit?: number;
  lowGrowthAbs?: number;
  highGrowthAbs?: number;
  reliableGrowthAbs?: number;
  lowGrowthPct?: number;
  highGrowthPct?: number;
  reliableGrowthPct?: number;
  selectedGrowthAbs?: number;
  selectedGrowthPct?: number;
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

type DiaryTier = number | string;

type DiaryRequirement = {
  name: string;
  tier?: DiaryTier;
  stage?: number;
  reason?: string;
};

type Requirement = {
  items?: ItemRequirement[];
  levels?: LevelRequirement[];
  quests?: QuestRequirement[];
  achievement_diaries?: DiaryRequirement[];
};

export interface VariantTag {
  label: string;
  severity?: 1 | 2 | 3 | null;
  description?: string | null;
}

export type MethodVariantTagKey =
  | "ge_limits"
  | "high_investment_required"
  | "risky_to_lose_money"
  | "not_viable"
  | "safe"
  | "very_slow_to_buy_inputs"
  | "very_slow_to_sell_outputs"
  | (string & {});

export interface MethodVariantTagDefinition {
  key: MethodVariantTagKey;
  label: string;
  severity: 1 | 2 | 3;
  description?: string;
}

export const DEFAULT_IGNORED_METHOD_TAGS: MethodVariantTagKey[] = ["not_viable"];
export const VARIANT_ACTION_TYPE_OPTIONS = [
  "items",
  "kills",
  "rounds",
  "chests",
] as const;
export type VariantActionType = (typeof VARIANT_ACTION_TYPE_OPTIONS)[number];

export interface Variant {
  id?: string;
  slug?: string;
  label: string;
  icon_id?: number | null;
  likes?: number;
  likedByMe?: boolean;
  members: boolean;
  description?: string;
  afkiness?: number;
  clickIntensity?: number;
  riskLevel?: string;
  wilderness?: boolean;
  actionsPerHour?: number;
  actionType?: VariantActionType;
  xpHour: { skill: string; experience: number }[];
  requirements: Requirement;
  recommendations?: Requirement;
  highProfit?: number;
  lowProfit?: number;
  gpPerXpHigh?: number;
  gpPerXpLow?: number;
  marketImpactInstant?: number;
  marketImpactSlow?: number;
  inputMarketImpactInstant?: number;
  inputMarketImpactSlow?: number;
  outputMarketImpactInstant?: number;
  outputMarketImpactSlow?: number;
  trendLastHour?: number;
  trendLast24h?: number;
  trendLastWeek?: number;
  trendLastMonth?: number;
  trendLastYear?: number;
  profitGrowth?: ProfitGrowth;
  missingRequirements?: Requirement;
  tags?: VariantTag[];
  inputs: IoItem[];
  outputs: IoItem[];
}

export interface ApiWarning {
  code: string;
  message: string;
}

export const F2P_VARIANT_CONTAINS_MEMBERS_ITEMS_CODE =
  "F2P_VARIANT_CONTAINS_MEMBERS_ITEMS";

export interface FreeToPlayVariantConflict {
  variantLabel: string;
  variantId?: string;
  variantSlug?: string;
  items: Array<{
    id?: number;
    name: string;
  }>;
  itemNames: string[];
}

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  freeToPlayVariantConflicts?: FreeToPlayVariantConflict[];

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      freeToPlayVariantConflicts?: FreeToPlayVariantConflict[];
    },
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status;
    this.code = options.code;
    this.freeToPlayVariantConflicts = options.freeToPlayVariantConflicts;
  }
}

function isApiWarning(value: unknown): value is ApiWarning {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof (value as { code: unknown }).code === "string" &&
    "message" in value &&
    typeof (value as { message: unknown }).message === "string"
  );
}

function parseWarnings(value: unknown): ApiWarning[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) && value.every(isApiWarning) ? value : undefined;
}

export interface MethodsResponse {
  methods: Method[];
  warnings?: ApiWarning[];
  page?: number;
  perPage?: number;
  total?: number;
  hasNext?: boolean;
  nextCursor?: string;
  pageCount?: number;
}

function parseMethodsFromResponse(value: unknown): Method[] {
  const root =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : undefined;
  const data =
    root?.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : undefined;

  if (Array.isArray(value)) {
    return value as Method[];
  }
  if (Array.isArray(root?.data)) {
    return root.data as Method[];
  }
  if (Array.isArray(data?.methods)) {
    return data.methods as Method[];
  }
  if (Array.isArray(root?.methods)) {
    return root.methods as Method[];
  }

  return [];
}

function normalizeVariant(variant: Variant): Variant {
  return {
    ...variant,
    members: variant.members ?? false,
  };
}

function normalizeMethod(method: Method): Method {
  const variants = (method.variants ?? []).map(normalizeVariant);
  const aggregatedLikes = variants.reduce<number | undefined>((total, variant) => {
    if (typeof variant.likes !== "number") {
      return total;
    }

    return (total ?? 0) + variant.likes;
  }, undefined);

  return {
    ...method,
    ...(typeof method.likes === "number"
      ? { likes: method.likes }
      : typeof aggregatedLikes === "number"
        ? { likes: aggregatedLikes }
        : {}),
    variants,
  };
}

function normalizeMethods(methods: Method[]): Method[] {
  return methods.map(normalizeMethod);
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
}

export interface MethodsFilters {
  category?: "combat" | "collecting" | "processing" | "skilling";
  clickIntensity?: number;
  afkiness?: number;
  riskLevel?: number;
  members?: boolean;
  showOnlyFreeToPlay?: boolean;
  givesExperience?: boolean;
  enabled?: boolean;
  skill?: string;
  variants?: "all";
  showProfitables?: boolean;
  likedByMe?: boolean;
  ignoredTags?: MethodVariantTagKey[];
  sortBy?:
    | "clickIntensity"
    | "afkiness"
    | "xpHour"
    | "highProfit"
    | "likes"
    | "gpPerXpHigh"
    | "gpPerXpLow";
  order?: "asc" | "desc";
}

export async function fetchMethods(
  username?: string,
  page?: number,
  name?: string,
  filters?: MethodsFilters,
  cursor?: string,
): Promise<MethodsResponse> {
  const url = toApiUrl("/methods");
  if (username) {
    url.searchParams.set(
      "username",
      normalizeBoundedText(username.trim(), USERNAME_MAX_LENGTH),
    );
  }
  if (page !== undefined) url.searchParams.set("page", page.toString());
  if (cursor) url.searchParams.set("cursor", cursor);
  if (name) {
    url.searchParams.set("name", normalizeBoundedText(name.trim(), SEARCH_QUERY_MAX_LENGTH));
  }
  if (filters?.category) url.searchParams.set("category", filters.category);
  if (filters?.clickIntensity !== undefined) {
    url.searchParams.set("clickIntensity", filters.clickIntensity.toString());
  }
  if (filters?.afkiness !== undefined) {
    url.searchParams.set("afkiness", filters.afkiness.toString());
  }
  if (filters?.riskLevel !== undefined) {
    url.searchParams.set("riskLevel", filters.riskLevel.toString());
  }
  if (filters?.members !== undefined) {
    url.searchParams.set("members", String(filters.members));
  }
  url.searchParams.set(
    "show_only_free_to_play",
    String(filters?.showOnlyFreeToPlay ?? false),
  );
  if (filters?.givesExperience !== undefined) {
    url.searchParams.set("givesExperience", String(filters.givesExperience));
  }
  if (filters?.enabled !== undefined) {
    url.searchParams.set("enabled", String(filters.enabled));
  }
  if (filters?.skill) url.searchParams.set("skill", filters.skill);
  if (filters?.variants) url.searchParams.set("variants", filters.variants);
  if (filters?.showProfitables !== undefined) {
    url.searchParams.set("showProfitables", String(filters.showProfitables));
  }
  if (filters?.likedByMe !== undefined) {
    url.searchParams.set("likedByMe", String(filters.likedByMe));
  }
  if (filters?.ignoredTags?.length) {
    const uniqueIgnoredTags = Array.from(
      new Set(
        filters.ignoredTags
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      ),
    );
    uniqueIgnoredTags.forEach((tag) => url.searchParams.append("ignoredTags", tag));
  }
  if (filters?.sortBy) url.searchParams.set("sortBy", filters.sortBy);
  if (filters?.order) url.searchParams.set("order", filters.order);

  const res = await apiFetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – Error fetching methods`);
  }
  const json: unknown = await res.json();
  const root =
    json && typeof json === "object"
      ? (json as Record<string, unknown>)
      : undefined;
  const data =
    root?.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : undefined;
  const meta =
    root?.meta && typeof root.meta === "object"
      ? (root.meta as Record<string, unknown>)
      : undefined;
  const dataMeta =
    data?.meta && typeof data.meta === "object"
      ? (data.meta as Record<string, unknown>)
      : undefined;
  const pagination = (data?.pagination ??
    dataMeta?.pagination ??
    root?.pagination ??
    meta?.pagination) as Record<string, unknown> | undefined;

  const methods = normalizeMethods(parseMethodsFromResponse(json));

  const resolvedPage = toNumber(
    data?.page ??
      root?.page ??
      pagination?.page ??
      pagination?.currentPage ??
      pagination?.current_page ??
      meta?.page,
  );
  const perPage = toNumber(
    data?.perPage ??
      data?.pageSize ??
      root?.perPage ??
      root?.pageSize ??
      pagination?.perPage ??
      pagination?.per_page ??
      pagination?.pageSize ??
      pagination?.limit ??
      meta?.perPage ??
      meta?.pageSize ??
      root?.limit,
  );
  const total = toNumber(
    data?.total ??
      root?.total ??
      pagination?.total ??
      pagination?.count ??
      meta?.total ??
      dataMeta?.total,
  );
  const nextCursorValue =
    data?.nextCursor ??
    data?.next_cursor ??
    root?.nextCursor ??
    root?.next_cursor ??
    pagination?.nextCursor ??
    pagination?.next_cursor ??
    meta?.nextCursor ??
    meta?.next_cursor;
  const nextCursor =
    typeof nextCursorValue === "string" && nextCursorValue.trim() !== ""
      ? nextCursorValue
      : undefined;
  const hasNext =
    toBoolean(
      data?.hasNext ??
        data?.has_next ??
        root?.hasNext ??
        root?.has_next ??
        pagination?.hasNext ??
        pagination?.has_next ??
        meta?.hasNext ??
        meta?.has_next,
    ) ?? (nextCursor !== undefined ? true : undefined);

  let pageCount = toNumber(
    data?.pageCount ??
      root?.pageCount ??
      pagination?.pageCount ??
      pagination?.page_count ??
      pagination?.totalPages ??
      pagination?.total_pages ??
      meta?.pageCount ??
      meta?.page_count,
  );

  // Derive pageCount from total/perPage when available.
  if (pageCount === undefined && total !== undefined) {
    const effectivePerPage = perPage ?? 10;
    if (effectivePerPage > 0) {
      pageCount = Math.max(1, Math.ceil(total / effectivePerPage));
    }
  }

  // Fallback when only page/hasNext are available.
  if (
    pageCount === undefined &&
    resolvedPage !== undefined &&
    resolvedPage > 0 &&
    hasNext !== undefined
  ) {
    pageCount = hasNext ? resolvedPage + 1 : resolvedPage;
  }

  const warnings = parseWarnings(root?.warnings);
  return {
    methods,
    warnings,
    page: resolvedPage,
    perPage,
    total,
    hasNext,
    nextCursor,
    pageCount,
  };
}

export async function fetchTrendingProfitMethods(): Promise<Method[]> {
  const url = toApiUrl("/methods/trending-profit");
  url.searchParams.set("window", "1h");
  url.searchParams.set("mode", "reliable");
  url.searchParams.set("variants", "all");

  const res = await apiFetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - Error fetching trending methods`);
  }

  const json: unknown = await res.json();
  return normalizeMethods(parseMethodsFromResponse(json));
}

function parseMethodTagDefinitions(value: unknown): MethodVariantTagDefinition[] {
  if (!value || typeof value !== "object") return [];

  const root = value as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : undefined;
  const entries = Array.isArray(data?.tags)
    ? data.tags
    : Array.isArray(root.tags)
      ? root.tags
      : [];

  const uniqueTags = new Map<string, MethodVariantTagDefinition>();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;

    const record = entry as Record<string, unknown>;
    const key =
      typeof record.key === "string" && record.key.trim().length > 0
        ? (record.key.trim() as MethodVariantTagKey)
        : null;
    const label =
      typeof record.label === "string" && record.label.trim().length > 0
        ? record.label.trim()
        : null;
    const severity =
      record.severity === 1 || record.severity === 2 || record.severity === 3
        ? record.severity
        : null;
    const description =
      typeof record.description === "string" && record.description.trim().length > 0
        ? record.description.trim()
        : undefined;

    if (!key || !label || !severity || uniqueTags.has(key)) continue;
    uniqueTags.set(key, { key, label, severity, description });
  }

  return Array.from(uniqueTags.values());
}

export async function fetchMethodTags(): Promise<MethodVariantTagDefinition[]> {
  const url = toApiUrl("/methods/tags");
  const res = await apiFetch(url.toString(), {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - Error fetching method tags`);
  }

  const json: unknown = await res.json();
  return parseMethodTagDefinitions(json);
}

export interface Item {
  name: string;
  iconUrl: string;
  highPrice?: number;
  lowPrice?: number;
  high24h?: number;
  low24h?: number;
  highTime?: number;
  lowTime?: number;
}

export interface ItemSearchResult {
  id: number;
  name: string;
  iconUrl?: string;
}

export interface ItemSearchResponse {
  items: ItemSearchResult[];
  page?: number;
  pageCount?: number;
  total?: number;
  perPage?: number;
}

export interface ItemSearchOptions {
  showUntradeables?: boolean;
}

export interface AchievementDiaryOption {
  label: string;
  value: string;
  name: string;
  tier?: DiaryTier;
}

export interface QuestOption {
  label: string;
  value: string;
  name: string;
  stage: number;
}

export interface SkillOption {
  label: string;
  value: string;
  name: string;
}

export type SkillSummaryMethod = {
  id: string;
  slug?: string;
  name: string;
  variantCount?: number;
  likes?: number;
  likedByMe?: boolean;
  variants: Variant[];
};

export type SkillSummaryEntry = {
  bestProfit?: SkillSummaryMethod | null;
  bestAfk?: SkillSummaryMethod | null;
  bestXp?: SkillSummaryMethod | null;
};

export interface MethodsSkillsSummaryResponse {
  data: Record<string, SkillSummaryEntry>;
  meta?: {
    username?: string;
    computedAt?: number;
  };
}

export type RoadmapStrategy = "fastest" | "profitable" | "most_afk";

export interface SkillRoadmapQuery {
  username: string;
  skill: string;
  strategy: RoadmapStrategy;
  targetLevel?: number;
  showOnlyFreeToPlay?: boolean;
  ignoredTags?: MethodVariantTagKey[];
  enabled?: boolean;
}

export interface PlayerInfo {
  levels: Record<string, number>;
  quests: Record<string, number>;
  achievement_diaries: Record<
    string,
    {
      Easy: { complete: boolean; tasks: boolean[] };
      Medium: { complete: boolean; tasks: boolean[] };
      Hard: { complete: boolean; tasks: boolean[] };
      Elite: { complete: boolean; tasks: boolean[] };
    }
  >;
}

export interface RoadmapProfitRange {
  low: number;
  high: number;
}

export interface RoadmapMethodRef {
  id: string;
  name: string;
  slug: string;
  icon_id?: number | null;
  category?: string;
  enabled: boolean;
}

export interface RoadmapVariantRef {
  id: string;
  slug: string;
  icon_id?: number | null;
  label?: string;
  description?: string | null;
  xpPerHour: number;
  clickIntensity?: number | null;
  afkiness?: number | null;
  riskLevel?: string | null;
  requirements?: unknown | null;
  wilderness?: boolean;
  members?: boolean;
  lowProfit: number;
  highProfit: number;
  tags: VariantTag[];
}

export interface RoadmapRange {
  levelStart: number;
  levelEnd: number;
  experienceStart: number;
  experienceEnd: number;
  experienceNeeded: number;
  hours: number;
  afkPercent: number;
  profit: RoadmapProfitRange;
  method: RoadmapMethodRef;
  variant: RoadmapVariantRef;
}

export interface SkillRoadmap {
  skill: string;
  strategy: RoadmapStrategy;
  currentLevel: number;
  currentExperience: number;
  targetLevel: number;
  targetExperience: number;
  totalHours: number;
  averageAfkPercent: number;
  totalProfit: RoadmapProfitRange;
  ranges: RoadmapRange[];
}

export interface SkillRoadmapResponse {
  data: {
    roadmap: SkillRoadmap;
    user: PlayerInfo;
  };
  meta: {
    username: string;
    skill: string;
    strategy: RoadmapStrategy;
    enabled: boolean;
    show_only_free_to_play: boolean;
    ignoredTags: MethodVariantTagKey[];
    computedAt: number;
    usesExactSkillExperience: boolean;
  };
}

export async function fetchItems(ids: number[]): Promise<Record<number, Item>> {
  const url = toApiUrl("/items");
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set(
    "fields",
    "name,iconUrl,highPrice,lowPrice,high24h,low24h,highTime,lowTime",
  );
  const res = await apiFetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – Error fetching items`);
  }
  const json = await res.json();
  return json.data ?? json;
}

function parseItemSearchResults(value: unknown): ItemSearchResult[] {
  const data =
    (value as { data?: { items?: unknown } })?.data?.items ??
    (value as { data?: unknown })?.data ??
    (value as { items?: unknown })?.items ??
    (value as { results?: unknown })?.results ??
    value;
  if (!Array.isArray(data)) return [];
  return data
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const idValue = record.id ?? record.itemId ?? record.item_id;
      const nameValue = record.name ?? record.label ?? record.value;
      if (typeof nameValue !== "string") return null;
      const id = Number(idValue);
      if (!Number.isFinite(id)) return null;
      const iconValue = record.iconUrl ?? record.icon_url ?? record.icon;
      const result: ItemSearchResult = {
        id,
        name: nameValue,
        ...(typeof iconValue === "string" ? { iconUrl: iconValue } : {}),
      };
      return result;
    })
    .filter((item): item is ItemSearchResult => item !== null);
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function parseItemSearchResponse(
  value: unknown,
  fallbackLimit: number,
): ItemSearchResponse {
  const items = parseItemSearchResults(value);
  const root = value as Record<string, unknown> | undefined;
  const data = (root?.data ?? {}) as Record<string, unknown>;
  const meta = (root?.meta ?? {}) as Record<string, unknown>;
  const dataMeta = (data?.meta ?? {}) as Record<string, unknown>;
  const pagination = (data?.pagination ??
    dataMeta?.pagination ??
    root?.pagination ??
    meta?.pagination) as Record<string, unknown> | undefined;

  const page = toNumber(
    data.page ??
      root?.page ??
      pagination?.page ??
      pagination?.currentPage ??
      pagination?.current_page,
  );
  const pageCount = toNumber(
    data.pageCount ??
      root?.pageCount ??
      pagination?.pageCount ??
      pagination?.page_count ??
      pagination?.totalPages ??
      pagination?.total_pages,
  );
  const perPage = toNumber(
    data.perPage ??
      root?.perPage ??
      pagination?.perPage ??
      pagination?.per_page ??
      pagination?.limit ??
      root?.limit,
  );
  const total = toNumber(
    data.total ??
      root?.total ??
      pagination?.total ??
      pagination?.count ??
      meta?.total ??
      dataMeta?.total,
  );

  let normalizedPageCount = pageCount;
  const effectivePerPage = perPage ?? fallbackLimit;
  if (
    normalizedPageCount === undefined &&
    total !== undefined &&
    effectivePerPage > 0
  ) {
    normalizedPageCount = Math.max(1, Math.ceil(total / effectivePerPage));
  }

  return {
    items,
    page,
    pageCount: normalizedPageCount,
    total,
    perPage: perPage ?? (fallbackLimit > 0 ? fallbackLimit : undefined),
  };
}

function parseCatalogArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  const root = value as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data;

  if (root.data && typeof root.data === "object") {
    const nested = root.data as Record<string, unknown>;
    const candidates: unknown[] = [
      nested.achievementDiaries,
      nested.achievement_diaries,
      nested.quests,
      nested.skills,
      nested.items,
      nested.results,
    ];
    const firstArray = candidates.find((candidate) => Array.isArray(candidate));
    if (Array.isArray(firstArray)) return firstArray;
  }

  const rootCandidates: unknown[] = [
    root.achievementDiaries,
    root.achievement_diaries,
    root.quests,
    root.skills,
    root.items,
    root.results,
  ];
  const firstRootArray = rootCandidates.find((candidate) =>
    Array.isArray(candidate),
  );
  return Array.isArray(firstRootArray) ? firstRootArray : [];
}

function parseAchievementDiaryOptions(
  value: unknown,
): AchievementDiaryOption[] {
  const entries = parseCatalogArray(value);
  const unique = new Map<string, AchievementDiaryOption>();

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const nameValue =
      record.region ?? record.name ?? record.diary ?? record.label;
    if (typeof nameValue !== "string" || !nameValue.trim()) continue;

    const name = nameValue.trim();
    const rawTier = record.tier ?? record.stage ?? record.level;
    let tier: DiaryTier | undefined;
    if (typeof rawTier === "number" && Number.isFinite(rawTier)) {
      tier = rawTier;
    } else if (typeof rawTier === "string" && rawTier.trim()) {
      const trimmed = rawTier.trim();
      const numeric = Number(trimmed);
      tier = Number.isFinite(numeric) ? numeric : trimmed;
    }

    const tierLabel = tier === undefined ? "" : ` - ${String(tier)}`;
    const tierKey = tier === undefined ? "" : `::${String(tier).toLowerCase()}`;
    const label = `${name}${tierLabel}`;
    const valueKey = `${name.toLowerCase()}${tierKey}`;
    unique.set(valueKey, {
      label,
      value: valueKey,
      name,
      ...(tier !== undefined ? { tier } : {}),
    });
  }

  return Array.from(unique.values());
}

function parseQuestOptions(value: unknown): QuestOption[] {
  const entries = parseCatalogArray(value);
  const unique = new Map<string, QuestOption>();

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const nameValue = record.name ?? record.quest ?? record.label;
    if (typeof nameValue !== "string" || !nameValue.trim()) continue;

    const rawStage = record.stage ?? record.progress ?? record.status ?? 1;
    const stage = Number(rawStage);
    if (!Number.isFinite(stage)) continue;

    const name = nameValue.trim();
    const label = stage === 1 ? name : `${name} (stage ${stage})`;
    const valueKey = `${name.toLowerCase()}::${stage}`;
    unique.set(valueKey, {
      label,
      value: valueKey,
      name,
      stage,
    });
  }

  return Array.from(unique.values());
}

function parseSkillOptions(value: unknown): SkillOption[] {
  const entries = parseCatalogArray(value);
  const unique = new Map<string, SkillOption>();

  for (const entry of entries) {
    const skillName =
      typeof entry === "string"
        ? entry
        : entry && typeof entry === "object"
          ? (((entry as Record<string, unknown>).name ??
              (entry as Record<string, unknown>).skill ??
              (entry as Record<string, unknown>).label ??
              "") as string)
          : "";

    if (typeof skillName !== "string" || !skillName.trim()) continue;
    const name = skillName.trim();
    const value = name.toLowerCase();
    unique.set(value, {
      label: name,
      value,
      name,
    });
  }

  return Array.from(unique.values());
}

async function fetchCatalog(path: string): Promise<unknown> {
  const url = toApiUrl(path);
  const res = await apiFetch(url.toString(), {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - Error fetching ${path}`);
  }
  return res.json();
}

export async function fetchAchievementDiaries(): Promise<
  AchievementDiaryOption[]
> {
  try {
    const json = await fetchCatalog("/achievement-diaries");
    return parseAchievementDiaryOptions(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("HTTP 404")) {
      throw error;
    }
    const json = await fetchCatalog("/achievement_diaries");
    return parseAchievementDiaryOptions(json);
  }
}

export async function fetchQuests(): Promise<QuestOption[]> {
  const json = await fetchCatalog("/quests");
  return parseQuestOptions(json);
}

export async function fetchSkills(): Promise<SkillOption[]> {
  const json = await fetchCatalog("/skills");
  return parseSkillOptions(json);
}

export async function fetchMethodsSkillsSummary(
  username?: string,
  enabled = false,
): Promise<MethodsSkillsSummaryResponse> {
  const url = toApiUrl("/methods/skills/summary");
  const normalizedUsername = username?.trim();
  if (normalizedUsername) {
    url.searchParams.set(
      "username",
      normalizeBoundedText(normalizedUsername, USERNAME_MAX_LENGTH),
    );
  }
  url.searchParams.set("enabled", String(enabled));

  const res = await apiFetch(url.toString());
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} - Error fetching methods skills summary`,
    );
  }

  const json: unknown = await res.json();
  const root =
    json && typeof json === "object"
      ? (json as Record<string, unknown>)
      : undefined;
  const data =
    root?.data && typeof root.data === "object"
      ? (root.data as Record<string, SkillSummaryEntry>)
      : {};
  const meta =
    root?.meta && typeof root.meta === "object"
      ? (root.meta as MethodsSkillsSummaryResponse["meta"])
      : undefined;

  return { data, meta };
}

export async function fetchSkillRoadmap(
  query: SkillRoadmapQuery,
): Promise<SkillRoadmapResponse> {
  const url = toApiUrl("/methods/skills/roadmap");
  const targetLevel = clampInteger(query.targetLevel, 2, MAX_SKILL_LEVEL) ?? 99;
  url.searchParams.set(
    "username",
    normalizeBoundedText(query.username.trim(), USERNAME_MAX_LENGTH),
  );
  url.searchParams.set("skill", query.skill);
  url.searchParams.set("strategy", query.strategy);
  url.searchParams.set("target_level", String(targetLevel));

  if (query.showOnlyFreeToPlay !== undefined) {
    url.searchParams.set(
      "show_only_free_to_play",
      String(query.showOnlyFreeToPlay),
    );
  }

  if (query.enabled !== undefined) {
    url.searchParams.set("enabled", String(query.enabled));
  }

  if (query.ignoredTags?.length) {
    const uniqueIgnoredTags = Array.from(
      new Set(
        query.ignoredTags
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      ),
    );
    uniqueIgnoredTags.forEach((tag) => url.searchParams.append("ignoredTags", tag));
  }

  const res = await apiFetch(url.toString());
  if (!res.ok) {
    throw await buildApiRequestError(
      res,
      `HTTP ${res.status} - Error fetching skill roadmap`,
    );
  }

  const json: unknown = await res.json();
  return json as SkillRoadmapResponse;
}

export async function searchItems(
  query: string,
  limit = 10,
  pageOrSignal?: number | AbortSignal,
  signal?: AbortSignal,
  options?: ItemSearchOptions,
): Promise<ItemSearchResponse> {
  const trimmed = normalizeBoundedText(query.trim(), SEARCH_QUERY_MAX_LENGTH);
  if (!trimmed) return { items: [], page: 1, pageCount: 0 };
  if (!API_URL) {
    throw new Error("VITE_API_URL is missing");
  }
  const page = typeof pageOrSignal === "number" ? pageOrSignal : 1;
  const requestSignal =
    pageOrSignal && typeof pageOrSignal !== "number" ? pageOrSignal : signal;
  const url = toApiUrl("/items/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("limit", limit.toString());
  url.searchParams.set("page", page.toString());
  url.searchParams.set(
    "showUntradeables",
    String(options?.showUntradeables ?? false),
  );
  const res = await apiFetch(
    url.toString(),
    requestSignal ? { signal: requestSignal } : undefined,
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – Error searching items`);
  }
  const json: unknown = await res.json();
  return parseItemSearchResponse(json, limit);
}

export interface VariantHistoryPoint {
  timestamp: string;
  lowProfit: number;
  highProfit: number;
}

export interface VariantSnapshot {
  timestamp: string;
  title: string;
}

export interface VariantHistoryResponse {
  data: VariantHistoryPoint[];
  variant_snapshot: VariantSnapshot[];
}

export async function fetchVariantHistory(
  variantId: string,
  range: string,
  granularity: string,
): Promise<VariantHistoryResponse> {
  const url = toApiUrl(`/variants/${variantId}/history`);
  url.searchParams.set("range", range);
  url.searchParams.set("granularity", granularity);
  const res = await apiFetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – Error fetching variant history`);
  }
  const json = await res.json();
  return json;
}

export interface MethodDetailResponse {
  method: Method;
  warnings?: ApiWarning[];
}

export async function fetchMethodDetail(
  id: string,
  username?: string,
): Promise<MethodDetailResponse> {
  const url = toApiUrl(`/methods/${id}`);
  if (username) {
    url.searchParams.set(
      "username",
      normalizeBoundedText(username.trim(), USERNAME_MAX_LENGTH),
    );
  }
  const res = await apiFetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – Error fetching method`);
  }
  const json: unknown = await res.json();
  const method =
    (json as { data?: { method?: Method } }).data?.method ??
    (json as { data?: Method }).data ??
    (json as { method?: Method }).method;
  if (!method) {
    throw new Error("Method not found");
  }
  const warnings = parseWarnings((json as { warnings?: unknown }).warnings);
  return { method: normalizeMethod(method), warnings };
}

export async function fetchMethodDetailBySlug(
  slug: string,
  username?: string,
): Promise<MethodDetailResponse> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    throw new Error("Method slug is required");
  }
  const url = toApiUrl(`/methods/slug/${encodeURIComponent(normalizedSlug)}`);
  if (username) {
    url.searchParams.set(
      "username",
      normalizeBoundedText(username.trim(), USERNAME_MAX_LENGTH),
    );
  }
  const res = await apiFetch(url.toString());
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Method not found");
    }
    throw new Error(`HTTP ${res.status} – Error fetching method`);
  }
  const json: unknown = await res.json();
  const method =
    (json as { data?: { method?: Method } }).data?.method ??
    (json as { data?: Method }).data ??
    (json as { method?: Method }).method;
  if (!method) {
    throw new Error("Method not found");
  }
  const warnings = parseWarnings((json as { warnings?: unknown }).warnings);
  return { method: normalizeMethod(method), warnings };
}

export async function likeVariant(variantId: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/methods/variant/${variantId}/like`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - Error liking variant`);
  }
}

export async function unlikeVariant(variantId: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/methods/variant/${variantId}/like`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - Error unliking variant`);
  }
}

export async function deleteMethod(methodId: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/methods/${methodId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - Error deleting method`);
  }
}

export interface UpdateMethodBasicDto {
  name: string;
  category: string;
  description?: string;
  enabled: boolean;
}

export interface UpsertMethodValues extends UpdateMethodBasicDto {
  icon_id: number;
}

export interface UpdateVariantDto {
  id?: string;
  label: string;
  icon_id: number;
  members: boolean;
  description?: string;
  afkiness?: number;
  clickIntensity?: number;
  riskLevel?: string;
  wilderness?: boolean;
  actionsPerHour: number;
  actionType: VariantActionType;
  xpHour?: { skill: string; experience: number }[];
  requirements?: Requirement;
  recommendations?: Requirement;
  inputs: IoItem[];
  outputs: IoItem[];
}

export interface UpdateMethodDto extends UpsertMethodValues {
  variants: UpdateVariantDto[];
}

function mapIoItems(items: IoItem[] | undefined, type: IoItemType): IoItem[] {
  return (items ?? []).map((item) => ({
    id: item.id,
    quantity: item.quantity,
    type,
    reason: item.reason ?? null,
  }));
}

function normalizeIconId(value: number | null | undefined): number | null {
  return Number.isInteger(value) && (value as number) > 0
    ? (value as number)
    : null;
}

function parseNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseApiErrorMessage(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const root = value as Record<string, unknown>;
  const nestedError =
    root.error && typeof root.error === "object"
      ? (root.error as Record<string, unknown>)
      : undefined;

  return (
    parseNonEmptyString(root.message) ??
    parseNonEmptyString(nestedError?.message)
  );
}

function parseConflictItems(
  values: unknown,
): Array<{
  id?: number;
  name: string;
}> {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Map(
      values
        .map((value) => {
          if (typeof value === "string") {
            const name = value.trim();
            if (!name) return null;
            return [name.toLowerCase(), { name }] as const;
          }
          if (!value || typeof value !== "object") return null;
          const record = value as Record<string, unknown>;
          const name =
            parseNonEmptyString(record.name) ??
            parseNonEmptyString(record.itemName) ??
            parseNonEmptyString(record.item_name) ??
            parseNonEmptyString(record.label) ??
            "";
          if (!name) return null;
          const numericId = Number(record.id);
          const id = Number.isFinite(numericId) ? numericId : undefined;
          return [name.toLowerCase(), { ...(id ? { id } : {}), name }] as const;
        })
        .filter((item): item is readonly [string, { id?: number; name: string }] =>
          item !== null,
        ),
    ).values(),
  );
}

function parseFirstConflictItems(...candidates: unknown[]) {
  for (const candidate of candidates) {
    const items = parseConflictItems(candidate);
    if (items.length > 0) {
      return items;
    }
  }

  return [];
}

function parseFreeToPlayVariantConflictEntry(
  value: unknown,
): FreeToPlayVariantConflict | undefined {
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const nestedVariant =
    record.variant && typeof record.variant === "object"
      ? (record.variant as Record<string, unknown>)
      : undefined;
  const variantId =
    parseNonEmptyString(record.variantId) ??
    parseNonEmptyString(record.variant_id) ??
    parseNonEmptyString(nestedVariant?.id);
  const variantSlug =
    parseNonEmptyString(record.variantSlug) ??
    parseNonEmptyString(record.variant_slug) ??
    parseNonEmptyString(nestedVariant?.slug);
  const variantLabel =
    parseNonEmptyString(record.variantLabel) ??
    parseNonEmptyString(record.variant_label) ??
    parseNonEmptyString(record.variantTitle) ??
    parseNonEmptyString(record.variant_title) ??
    parseNonEmptyString(record.variantName) ??
    parseNonEmptyString(record.variant_name) ??
    parseNonEmptyString(
      typeof record.variant === "string" ? record.variant : undefined,
    ) ??
    parseNonEmptyString(nestedVariant?.label) ??
    parseNonEmptyString(nestedVariant?.name) ??
    parseNonEmptyString(record.label) ??
    variantSlug ??
    variantId;
  const items = parseFirstConflictItems(
    record.items,
    record.itemNames,
    record.item_names,
    record.membersOnlyItems,
    record.members_only_items,
    record.memberItems,
    record.member_items,
    record.conflictingItems,
    record.conflicting_items,
    record.invalidItems,
    record.invalid_items,
  );
  const itemNames = items.map((item) => item.name);
  const message =
    parseNonEmptyString(record.message) ??
    parseNonEmptyString(record.detail) ??
    "";
  const code =
    parseNonEmptyString(record.code) ?? parseNonEmptyString(record.type) ?? "";
  const looksLikeMembershipConflict =
    code.toLowerCase().includes("free") ||
    code.toLowerCase().includes("members") ||
    message.toLowerCase().includes("free") ||
    message.toLowerCase().includes("members") ||
    itemNames.length > 0;

  if (!variantLabel || itemNames.length === 0 || !looksLikeMembershipConflict) {
    return undefined;
  }

  return {
    variantLabel,
    ...(variantId ? { variantId } : {}),
    ...(variantSlug ? { variantSlug } : {}),
    items,
    itemNames,
  };
}

function parseFreeToPlayVariantConflicts(
  value: unknown,
): FreeToPlayVariantConflict[] | undefined {
  if (!value || typeof value !== "object") return undefined;

  const root = value as Record<string, unknown>;
  const nestedError =
    root.error && typeof root.error === "object"
      ? (root.error as Record<string, unknown>)
      : undefined;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : undefined;
  const errorDetails =
    nestedError?.details && typeof nestedError.details === "object"
      ? (nestedError.details as Record<string, unknown>)
      : undefined;
  const candidates: unknown[] = [
    root.freeToPlayVariantConflicts,
    root.free_to_play_variant_conflicts,
    root.f2pVariantConflicts,
    root.f2p_variant_conflicts,
    root.variantMembershipConflicts,
    root.variant_membership_conflicts,
    root.conflicts,
    root.errors,
    root.details,
    nestedError?.details,
    errorDetails?.variants,
    nestedError?.variants,
    data?.freeToPlayVariantConflicts,
    data?.free_to_play_variant_conflicts,
    data?.f2pVariantConflicts,
    data?.f2p_variant_conflicts,
    data?.variantMembershipConflicts,
    data?.variant_membership_conflicts,
    data?.conflicts,
    data?.errors,
    data?.details,
  ];

  const parsed = candidates
    .filter(Array.isArray)
    .flatMap((entries) => entries as unknown[])
    .map(parseFreeToPlayVariantConflictEntry)
    .filter(
      (entry): entry is FreeToPlayVariantConflict => entry !== undefined,
    );

  if (parsed.length === 0) return undefined;

  const merged = new Map<string, FreeToPlayVariantConflict>();
  for (const conflict of parsed) {
    const key = [
      conflict.variantId ?? "",
      conflict.variantSlug ?? "",
      conflict.variantLabel.toLowerCase(),
    ].join("::");
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, conflict);
      continue;
    }

    merged.set(key, {
      ...existing,
      items: Array.from(
        new Map(
          [...existing.items, ...conflict.items].map((item) => [
            `${item.id ?? ""}::${item.name.toLowerCase()}`,
            item,
          ]),
        ).values(),
      ),
      itemNames: Array.from(
        new Set([...existing.itemNames, ...conflict.itemNames]),
      ),
    });
  }

  return Array.from(merged.values());
}

async function buildApiRequestError(
  res: Response,
  fallback: string,
): Promise<ApiRequestError> {
  try {
    const json: unknown = await res.json();
    const root =
      json && typeof json === "object"
        ? (json as Record<string, unknown>)
        : undefined;
    const nestedError =
      root?.error && typeof root.error === "object"
        ? (root.error as Record<string, unknown>)
        : undefined;
    const data =
      root?.data && typeof root.data === "object"
        ? (root.data as Record<string, unknown>)
        : undefined;

    return new ApiRequestError(parseApiErrorMessage(json) ?? fallback, {
      status: res.status,
      code:
        parseNonEmptyString(root?.code) ??
        parseNonEmptyString(nestedError?.code) ??
        parseNonEmptyString(data?.code),
      freeToPlayVariantConflicts: parseFreeToPlayVariantConflicts(json),
    });
  } catch {
    return new ApiRequestError(fallback, { status: res.status });
  }
}

function buildVariantSignaturePayload(variant: Variant) {
  return {
    id: variant.id,
    label: variant.label,
    icon_id: normalizeIconId(variant.icon_id),
    members: variant.members ?? false,
    description: variant.description,
    clickIntensity: variant.clickIntensity,
    afkiness: variant.afkiness,
    riskLevel: variant.riskLevel,
    wilderness: variant.wilderness,
    actionsPerHour: variant.actionsPerHour,
    actionType: variant.actionType,
    xpHour: variant.xpHour,
    requirements: variant.requirements ?? {},
    recommendations: variant.recommendations,
    inputs: mapIoItems(variant.inputs, "input"),
    outputs: mapIoItems(variant.outputs, "output"),
  };
}

function buildVariantUpdatePayload(variant: Variant): UpdateVariantDto {
  const icon_id = normalizeIconId(variant.icon_id);
  if (!icon_id) {
    throw new Error("Variant icon_id is required");
  }
  const actionsPerHour = variant.actionsPerHour;
  const actionType = variant.actionType;
  if (
    typeof actionsPerHour !== "number" ||
    !Number.isInteger(actionsPerHour) ||
    actionsPerHour < 0 ||
    actionsPerHour > MAX_ACTIONS_PER_HOUR
  ) {
    throw new Error(
      `Variant actionsPerHour must be an integer between 0 and ${MAX_ACTIONS_PER_HOUR}`,
    );
  }
  if (!actionType || !VARIANT_ACTION_TYPE_OPTIONS.includes(actionType)) {
    throw new Error(
      `Variant actionType must be one of: ${VARIANT_ACTION_TYPE_OPTIONS.join(", ")}`,
    );
  }

  return {
    ...buildVariantSignaturePayload(variant),
    icon_id,
    actionsPerHour,
    actionType,
  };
}

function buildMethodWithVariantsUrl(
  path: string,
  variants: UpdateVariantDto[],
): URL {
  const url = toApiUrl(path);
  variants.forEach((variant) => {
    url.searchParams.append("actionsPerHour", String(variant.actionsPerHour));
    url.searchParams.append("actionType", variant.actionType);
  });
  return url;
}

export function buildMethodUpdatePayload(
  values: UpsertMethodValues,
  variants: Variant[],
): UpdateMethodDto {
  const icon_id = normalizeIconId(values.icon_id);
  if (!icon_id) {
    throw new Error("Method icon_id is required");
  }

  return {
    ...values,
    icon_id,
    variants: variants.map(buildVariantUpdatePayload),
  };
}

export function getVariantsSignature(variants: Variant[]): string {
  return JSON.stringify(variants.map(buildVariantSignaturePayload));
}

export async function updateMethodBasic(
  id: string,
  dto: UpdateMethodBasicDto,
): Promise<Method> {
  const res = await apiFetch(`${API_URL}/methods/${id}/basic`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    throw await buildApiRequestError(
      res,
      `HTTP ${res.status} - Error updating method`,
    );
  }
  const json: unknown = await res.json();
  const method =
    (json as { data?: { method?: Method } }).data?.method ??
    (json as { data?: Method }).data ??
    (json as { method?: Method }).method;
  if (!method) {
    throw new Error("Method not found");
  }
  return normalizeMethod(method);
}

export async function updateMethodWithVariants(
  id: string,
  values: UpsertMethodValues,
  variants: Variant[],
): Promise<Method> {
  const dto = buildMethodUpdatePayload(values, variants);
  const url = buildMethodWithVariantsUrl(`/methods/${id}`, dto.variants);
  const res = await apiFetch(url.toString(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    throw await buildApiRequestError(
      res,
      `HTTP ${res.status} - Error updating method`,
    );
  }
  const json: unknown = await res.json();
  const method =
    (json as { data?: { method?: Method } }).data?.method ??
    (json as { data?: Method }).data ??
    (json as { method?: Method }).method;
  if (!method) {
    throw new Error("Method not found");
  }
  return normalizeMethod(method);
}

export async function createMethodWithVariants(
  values: UpsertMethodValues,
  variants: Variant[],
): Promise<Method> {
  const dto = buildMethodUpdatePayload(values, variants);
  const url = buildMethodWithVariantsUrl("/methods", dto.variants);
  const res = await apiFetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    throw await buildApiRequestError(
      res,
      `HTTP ${res.status} - Error creating method`,
    );
  }
  const json: unknown = await res.json();
  const method =
    (json as { data?: { method?: Method } }).data?.method ??
    (json as { data?: Method }).data ??
    (json as { method?: Method }).method;
  if (!method) {
    throw new Error("Method not found");
  }
  return normalizeMethod(method);
}
