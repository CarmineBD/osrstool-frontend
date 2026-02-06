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

export async function fetchMethods(
  username?: string,
  page?: number,
  name?: string
): Promise<MethodsResponse> {
  const url = new URL(`${API_URL}/methods`);
  if (username) url.searchParams.set("username", username);
  if (page !== undefined) url.searchParams.set("page", page.toString());
  if (name) url.searchParams.set("name", name);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} â€“ Error fetching methods`);
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

export async function fetchItems(ids: number[]): Promise<Record<number, Item>> {
  const url = new URL(`${API_URL}/items`);
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("fields", "name,iconUrl,highPrice,lowPrice");
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} â€“ Error fetching items`);
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
  const url = new URL(`${API_URL}/items/search`);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("limit", limit.toString());
  url.searchParams.set("page", page.toString());
  const res = await fetch(
    url.toString(),
    requestSignal ? { signal: requestSignal } : undefined
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} â€“ Error searching items`);
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
  const url = new URL(`${API_URL}/variants/${variantId}/history`);
  url.searchParams.set("range", range);
  url.searchParams.set("granularity", granularity);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} â€“ Error fetching variant history`);
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
    throw new Error(`HTTP ${res.status} â€“ Error fetching method`);
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
  const safeSlug = encodeURIComponent(slug);
  const url = new URL(`${API_URL}/methods/slug/${safeSlug}`);
  if (username) url.searchParams.set("username", username);
  const res = await fetch(url.toString());
  if (res.status === 404) {
    throw new Error("Method not found");
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} â€“ Error fetching method`);
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

export interface UpdateMethodBasicDto {
  name: string;
  category: string;
  description?: string;
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
    actionsPerHour: variant.actionsPerHour,
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
  const res = await fetch(`${API_URL}/methods/${id}/basic`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} Ã¢â‚¬â€œ Error updating method`);
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
  const res = await fetch(`${API_URL}/methods/${id}`, {
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

