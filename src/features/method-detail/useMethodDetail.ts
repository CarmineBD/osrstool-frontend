import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "@/lib/me";
import {
  QUERY_REFETCH_INTERVAL_MS,
  QUERY_STALE_TIME_MS,
} from "@/lib/queryRefresh";
import { useUsername } from "@/contexts/UsernameContext";
import { useAuth } from "@/auth/AuthProvider";
import {
  getItemsQueryKey,
  getMethodDetailQueryKey,
  getMethodItemIds,
  normalizeMethodSlug,
} from "@/lib/queryKeys";
import {
  fetchIconRecords,
  fetchItems,
  fetchMethodDetailBySlug,
  getIconReferenceKey,
  normalizeIconSource,
  type IconRecord,
  type Item,
  type Method,
  type MethodDetailResponse,
  type Variant,
} from "@/lib/api";
import { getOrderedVariants } from "@/features/method-detail/variantOrdering";

export interface UseMethodDetailResult {
  methodParam: string;
  variantSlug?: string;
  method?: Method;
  creatorAvatarUrl?: string;
  error: Error | null;
  isLoading: boolean;
  isItemsLoading: boolean;
  itemsMap: Record<number, Item>;
  iconMap: Record<string, IconRecord>;
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
  const { player, setUserError } = useUsername();
  const { session } = useAuth();
  const normalizedMethodSlug = normalizeMethodSlug(methodParam);

  const { data, error, isLoading } = useQuery<MethodDetailResponse, Error>({
    queryKey: getMethodDetailQueryKey(
      normalizedMethodSlug,
      player ?? undefined,
    ),
    queryFn: () =>
      fetchMethodDetailBySlug(normalizedMethodSlug, player ?? undefined),
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
    setUserError(
      error instanceof Error ? error.message : "Unable to load method details.",
    );
  }, [error, setUserError]);

  const method = data?.method;
  const creatorAvatarUrl =
    method?.created_by?.id &&
    session?.user?.id &&
    method.created_by.id === session.user.id &&
    typeof session.user.user_metadata?.avatar_url === "string"
      ? session.user.user_metadata.avatar_url
      : undefined;

  const itemIds = useMemo(() => getMethodItemIds(method), [method]);

  const { data: itemsData, isLoading: isItemsLoading } = useQuery({
    queryKey: getItemsQueryKey(itemIds),
    queryFn: () => fetchItems(itemIds),
    enabled: itemIds.length > 0,
    staleTime: QUERY_STALE_TIME_MS,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
  });

  const itemsMap = itemsData ?? {};
  const iconReferences = useMemo(
    () =>
      method?.variants.flatMap((variant) =>
        Number.isInteger(variant.icon_id)
          ? [
              {
                id: variant.icon_id as number,
                source: normalizeIconSource(variant.iconSource),
              },
            ]
          : [],
      ) ?? [],
    [method],
  );
  const { data: iconData } = useQuery<Record<string, IconRecord>>({
    queryKey: ["iconRecords", iconReferences.map(getIconReferenceKey).sort()],
    queryFn: () => fetchIconRecords(iconReferences),
    enabled: iconReferences.length > 0,
    staleTime: QUERY_STALE_TIME_MS,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
  });
  const iconMap = iconData ?? {};

  const orderedVariants = useMemo(
    () => getOrderedVariants(method?.variants ?? []),
    [method?.variants],
  );
  const firstVariant = orderedVariants[0];
  const firstTabSlug =
    firstVariant?.variant.slug ??
    (firstVariant?.variant.id ?? firstVariant?.originalIndex ?? "0").toString();
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
    creatorAvatarUrl,
    error,
    isLoading,
    isItemsLoading,
    itemsMap,
    iconMap,
    activeSlug,
    methodSlug,
    hasMultipleVariants,
    isSuperAdmin,
    getItemsTotal,
  };
}
