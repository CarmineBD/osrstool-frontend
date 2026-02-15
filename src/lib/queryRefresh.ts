const DEFAULT_QUERY_REFETCH_INTERVAL_MS = 60_000;

function parseQueryRefetchIntervalMs(value: string | undefined): number {
  if (!value) return DEFAULT_QUERY_REFETCH_INTERVAL_MS;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_QUERY_REFETCH_INTERVAL_MS;
  }
  return parsed;
}

export const QUERY_REFETCH_INTERVAL_MS = parseQueryRefetchIntervalMs(
  import.meta.env.VITE_QUERY_REFETCH_INTERVAL_MS
);
