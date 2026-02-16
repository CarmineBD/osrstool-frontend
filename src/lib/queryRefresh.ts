const DEFAULT_QUERY_REFETCH_INTERVAL_MS = 60_000;
const DEFAULT_QUERY_STALE_MARGIN_MS = 5_000;

function parsePositiveMs(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export const QUERY_REFETCH_INTERVAL_MS =
  parsePositiveMs(import.meta.env.VITE_QUERY_REFETCH_INTERVAL_MS) ??
  DEFAULT_QUERY_REFETCH_INTERVAL_MS;

const configuredStaleTimeMs = parsePositiveMs(import.meta.env.VITE_QUERY_STALE_TIME_MS);

const effectiveStaleMarginMs = Math.min(
  DEFAULT_QUERY_STALE_MARGIN_MS,
  Math.max(1, Math.floor(QUERY_REFETCH_INTERVAL_MS * 0.2))
);

const defaultStaleTimeMs = Math.max(
  1,
  QUERY_REFETCH_INTERVAL_MS - effectiveStaleMarginMs
);

export const QUERY_STALE_TIME_MS =
  configuredStaleTimeMs !== undefined
    ? Math.min(configuredStaleTimeMs, QUERY_REFETCH_INTERVAL_MS)
    : defaultStaleTimeMs;
