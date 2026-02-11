// src/lib/api.ts
import { authFetch as apiFetch } from "./http";

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

export interface Variant {
  id?: string;
  slug?: string;
  label: string;
  description?: string;
  afkiness?: number;
  clickIntensity?: number;
  riskLevel?: string;
  wilderness?: boolean;
  actionsPerHour?: number;
  xpHour?: { skill: string; experience: number }[];
  requirements: Requirement;
  recommendations?: Requirement;
  highProfit?: number;
  lowProfit?: number;
  trendLastHour?: number;
  trendLast24h?: number;
  trendLastWeek?: number;
  trendLastMonth?: number;
  trendLastYear?: number;
  missingRequirements?: Requirement;
  inputs: IoItem[];
  outputs: IoItem[];
}

export interface ApiWarning {
  code: string;
  message: string;
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
  pageCount?: number;
}

export interface MethodsFilters {
  category?: "combat" | "collecting" | "processing" | "skilling";
  clickIntensity?: number;
  afkiness?: number;
  riskLevel?: number;
  givesExperience?: boolean;
  enabled?: boolean;
  skill?: string;
  showProfitables?: boolean;
  likedByMe?: boolean;
  sortBy?: "clickIntensity" | "afkiness" | "xpHour" | "highProfit" | "likes";
  order?: "asc" | "desc";
}

export async function fetchMethods(
  username?: string,
  page?: number,
  name?: string,
  filters?: MethodsFilters
): Promise<MethodsResponse> {
  const url = toApiUrl("/methods");
  if (username) url.searchParams.set("username", username);
  if (page !== undefined) url.searchParams.set("page", page.toString());
  if (name) url.searchParams.set("name", name);
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
  if (filters?.givesExperience !== undefined) {
    url.searchParams.set("givesExperience", String(filters.givesExperience));
  }
  if (filters?.enabled !== undefined) {
    url.searchParams.set("enabled", String(filters.enabled));
  }
  if (filters?.skill) url.searchParams.set("skill", filters.skill);
  if (filters?.showProfitables !== undefined) {
    url.searchParams.set("showProfitables", String(filters.showProfitables));
  }
  if (filters?.likedByMe !== undefined) {
    url.searchParams.set("likedByMe", String(filters.likedByMe));
  }
  if (filters?.sortBy) url.searchParams.set("sortBy", filters.sortBy);
  if (filters?.order) url.searchParams.set("order", filters.order);

  const res = await apiFetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – Error fetching methods`);
  }
  const json: unknown = await res.json();
  let methods: Method[] = [];
  let pageCount: number | undefined;
  if (Array.isArray(json)) {
    methods = json as Method[];
  } else {
    const data = (
      json as {
        data?: {
          methods?: Method[];
          pageCount?: number;
          pagination?: { pageCount?: number };
        };
      }
    ).data;
    methods = data?.methods ?? [];
    pageCount =
      (json as { pageCount?: number }).pageCount ??
      data?.pageCount ??
      (data?.pagination as { pageCount?: number } | undefined)?.pageCount ??
      (json as { meta?: { pagination?: { pageCount?: number } } }).meta
        ?.pagination?.pageCount;

    // Derive pageCount from meta.total / meta.perPage when available
    if (
      pageCount === undefined &&
      (json as { meta?: { total?: number; perPage?: number } }).meta?.total !==
        undefined
    ) {
      const meta = (json as { meta?: { total?: number; perPage?: number } })
        .meta;
      const total = Number(meta?.total ?? 0);
      const perPage = Number(meta?.perPage ?? 10);
      if (
        Number.isFinite(total) &&
        total > 0 &&
        Number.isFinite(perPage) &&
        perPage > 0
      ) {
        pageCount = Math.max(1, Math.ceil(total / perPage));
      }
    }
  }
  const warnings = parseWarnings((json as { warnings?: unknown }).warnings);
  return { methods, warnings, pageCount };
}

export interface Item {
  name: string;
  iconUrl: string;
  highPrice?: number;
  lowPrice?: number;
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

export async function fetchItems(ids: number[]): Promise<Record<number, Item>> {
  const url = toApiUrl("/items");
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("fields", "name,iconUrl,highPrice,lowPrice");
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
  fallbackLimit: number
): ItemSearchResponse {
  const items = parseItemSearchResults(value);
  const root = value as Record<string, unknown> | undefined;
  const data = (root?.data ?? {}) as Record<string, unknown>;
  const meta = (root?.meta ?? {}) as Record<string, unknown>;
  const dataMeta = (data?.meta ?? {}) as Record<string, unknown>;
  const pagination =
    (data?.pagination ??
      dataMeta?.pagination ??
      root?.pagination ??
      meta?.pagination) as Record<string, unknown> | undefined;

  const page = toNumber(
    data.page ??
      root?.page ??
      pagination?.page ??
      pagination?.currentPage ??
      pagination?.current_page
  );
  const pageCount = toNumber(
    data.pageCount ??
      root?.pageCount ??
      pagination?.pageCount ??
      pagination?.page_count ??
      pagination?.totalPages ??
      pagination?.total_pages
  );
  const perPage = toNumber(
    data.perPage ??
      root?.perPage ??
      pagination?.perPage ??
      pagination?.per_page ??
      pagination?.limit ??
      root?.limit
  );
  const total = toNumber(
    data.total ??
      root?.total ??
      pagination?.total ??
      pagination?.count ??
      meta?.total ??
      dataMeta?.total
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
    Array.isArray(candidate)
  );
  return Array.isArray(firstRootArray) ? firstRootArray : [];
}

function parseAchievementDiaryOptions(value: unknown): AchievementDiaryOption[] {
  const entries = parseCatalogArray(value);
  const unique = new Map<string, AchievementDiaryOption>();

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const nameValue = record.region ?? record.name ?? record.diary ?? record.label;
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
          ? ((entry as Record<string, unknown>).name ??
              (entry as Record<string, unknown>).skill ??
              (entry as Record<string, unknown>).label ??
              "") as string
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
    throw new Error(`HTTP ${res.status} â€“ Error fetching ${path}`);
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

export async function searchItems(
  query: string,
  limit = 10,
  pageOrSignal?: number | AbortSignal,
  signal?: AbortSignal
): Promise<ItemSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) return { items: [], page: 1, pageCount: 0 };
  if (!API_URL) {
    throw new Error("VITE_API_URL is missing");
  }
  const page = typeof pageOrSignal === "number" ? pageOrSignal : 1;
  const requestSignal =
    pageOrSignal && typeof pageOrSignal !== "number"
      ? pageOrSignal
      : signal;
  const url = toApiUrl("/items/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("limit", limit.toString());
  url.searchParams.set("page", page.toString());
  const res = await apiFetch(
    url.toString(),
    requestSignal ? { signal: requestSignal } : undefined
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
  granularity: string
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
  username?: string
): Promise<MethodDetailResponse> {
  const url = toApiUrl(`/methods/${id}`);
  if (username) url.searchParams.set("username", username);
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
  return { method, warnings };
}

export async function fetchMethodDetailBySlug(
  slug: string,
  username?: string
): Promise<MethodDetailResponse> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    throw new Error("Method slug is required");
  }
  const url = toApiUrl(`/methods/slug/${encodeURIComponent(normalizedSlug)}`);
  if (username) url.searchParams.set("username", username);
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
  return { method, warnings };
}

export async function likeMethod(methodId: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/methods/${methodId}/like`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - Error liking method`);
  }
}

export async function unlikeMethod(methodId: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/methods/${methodId}/like`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - Error unliking method`);
  }
}

export interface UpdateMethodBasicDto {
  name: string;
  category: string;
  description?: string;
  enabled: boolean;
}

export interface UpdateVariantDto {
  id?: string;
  label: string;
  description?: string;
  afkiness?: number;
  clickIntensity?: number;
  riskLevel?: string;
  wilderness?: boolean;
  actionsPerHour?: number;
  xpHour?: { skill: string; experience: number }[];
  requirements?: Requirement;
  recommendations?: Requirement;
  inputs: IoItem[];
  outputs: IoItem[];
}

export interface UpdateMethodDto extends UpdateMethodBasicDto {
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

function buildVariantUpdatePayload(variant: Variant): UpdateVariantDto {
  return {
    id: variant.id,
    label: variant.label,
    description: variant.description,
    clickIntensity: variant.clickIntensity,
    afkiness: variant.afkiness,
    riskLevel: variant.riskLevel,
    wilderness: variant.wilderness,
    xpHour: variant.xpHour,
    requirements: variant.requirements ?? {},
    recommendations: variant.recommendations,
    inputs: mapIoItems(variant.inputs, "input"),
    outputs: mapIoItems(variant.outputs, "output"),
  };
}

export function buildMethodUpdatePayload(
  values: UpdateMethodBasicDto,
  variants: Variant[]
): UpdateMethodDto {
  return {
    ...values,
    variants: variants.map(buildVariantUpdatePayload),
  };
}

export function getVariantsSignature(variants: Variant[]): string {
  return JSON.stringify(variants.map(buildVariantUpdatePayload));
}

export async function updateMethodBasic(
  id: string,
  dto: UpdateMethodBasicDto
): Promise<Method> {
  const res = await apiFetch(`${API_URL}/methods/${id}/basic`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} â€“ Error updating method`);
  }
  const json: unknown = await res.json();
  const method =
    (json as { data?: { method?: Method } }).data?.method ??
    (json as { data?: Method }).data ??
    (json as { method?: Method }).method;
  if (!method) {
    throw new Error("Method not found");
  }
  return method;
}

export async function updateMethodWithVariants(
  id: string,
  values: UpdateMethodBasicDto,
  variants: Variant[]
): Promise<Method> {
  const dto = buildMethodUpdatePayload(values, variants);
  const res = await apiFetch(`${API_URL}/methods/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - Error updating method`);
  }
  const json: unknown = await res.json();
  const method =
    (json as { data?: { method?: Method } }).data?.method ??
    (json as { data?: Method }).data ??
    (json as { method?: Method }).method;
  if (!method) {
    throw new Error("Method not found");
  }
  return method;
}


