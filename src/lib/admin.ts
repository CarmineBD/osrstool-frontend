import { authFetch } from "@/lib/http";
import {
  ADMIN_SCRIPT_NAME_MAX_LENGTH,
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

function parseApiErrorMessage(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const message = (value as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : undefined;
}

async function getApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const json: unknown = await response.json();
    return parseApiErrorMessage(json) ?? fallback;
  } catch {
    return fallback;
  }
}

export type AdminExecutionStatus = "running" | "succeeded" | "failed";

export type AdminScriptExecution = {
  id: string;
  scriptName: string;
  status: AdminExecutionStatus;
  trigger: "manual";
  requestedByUserId: string | null;
  params: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminOverviewCounts = {
  usersRegistered: number;
  items: number;
  quests: number;
  methods: {
    total: number;
      enabled: number;
      disabled: number;
  };
  variants: {
    total: number;
    enabled: number;
    disabled: number;
  };
  enabledMethodVariantsBySkill: Array<{
    skill: string;
    variants: number;
  }>;
};

export type AdminLatestCatalogItem = {
  id: number;
  name: string;
  iconUrl: string;
  addedAt: string;
};

export type AdminLatestCatalogQuest = {
  name: string;
  slug: string;
  addedAt: string;
};

export type AdminLatestCatalog = {
  items: AdminLatestCatalogItem[];
  quests: AdminLatestCatalogQuest[];
};

export type AdminOverviewData = {
  counts: AdminOverviewCounts;
  latestExecutions: AdminScriptExecution[];
  latestCatalog: AdminLatestCatalog;
};

export type AdminJobsResponse = {
  data: AdminScriptExecution[];
  meta: {
    limit: number;
    scriptName: string | null;
  };
};

export type AdminJobsFilters = {
  limit?: number;
  scriptName?: string;
};

export type AdminItemsSyncInput = {
  source?: "mapping" | "wiki";
  dryRun?: boolean;
  chunkSize?: number;
  writeSqlFile?: boolean;
};

async function parseJsonResponse<T>(response: Response, fallbackError: string) {
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, fallbackError));
  }

  return (await response.json()) as T;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeEnabledMethodVariantsBySkill(
  value: unknown,
): AdminOverviewCounts["enabledMethodVariantsBySkill"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<AdminOverviewCounts["enabledMethodVariantsBySkill"]>(
    (accumulator, entry) => {
      if (!entry || typeof entry !== "object") {
        return accumulator;
      }

      const skill = (entry as { skill?: unknown }).skill;
      const variants = toFiniteNumber((entry as { variants?: unknown }).variants);
      if (typeof skill !== "string" || !skill.trim() || variants === undefined) {
        return accumulator;
      }

      accumulator.push({
        skill: skill.trim(),
        variants,
      });
      return accumulator;
    },
    [],
  );
}

function normalizeLatestCatalogItems(
  value: unknown,
): AdminLatestCatalog["items"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<AdminLatestCatalog["items"]>((accumulator, entry) => {
    if (!entry || typeof entry !== "object") {
      return accumulator;
    }

    const id = toFiniteNumber((entry as { id?: unknown }).id);
    const name = (entry as { name?: unknown }).name;
    const iconUrl = (entry as { iconUrl?: unknown }).iconUrl;
    const addedAt = (entry as { addedAt?: unknown }).addedAt;

    if (
      id === undefined ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof iconUrl !== "string" ||
      !iconUrl.trim() ||
      typeof addedAt !== "string" ||
      !addedAt.trim()
    ) {
      return accumulator;
    }

    accumulator.push({
      id,
      name: name.trim(),
      iconUrl: iconUrl.trim(),
      addedAt,
    });
    return accumulator;
  }, []);
}

function normalizeLatestCatalogQuests(
  value: unknown,
): AdminLatestCatalog["quests"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<AdminLatestCatalog["quests"]>((accumulator, entry) => {
    if (!entry || typeof entry !== "object") {
      return accumulator;
    }

    const name = (entry as { name?: unknown }).name;
    const slug = (entry as { slug?: unknown }).slug;
    const addedAt = (entry as { addedAt?: unknown }).addedAt;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof slug !== "string" ||
      !slug.trim() ||
      typeof addedAt !== "string" ||
      !addedAt.trim()
    ) {
      return accumulator;
    }

    accumulator.push({
      name: name.trim(),
      slug: slug.trim(),
      addedAt,
    });
    return accumulator;
  }, []);
}

function normalizeLatestCatalog(value: unknown): AdminLatestCatalog {
  if (!value || typeof value !== "object") {
    return {
      items: [],
      quests: [],
    };
  }

  const catalog = value as {
    items?: unknown;
    quests?: unknown;
  };

  return {
    items: normalizeLatestCatalogItems(catalog.items),
    quests: normalizeLatestCatalogQuests(catalog.quests),
  };
}

function normalizeAdminOverviewData(value: AdminOverviewData): AdminOverviewData {
  const rawOverview = value as AdminOverviewData & Record<string, unknown>;

  return {
    ...value,
    counts: {
      ...value.counts,
      enabledMethodVariantsBySkill: normalizeEnabledMethodVariantsBySkill(
        rawOverview.counts?.enabledMethodVariantsBySkill,
      ),
    },
    latestCatalog: normalizeLatestCatalog(rawOverview.latestCatalog),
  };
}

export async function fetchAdminOverview(): Promise<AdminOverviewData> {
  const response = await authFetch(toApiUrl("/admin/overview"), {
    method: "GET",
    cache: "no-store",
  });
  const json = await parseJsonResponse<{ data?: AdminOverviewData }>(
    response,
    `HTTP ${response.status} - Error fetching /admin/overview`,
  );

  if (!json.data) {
    throw new Error("Admin overview response is missing data");
  }

  return normalizeAdminOverviewData(json.data);
}

export async function fetchAdminJobs(
  filters: AdminJobsFilters = {},
): Promise<AdminJobsResponse> {
  const url = toApiUrl("/admin/jobs");
  if (filters.limit !== undefined) {
    url.searchParams.set("limit", String(filters.limit));
  }
  const normalizedScriptName = filters.scriptName?.trim()
    ? normalizeBoundedText(filters.scriptName.trim(), ADMIN_SCRIPT_NAME_MAX_LENGTH)
    : undefined;
  if (normalizedScriptName) {
    url.searchParams.set("scriptName", normalizedScriptName);
  }

  const response = await authFetch(url, {
    method: "GET",
    cache: "no-store",
  });
  const json = await parseJsonResponse<Partial<AdminJobsResponse>>(
    response,
    `HTTP ${response.status} - Error fetching /admin/jobs`,
  );

  return {
    data: Array.isArray(json.data) ? json.data : [],
    meta: {
      limit:
        typeof json.meta?.limit === "number"
          ? json.meta.limit
          : filters.limit ?? 20,
      scriptName:
        typeof json.meta?.scriptName === "string"
          ? json.meta.scriptName
          : normalizedScriptName ?? null,
    },
  };
}

export async function runAdminItemsSync(
  input: AdminItemsSyncInput = {
    source: "mapping",
    dryRun: false,
  },
): Promise<AdminScriptExecution> {
  const response = await authFetch(toApiUrl("/admin/sync/items"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJsonResponse<{ data?: AdminScriptExecution }>(
    response,
    `HTTP ${response.status} - Error posting /admin/sync/items`,
  );

  if (!json.data) {
    throw new Error("Items sync response is missing data");
  }

  return json.data;
}

export async function refreshAdminMethodProfits(): Promise<AdminScriptExecution> {
  const response = await authFetch(toApiUrl("/admin/refresh/method-profits"), {
    method: "POST",
  });
  const json = await parseJsonResponse<{ data?: AdminScriptExecution }>(
    response,
    `HTTP ${response.status} - Error posting /admin/refresh/method-profits`,
  );

  if (!json.data) {
    throw new Error("Method profits refresh response is missing data");
  }

  return json.data;
}
