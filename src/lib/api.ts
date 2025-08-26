// src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL as string;

export interface Method {
  id: string;
  slug: string;
  name: string;
  category: string;
  description?: string;
  variants: Variant[];
  variantCount?: number;
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
  slug?: string;
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
  trendLastHour?: number;
  trendLast24h?: number;
  trendLastWeek?: number;
  trendLastMonth?: number;
  trendLastYear?: number;
  missingRequirements?: Requirement;
  inputs: { id: number; quantity: number }[];
  outputs: { id: number; quantity: number }[];
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

export async function fetchMethods(
  username?: string,
  page?: number
): Promise<MethodsResponse> {
  const url = new URL(`${API_URL}/methods`);
  if (username) url.searchParams.set("username", username);
  if (page !== undefined) url.searchParams.set("page", page.toString());

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – Error fetching methods`);
  }
  const json: unknown = await res.json();
  let methods: Method[] = [];
  let pageCount: number | undefined;
  if (Array.isArray(json)) {
    methods = json as Method[];
  } else {
    const data = (json as { data?: { methods?: Method[]; pageCount?: number; pagination?: { pageCount?: number } } }).data;
    methods = data?.methods ?? [];
    pageCount =
      (json as { pageCount?: number }).pageCount ??
      data?.pageCount ??
      (data?.pagination as { pageCount?: number } | undefined)?.pageCount ??
      (json as { meta?: { pagination?: { pageCount?: number } } }).meta?.pagination?.pageCount;
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

export async function fetchItems(ids: number[]): Promise<Record<number, Item>> {
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
  const url = new URL(`${API_URL}/variants/${variantId}/history`);
  url.searchParams.set("range", range);
  url.searchParams.set("granularity", granularity);
  const res = await fetch(url.toString());
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
  const url = new URL(`${API_URL}/methods/${id}`);
  if (username) url.searchParams.set("username", username);
  const res = await fetch(url.toString());
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
