import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "@/lib/me";
import { QUERY_REFETCH_INTERVAL_MS } from "@/lib/queryRefresh";
import { useUsername } from "@/contexts/UsernameContext";
import {
  fetchItems,
  fetchMethodDetailBySlug,
  type Item,
  type Method,
  type MethodDetailResponse,
  type Variant,
} from "@/lib/api";

export interface UseMethodDetailResult {
  methodParam: string;
  variantSlug?: string;
  method?: Method;
  error: Error | null;
  isLoading: boolean;
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

  const {
    data,
    error,
    isLoading,
  } = useQuery<MethodDetailResponse, Error>({
    queryKey: ["methodDetail", methodParam, username],
    queryFn: () => fetchMethodDetailBySlug(methodParam, username),
    enabled: !!methodParam,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
    retry: false,
  });

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
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

  const itemIds = useMemo(() => {
    if (!method) return [] as number[];
    const ids = new Set<number>();
    method.variants.forEach((variant) => {
      variant.inputs.forEach((item) => ids.add(item.id));
      variant.outputs.forEach((item) => ids.add(item.id));
      variant.requirements?.items?.forEach((item) => ids.add(item.id));
      variant.recommendations?.items?.forEach((item) => ids.add(item.id));
    });
    return Array.from(ids);
  }, [method]);

  const { data: itemsData } = useQuery({
    queryKey: ["items", itemIds],
    queryFn: () => fetchItems(itemIds),
    enabled: itemIds.length > 0,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
  });

  const itemsMap = itemsData ?? {};

  const firstTabSlug =
    method?.variants[0]?.slug ?? (method?.variants[0]?.id ?? "0").toString();
  const activeSlug = variantSlug ?? firstTabSlug;
  const methodSlug = method?.slug || methodParam;
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
    itemsMap,
    activeSlug,
    methodSlug,
    hasMultipleVariants,
    isSuperAdmin,
    getItemsTotal,
  };
}
