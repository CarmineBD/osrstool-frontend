import { useCallback, useEffect, useRef, useState } from "react";
import { useMethods } from "./hooks";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { formatNumber, getUrlByType } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  fetchItems,
  fetchMethodDetailBySlug,
  type Method,
  type MethodDetailResponse,
  type MethodsFilters,
  type Item,
  type Variant,
} from "@/lib/api";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { LikeButton } from "./LikeButton";
import { QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";
import {
  getItemsQueryKey,
  getMethodDetailQueryKey,
  getMethodItemIds,
  normalizeMethodSlug,
  normalizeUsername,
} from "@/lib/queryKeys";

type SortBy = NonNullable<MethodsFilters["sortBy"]>;
type SortOrder = NonNullable<MethodsFilters["order"]>;
const DETAIL_PREFETCH_HOVER_DELAY_MS = 200;

export type Props = {
  username: string;
  name?: string;
  filters?: MethodsFilters;
  sortBy?: SortBy;
  order?: SortOrder;
  onSortChange?: (sortBy?: SortBy, order?: SortOrder) => void;
};

interface Row {
  id: string;
  methodId: string;
  methodSlug: string;
  variantSlug: string;
  variantCount: number;
  name: string;
  category: string;
  label: string;
  xpHour: { skill: string; experience: number }[];
  clickIntensity?: number;
  afkiness?: number;
  riskLevel?: string;
  levels: { skill: string; level: number }[];
  lowProfit?: number;
  highProfit?: number;
  marketImpactInstant?: number;
  marketImpactSlow?: number;
  likes?: number;
  likedByMe?: boolean;
}

function formatLiquidityScore(score?: number): string {
  if (typeof score !== "number") return "N/A";
  return `${(score * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

export function MethodsList({
  username,
  name,
  filters,
  sortBy,
  order,
  onSortChange,
}: Props) {
  const queryClient = useQueryClient();
  const SKELETON_ROW_COUNT = 8;
  const [page, setPage] = useState(1);
  const [cursorByPage, setCursorByPage] = useState<
    Record<number, string | undefined>
  >({ 1: undefined });
  const hoverPrefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredSlugRef = useRef<string | null>(null);
  const cursor = page > 1 ? cursorByPage[page] : undefined;
  const { data, error, isFetching } = useMethods(
    username,
    page,
    name,
    filters,
    cursor
  );

  useEffect(() => {
    setPage(1);
    setCursorByPage({ 1: undefined });
  }, [username, name, filters]);

  useEffect(() => {
    if (data?.hasNext !== true || !data.nextCursor) return;
    const nextPage = page + 1;
    setCursorByPage((previous) => {
      if (previous[nextPage] === data.nextCursor) return previous;
      return { ...previous, [nextPage]: data.nextCursor };
    });
  }, [data?.hasNext, data?.nextCursor, page]);

  const rows: Row[] = (data?.methods ?? []).flatMap((method: Method) =>
    method.variants.map((variant: Variant, index: number) => {
      const variantCount = method.variantCount ?? method.variants.length;
      const xpHour = Array.isArray(variant.xpHour)
        ? variant.xpHour
        : variant.xpHour
          ? Object.entries(variant.xpHour).map(([skill, experience]) => ({
              skill,
              experience: Number(experience),
            }))
          : [];
      const levels = Array.isArray(variant.requirements?.levels)
        ? variant.requirements?.levels
        : variant.requirements?.levels
          ? Object.entries(variant.requirements.levels).map(([skill, level]) => ({
              skill,
              level: Number(level),
            }))
          : [];
      return {
        id: `${method.slug}-${variant.slug ?? variant.id ?? index}`,
        methodId: method.id,
        methodSlug: method.slug,
        variantSlug: variant.slug ?? (variant.id ?? index).toString(),
        variantCount,
        name: method.name,
        category: method.category,
        label: variant.label,
        xpHour,
        clickIntensity: variant.clickIntensity,
        afkiness: variant.afkiness,
        riskLevel: variant.riskLevel,
        levels,
        lowProfit: variant.lowProfit,
        highProfit: variant.highProfit,
        marketImpactInstant: variant.marketImpactInstant,
        marketImpactSlow: variant.marketImpactSlow,
        likes: method.likes,
        likedByMe: method.likedByMe,
      };
    })
  );

  const calculatedPageCount =
    data?.total !== undefined &&
    data?.perPage !== undefined &&
    data.perPage > 0
      ? Math.max(1, Math.ceil(data.total / data.perPage))
      : undefined;

  const pageCount = Math.max(
    page,
    data?.pageCount ?? calculatedPageCount ?? (data?.hasNext ? page + 1 : page)
  );
  const hasNextPage = data?.hasNext ?? page < pageCount;

  const getSortIcon = (key: SortBy) => {
    if (sortBy !== key || !order) {
      return <ArrowUpDown className="h-5 w-5 shrink-0 text-muted-foreground" />;
    }

    return order === "asc" ? (
      <ArrowUp className="h-5 w-5 shrink-0" />
    ) : (
      <ArrowDown className="h-5 w-5 shrink-0" />
    );
  };

  const handleSortClick = (key: SortBy) => {
    if (!onSortChange) return;

    if (sortBy !== key) {
      onSortChange(key, "asc");
      return;
    }

    if (order === "asc") {
      onSortChange(key, "desc");
      return;
    }

    onSortChange(undefined, undefined);
  };
  const clearPrefetchTimer = useCallback(() => {
    if (hoverPrefetchTimerRef.current === null) return;
    clearTimeout(hoverPrefetchTimerRef.current);
    hoverPrefetchTimerRef.current = null;
    hoveredSlugRef.current = null;
  }, []);

  const prefetchMethodDetail = useCallback(
    (methodSlug: string) => {
      const normalizedSlug = normalizeMethodSlug(methodSlug);
      if (!normalizedSlug) return;

      const normalizedUsername = normalizeUsername(username);
      const queryKey = getMethodDetailQueryKey(normalizedSlug, normalizedUsername);
      const existingState = queryClient.getQueryState<MethodDetailResponse>(queryKey);

      if (existingState?.fetchStatus === "fetching") return;

      if (
        existingState?.dataUpdatedAt &&
        Date.now() - existingState.dataUpdatedAt < QUERY_STALE_TIME_MS
      ) {
        return;
      }

      void queryClient
        .prefetchQuery({
          queryKey,
          queryFn: () => fetchMethodDetailBySlug(normalizedSlug, normalizedUsername),
          staleTime: QUERY_STALE_TIME_MS,
        })
        .then(() => {
          const detail = queryClient.getQueryData<MethodDetailResponse>(queryKey);
          const itemIds = getMethodItemIds(detail?.method);
          if (itemIds.length === 0) return;

          const itemsQueryKey = getItemsQueryKey(itemIds);
          const existingItemsState =
            queryClient.getQueryState<Record<number, Item>>(itemsQueryKey);

          if (existingItemsState?.fetchStatus === "fetching") return;

          if (
            existingItemsState?.dataUpdatedAt &&
            Date.now() - existingItemsState.dataUpdatedAt < QUERY_STALE_TIME_MS
          ) {
            return;
          }

          void queryClient.prefetchQuery({
            queryKey: itemsQueryKey,
            queryFn: () => fetchItems(itemIds),
            staleTime: QUERY_STALE_TIME_MS,
          });
        })
        .catch(() => undefined);
    },
    [queryClient, username]
  );

  const scheduleMethodPrefetch = useCallback(
    (methodSlug: string) => {
      clearPrefetchTimer();
      hoveredSlugRef.current = methodSlug;
      hoverPrefetchTimerRef.current = setTimeout(() => {
        if (hoveredSlugRef.current !== methodSlug) return;
        prefetchMethodDetail(methodSlug);
        hoverPrefetchTimerRef.current = null;
      }, DETAIL_PREFETCH_HOVER_DELAY_MS);
    },
    [clearPrefetchTimer, prefetchMethodDetail]
  );

  useEffect(() => clearPrefetchTimer, [clearPrefetchTimer]);

  return (
    <div className="space-y-4">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[21%]">Method Name</TableHead>
            <TableHead className="w-[12%]">
              <button
                type="button"
                className="inline-flex w-full items-center gap-1 font-medium text-left"
                onClick={() => handleSortClick("highProfit")}
              >
                <span>Gp/Hr</span>
                {getSortIcon("highProfit")}
              </button>
            </TableHead>
            <TableHead className="w-[12%]">Liquidity score</TableHead>
            <TableHead className="w-[15%]">
              <button
                type="button"
                className="inline-flex w-full items-center gap-1 font-medium text-left"
                onClick={() => handleSortClick("xpHour")}
              >
                <span>XP/Hr</span>
                {getSortIcon("xpHour")}
              </button>
            </TableHead>
            <TableHead className="w-[12%]">
              <button
                type="button"
                className="inline-flex w-full items-center gap-1 font-medium text-left"
                onClick={() => handleSortClick("clickIntensity")}
              >
                <span>Click Intensity</span>
                {getSortIcon("clickIntensity")}
              </button>
            </TableHead>
            <TableHead className="w-[8%]">
              <button
                type="button"
                className="inline-flex w-full items-center gap-1 font-medium text-left"
                onClick={() => handleSortClick("afkiness")}
              >
                <span>AFKiness</span>
                {getSortIcon("afkiness")}
              </button>
            </TableHead>
            <TableHead className="w-[12%]">Requirements</TableHead>
            <TableHead className="w-[8%]">
              <button
                type="button"
                className="inline-flex w-full items-center gap-1 font-medium text-left"
                onClick={() => handleSortClick("likes")}
              >
                <span>Likes</span>
                {getSortIcon("likes")}
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isFetching ? (
            Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
              <TableRow key={`fetching-skeleton-row-${index}`}>
                <TableCell>
                  <div className="h-5 w-[85%] animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-14 animate-pulse rounded bg-muted" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="h-6 w-24 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-14 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-10 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-6 w-20 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-6 w-20 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-14 animate-pulse rounded bg-muted" />
                </TableCell>
              </TableRow>
            ))
          ) : error && !data ? (
            <TableRow>
              <TableCell colSpan={8} className="text-red-500">
                Error: {`${error}`}
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-muted-foreground">
                No methods found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium truncate">
                  <Link
                    to={`/moneyMakingMethod/${row.methodSlug}${
                      row.variantCount > 1 ? `/${row.variantSlug}` : ""
                    }`}
                    className="text-blue-600 hover:underline"
                    onMouseEnter={() => scheduleMethodPrefetch(row.methodSlug)}
                    onMouseLeave={clearPrefetchTimer}
                    onFocus={() => scheduleMethodPrefetch(row.methodSlug)}
                    onBlur={clearPrefetchTimer}
                    onMouseDown={() => prefetchMethodDetail(row.methodSlug)}
                    onTouchStart={() => prefetchMethodDetail(row.methodSlug)}
                  >
                    {row.name}
                  </Link>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold">
                      {row.highProfit !== undefined
                        ? formatNumber(row.highProfit)
                        : "N/A"}
                    </span>
                    <span>
                      {row.lowProfit !== undefined
                        ? formatNumber(row.lowProfit)
                        : "N/A"}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col leading-tight">
                    <span>{formatLiquidityScore(row.marketImpactSlow)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatLiquidityScore(row.marketImpactInstant)}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(row.xpHour || []).map(
                      ({
                        skill,
                        experience,
                      }: {
                        skill: string;
                        experience: number;
                      }) => (
                        <Badge size="lg" key={skill} variant="secondary">
                          <img
                            src={getUrlByType(skill) ?? ""}
                            alt={`${skill.toLowerCase()}_icon`}
                            title={`${skill}`}
                          />
                          {formatNumber(experience)}
                        </Badge>
                      )
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  {row.clickIntensity !== undefined
                    ? `${row.clickIntensity}cph`
                    : "-"}
                </TableCell>

                <TableCell>
                  {row.afkiness !== undefined ? `${row.afkiness}%` : "N/A"}
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {row.levels.map(
                      ({ skill, level }: { skill: string; level: number }) => (
                        <Badge size="lg" key={skill} variant="secondary">
                          <img
                            src={getUrlByType(skill) ?? ""}
                            alt={`${skill.toLowerCase()}_icon`}
                            title={`${skill}`}
                          />
                          {level}
                        </Badge>
                      )
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <LikeButton
                    methodId={row.methodId}
                    likedByMe={row.likedByMe}
                    likes={row.likes}
                    className="h-auto px-0 hover:bg-transparent"
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <Pagination
        page={page}
        pageCount={pageCount}
        hasNext={hasNextPage}
        onPageChange={setPage}
      />
    </div>
  );
}
