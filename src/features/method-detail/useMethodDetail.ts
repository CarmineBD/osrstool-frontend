import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "@/lib/me";
import { QUERY_REFETCH_INTERVAL_MS, QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";
import { useUsername } from "@/contexts/UsernameContext";
import { useAuth } from "@/auth/AuthProvider";
import {
  getItemsQueryKey,
  getMethodDetailQueryKey,
  getMethodItemIds,
  normalizeMethodSlug,
  normalizeUsername,
} from "@/lib/queryKeys";
import {
  fetchItems,
  fetchMethodDetailBySlug,
  type Item,
  type MethodDetailResponse,
  type Variant,
} from "@/lib/api";

export interface UseMethodDetailResult {
  methodParam: string;
  variantSlug?: string;
  method?: Method;
  error: Error | null;
  isLoading: boolean;
  isItemsLoading: boolean;
  itemsMap: Record<number, Item>;
  activeSlug: string;
  methodSlug: string;
  hasMultipleVariants: boolean;
  isSuperAdmin: boolean;
  getItemsTotal: (items: Variant["inputs"]) => number;
}

export function useMethodDetail(): UseMethodDetailResult {
  const { slug: methodParam = "", variantSlug } = useParams<{
    slug: string;
    variantSlug?: string;
  }>();
  const { username, setUserError } = useUsername();
  const { session } = useAuth();
  const normalizedMethodSlug = normalizeMethodSlug(methodParam);
  const normalizedUsername = normalizeUsername(username);

  const {
    data,
    error,
    isLoading,
  } = useQuery<MethodDetailResponse, Error>({
    queryKey: getMethodDetailQueryKey(normalizedMethodSlug, normalizedUsername),
    queryFn: () =>
      fetchMethodDetailBySlug(normalizedMethodSlug, normalizedUsername),
    enabled: !!normalizedMethodSlug,
    staleTime: QUERY_STALE_TIME_MS,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
    retry: false,
  });

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: !!session,
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });

  useEffect(() => {
    const warning = data?.warnings?.[0];
    setUserError(warning?.message ?? null);
  }, [data, setUserError]);

  useEffect(() => {
    if (!error) return;
    setUserError("Failed to fetch user");
  }, [error, setUserError]);

  const method = data?.method;

  const itemIds = useMemo(() => getMethodItemIds(method), [method]);

  const { data: itemsData, isLoading: isItemsLoading } = useQuery({
    queryKey: getItemsQueryKey(itemIds),
    queryFn: () => fetchItems(itemIds),
    enabled: itemIds.length > 0,
    staleTime: QUERY_STALE_TIME_MS,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
  });

  const itemsMap = itemsData ?? {};

  const firstTabSlug =
    method?.variants[0]?.slug ?? (method?.variants[0]?.id ?? "0").toString();
  const activeSlug = variantSlug ?? firstTabSlug;
  const methodSlug = method?.slug || normalizedMethodSlug;
  const hasMultipleVariants = (method?.variants?.length ?? 0) > 1;
  const isSuperAdmin = meData?.data?.role === "super_admin";

  const getItemsTotal = (items: Variant["inputs"]) =>
    items.reduce((total, item) => {
      const lowPrice = itemsMap[item.id]?.lowPrice ?? 0;
      return total + lowPrice * item.quantity;
    }, 0);

  return {
    methodParam,
    variantSlug,
    method,
    error,
    isLoading,
    isItemsLoading,
    itemsMap,
    activeSlug,
    methodSlug,
    hasMultipleVariants,
    isSuperAdmin,
    getItemsTotal,
  };
}
