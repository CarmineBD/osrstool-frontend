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
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, getUrlByType } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  isSkillTable?: boolean;
  highlightSkill?: string;
  sortBy?: SortBy;
  order?: SortOrder;
  onSortChange?: (sortBy?: SortBy, order?: SortOrder) => void;
};

interface Row {
  id: string;
  methodId: string;
  methodSlug: string;
  variantSlug: string;
  variantLabel: string;
  variantCount: number;
  name: string;
  category: string;
  xpHour: { skill: string; experience: number }[];
  clickIntensity?: number;
  afkiness?: number;
  riskLevel?: string;
  levels: { skill: string; level: number }[];
  lowProfit?: number;
  highProfit?: number;
  gpPerXpHigh?: number;
  gpPerXpLow?: number;
  marketImpactInstant?: number;
  marketImpactSlow?: number;
  likes?: number;
  likedByMe?: boolean;
}

function formatLiquidityScore(score?: number): string {
  if (typeof score !== "number") return "N/A";
  return `${(score * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

function formatGpPerXp(value?: number): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  const rounded = Math.round(value * 100) / 100;
  const normalized = Object.is(rounded, -0) ? 0 : rounded;
  const prefix = normalized > 0 ? "+" : "";
  return `${prefix}${normalized.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function MethodsList({
  username,
  name,
  filters,
  isSkillTable = false,
  highlightSkill,
  sortBy,
  order,
  onSortChange,
}: Props) {
  const queryClient = useQueryClient();
  const SKELETON_ROW_COUNT = 8;
  const tableColumnCount = isSkillTable ? 10 : 8;
  const [page, setPage] = useState(1);
  const [cursorByPage, setCursorByPage] = useState<
    Record<number, string | undefined>
  >({ 1: undefined });
  const hoverPrefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredSlugRef = useRef<string | null>(null);
  const cursor = page > 1 ? cursorByPage[page] : undefined;
  const { data, error, isFetching, isLoading } = useMethods(
    username,
    page,
    name,
    filters,
    cursor
  );
  const isInitialLoading = (isLoading || isFetching) && !data && !error;
  const isRefreshing = isFetching && !!data;

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
        variantLabel: variant.label,
        variantCount,
        name: method.name,
        category: method.category,
        xpHour,
        clickIntensity: variant.clickIntensity,
        afkiness: variant.afkiness,
        riskLevel: variant.riskLevel,
        levels,
        lowProfit: variant.lowProfit,
        highProfit: variant.highProfit,
        gpPerXpHigh: variant.gpPerXpHigh,
        gpPerXpLow: variant.gpPerXpLow,
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
  const normalizedHighlightSkill =
    isSkillTable && highlightSkill ? highlightSkill.trim().toLowerCase() : "";

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

  const splitByCurrentSkill = <T extends { skill: string }>(
    entries: T[],
    collapseSingleOverflow: boolean
  ) => {
    if (!normalizedHighlightSkill) {
      return { visible: entries, overflow: [] as T[] };
    }

    const visible: T[] = [];
    const overflow: T[] = [];
    for (const entry of entries) {
      if (entry.skill.trim().toLowerCase() === normalizedHighlightSkill) {
        visible.push(entry);
      } else {
        overflow.push(entry);
      }
    }

    if (visible.length === 0) {
      return { visible: entries, overflow: [] as T[] };
    }

    if (collapseSingleOverflow && overflow.length <= 1) {
      return { visible: entries, overflow: [] as T[] };
    }

    return { visible, overflow };
  };

  const renderRequirementsOverflow = (
    overflow: Array<{ skill: string; level: number }>
  ) => {
    if (overflow.length === 0) return null;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {`and ${overflow.length} more`}
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>
          <div className="max-w-xs space-y-2">
            <p className="text-[11px] text-muted-foreground">Requirement skills</p>
            <div className="flex flex-wrap gap-1">
              {overflow.map((entry, index) => {
                const normalized = entry.skill.trim().toLowerCase();
                return (
                  <Badge size="sm" key={`${normalized}-${index}`} variant="secondary">
                    <img
                      src={getUrlByType(normalized) ?? ""}
                      alt={`${normalized}_icon`}
                    />
                    {`${entry.skill}: ${entry.level}`}
                  </Badge>
                );
              })}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  const splitRequirementsForSkillTable = (
    entries: Array<{ skill: string; level: number }>
  ) => {
    if (entries.length === 0) {
      return { visible: [] as Array<{ skill: string; level: number }>, overflow: [] as Array<{ skill: string; level: number }> };
    }

    const normalizedEntries = entries.map((entry, index) => ({
      entry,
      index,
      normalizedSkill: entry.skill.trim().toLowerCase(),
    }));

    const highlightedEntries = normalizedEntries.filter(
      ({ normalizedSkill }) =>
        normalizedHighlightSkill.length > 0 &&
        normalizedSkill === normalizedHighlightSkill
    );

    const preferredEntry =
      highlightedEntries.length > 0
        ? highlightedEntries.reduce((best, candidate) =>
            candidate.entry.level > best.entry.level ? candidate : best
          )
        : normalizedEntries.reduce((best, candidate) =>
            candidate.entry.level > best.entry.level ? candidate : best
          );

    return {
      visible: [preferredEntry.entry],
      overflow: entries.filter((_, index) => index !== preferredEntry.index),
    };
  };

  const renderXpOverflow = (
    overflow: Array<{ skill: string; experience: number }>
  ) => {
    if (overflow.length === 0) return null;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {`and ${overflow.length} more...`}
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>
          <div className="max-w-xs space-y-2">
            <p className="text-[11px] text-muted-foreground">XP/Hr skills</p>
            <div className="flex flex-wrap gap-1">
              {overflow.map((entry, index) => {
                const normalized = entry.skill.trim().toLowerCase();
                return (
                  <Badge size="sm" key={`${normalized}-${index}`} variant="secondary">
                    <img
                      src={getUrlByType(normalized) ?? ""}
                      alt={`${normalized}_icon`}
                    />
                    {`${entry.skill}: ${formatNumber(entry.experience)}`}
                  </Badge>
                );
              })}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderRequirementsCell = (row: Row) => (
    <TableCell>
      <div className="flex flex-wrap gap-1">
        {(() => {
          const { visible, overflow } = isSkillTable
            ? splitRequirementsForSkillTable(row.levels)
            : splitByCurrentSkill(row.levels, true);
          return (
            <>
              {visible.map(({ skill, level }: { skill: string; level: number }) => (
                <Badge size="lg" key={skill} variant="secondary">
                  <img
                    src={getUrlByType(skill) ?? ""}
                    alt={`${skill.toLowerCase()}_icon`}
                  />
                  {level}
                </Badge>
              ))}
              {renderRequirementsOverflow(overflow)}
            </>
          );
        })()}
      </div>
    </TableCell>
  );

  const renderMethodCell = (row: Row) => (
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
  );

  const renderVariantCell = (row: Row) => (
    <TableCell className="truncate">
      <Link
        to={`/moneyMakingMethod/${row.methodSlug}/${row.variantSlug}`}
        className="text-blue-600 hover:underline"
        onMouseEnter={() => scheduleMethodPrefetch(row.methodSlug)}
        onMouseLeave={clearPrefetchTimer}
        onFocus={() => scheduleMethodPrefetch(row.methodSlug)}
        onBlur={clearPrefetchTimer}
        onMouseDown={() => prefetchMethodDetail(row.methodSlug)}
        onTouchStart={() => prefetchMethodDetail(row.methodSlug)}
      >
        {row.variantLabel}
      </Link>
    </TableCell>
  );

  const renderProfitCell = (row: Row) => (
    <TableCell>
      <div className="flex flex-col">
        <span className="font-bold">
          {row.highProfit !== undefined ? formatNumber(row.highProfit) : "N/A"}
        </span>
        <span>{row.lowProfit !== undefined ? formatNumber(row.lowProfit) : "N/A"}</span>
      </div>
    </TableCell>
  );

  const renderGpPerXpCell = (row: Row) => (
    <TableCell>
      <div className="flex flex-col leading-tight">
        <span>{formatGpPerXp(row.gpPerXpHigh)}</span>
        <span className="text-xs text-muted-foreground">
          {formatGpPerXp(row.gpPerXpLow)}
        </span>
      </div>
    </TableCell>
  );

  const renderLiquidityCell = (row: Row) => (
    <TableCell>
      <div className="flex flex-col leading-tight">
        <span>{formatLiquidityScore(row.marketImpactSlow)}</span>
        <span className="text-xs text-muted-foreground">
          {formatLiquidityScore(row.marketImpactInstant)}
        </span>
      </div>
    </TableCell>
  );

  const renderXpCell = (row: Row) => (
    <TableCell>
      <div className="flex flex-wrap gap-1">
        {(() => {
          const { visible, overflow } = splitByCurrentSkill(row.xpHour, false);
          return (
            <>
              {visible.map(
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
                    />
                    {formatNumber(experience)}
                  </Badge>
                )
              )}
              {renderXpOverflow(overflow)}
            </>
          );
        })()}
      </div>
    </TableCell>
  );

  const renderClickIntensityCell = (row: Row) => (
    <TableCell>
      {row.clickIntensity !== undefined ? `${row.clickIntensity}cph` : "-"}
    </TableCell>
  );

  const renderAfkinessCell = (row: Row) => (
    <TableCell>{row.afkiness !== undefined ? `${row.afkiness}%` : "N/A"}</TableCell>
  );

  const renderLikesCell = (row: Row) => (
    <TableCell>
      <LikeButton
        methodId={row.methodId}
        likedByMe={row.likedByMe}
        likes={row.likes}
        className="h-auto px-0 hover:bg-transparent"
      />
    </TableCell>
  );

  const renderSkeletonBadges = (count: number) => (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={`skeleton-badge-${count}-${index}`}
          className="h-6 w-16 rounded-full"
        />
      ))}
    </div>
  );

  const renderSkeletonMetric = (primaryWidth = "70%", secondaryWidth = "55%") => (
    <div className="space-y-1">
      <Skeleton className="h-4" style={{ width: primaryWidth }} />
      <Skeleton className="h-3" style={{ width: secondaryWidth }} />
    </div>
  );

  const renderSkeletonCellContent = (cellIndex: number) => {
    if (isSkillTable) {
      switch (cellIndex) {
        case 0:
          return renderSkeletonBadges(2);
        case 1:
          return <Skeleton className="h-4" style={{ width: "78%" }} />;
        case 2:
          return <Skeleton className="h-4" style={{ width: "66%" }} />;
        case 3:
        case 4:
        case 5:
          return renderSkeletonMetric();
        case 6:
          return renderSkeletonBadges(2);
        case 7:
        case 8:
          return <Skeleton className="h-4" style={{ width: "58%" }} />;
        default:
          return <Skeleton className="h-8 w-8 rounded-full" />;
      }
    }

    switch (cellIndex) {
      case 0:
        return <Skeleton className="h-4" style={{ width: "72%" }} />;
      case 1:
      case 2:
        return renderSkeletonMetric();
      case 3:
      case 6:
        return renderSkeletonBadges(2);
      case 4:
      case 5:
        return <Skeleton className="h-4" style={{ width: "60%" }} />;
      default:
        return <Skeleton className="h-8 w-8 rounded-full" />;
    }
  };

  return (
    <div className="space-y-4">
      {isRefreshing ? (
        <div
          className="flex items-center gap-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <Skeleton className="h-2 w-2 rounded-full" />
          <span>Actualizando resultados...</span>
        </div>
      ) : null}
      <Table className="table-fixed">
        <TableHeader>
          {isSkillTable ? (
            <TableRow>
              <TableHead className="w-[12%]">Requirements</TableHead>
              <TableHead className="w-[18%]">Method Name</TableHead>
              <TableHead className="w-[14%]">Variant</TableHead>
              <TableHead className="w-[10%]">
                <button
                  type="button"
                  className="inline-flex w-full items-center gap-1 font-medium text-left"
                  onClick={() => handleSortClick("highProfit")}
                >
                  <span>Gp/Hr</span>
                  {getSortIcon("highProfit")}
                </button>
              </TableHead>
              <TableHead className="w-[10%]">
                <button
                  type="button"
                  className="inline-flex w-full items-center gap-1 font-medium text-left"
                  onClick={() => handleSortClick("gpPerXpHigh")}
                >
                  <span>Gp/XP</span>
                  {getSortIcon("gpPerXpHigh")}
                </button>
              </TableHead>
              <TableHead className="w-[10%]">Liquidity score</TableHead>
              <TableHead className="w-[12%]">
                <button
                  type="button"
                  className="inline-flex w-full items-center gap-1 font-medium text-left"
                  onClick={() => handleSortClick("xpHour")}
                >
                  <span>XP/Hr</span>
                  {getSortIcon("xpHour")}
                </button>
              </TableHead>
              <TableHead className="w-[8%]">
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
          ) : (
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
          )}
        </TableHeader>
        <TableBody>
          {isInitialLoading ? (
            Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
              <TableRow key={`fetching-skeleton-row-${index}`}>
                {Array.from({ length: tableColumnCount }).map((_, cellIndex) => (
                  <TableCell key={`fetching-skeleton-cell-${index}-${cellIndex}`}>
                    {renderSkeletonCellContent(cellIndex)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : error && !data ? (
            <TableRow>
              <TableCell colSpan={tableColumnCount} className="text-red-500">
                Error: {`${error}`}
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={tableColumnCount} className="text-muted-foreground">
                No methods found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {isSkillTable ? (
                  <>
                    {renderRequirementsCell(row)}
                    {renderMethodCell(row)}
                    {renderVariantCell(row)}
                    {renderProfitCell(row)}
                    {renderGpPerXpCell(row)}
                    {renderLiquidityCell(row)}
                    {renderXpCell(row)}
                    {renderClickIntensityCell(row)}
                    {renderAfkinessCell(row)}
                    {renderLikesCell(row)}
                  </>
                ) : (
                  <>
                    {renderMethodCell(row)}
                    {renderProfitCell(row)}
                    {renderLiquidityCell(row)}
                    {renderXpCell(row)}
                    {renderClickIntensityCell(row)}
                    {renderAfkinessCell(row)}
                    {renderRequirementsCell(row)}
                    {renderLikesCell(row)}
                  </>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {isInitialLoading ? (
        <div className="flex items-center justify-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-24" />
        </div>
      ) : (
        <Pagination
          page={page}
          pageCount={pageCount}
          hasNext={hasNextPage}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
