import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMethods } from "./hooks";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { cn, formatNumber, getUrlByType } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { VariantMembershipBadge } from "@/components/VariantMembershipBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
const SHOW_FROM_SECOND_SCALE = "hidden md:table-cell";
const SHOW_FROM_THIRD_SCALE = "hidden lg:table-cell";

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
  members: boolean;
  iconId?: number;
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
  const hoverPrefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const hoveredSlugRef = useRef<string | null>(null);
  const cursor = page > 1 ? cursorByPage[page] : undefined;
  const { data, error, isFetching, isLoading } = useMethods(
    username,
    page,
    name,
    filters,
    cursor,
  );
  const isTableLoading = isLoading || isFetching;
  const isInitialLoading = isTableLoading && !data && !error;

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
          ? Object.entries(variant.requirements.levels).map(
              ([skill, level]) => ({
                skill,
                level: Number(level),
              }),
            )
          : [];
      return {
        id: `${method.slug}-${variant.slug ?? variant.id ?? index}`,
        methodId: method.id,
        methodSlug: method.slug,
        variantSlug: variant.slug ?? (variant.id ?? index).toString(),
        variantLabel: variant.label,
        variantCount,
        members: variant.members,
        iconId: variant.icon_id ?? undefined,
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
    }),
  );

  const variantIconIds = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.iconId)
            .filter((iconId): iconId is number => Number.isInteger(iconId)),
        ),
      ).sort((a, b) => a - b),
    [rows],
  );

  const { data: variantIcons = {} } = useQuery<Record<number, Item>>({
    queryKey: getItemsQueryKey(variantIconIds),
    queryFn: () => fetchItems(variantIconIds),
    enabled: variantIconIds.length > 0,
    staleTime: QUERY_STALE_TIME_MS,
  });

  const calculatedPageCount =
    data?.total !== undefined && data?.perPage !== undefined && data.perPage > 0
      ? Math.max(1, Math.ceil(data.total / data.perPage))
      : undefined;

  const pageCount = Math.max(
    page,
    data?.pageCount ?? calculatedPageCount ?? (data?.hasNext ? page + 1 : page),
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

  const renderSortHeader = (label: string, key: SortBy) => (
    <button
      type="button"
      className="inline-flex max-w-full items-center gap-1 text-left font-medium leading-tight"
      onClick={() => handleSortClick(key)}
    >
      <span className="min-w-0 whitespace-normal break-words">{label}</span>
      {getSortIcon(key)}
    </button>
  );

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
      const queryKey = getMethodDetailQueryKey(
        normalizedSlug,
        normalizedUsername,
      );
      const existingState =
        queryClient.getQueryState<MethodDetailResponse>(queryKey);

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
          queryFn: () =>
            fetchMethodDetailBySlug(normalizedSlug, normalizedUsername),
          staleTime: QUERY_STALE_TIME_MS,
        })
        .then(() => {
          const detail =
            queryClient.getQueryData<MethodDetailResponse>(queryKey);
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
    [queryClient, username],
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
    [clearPrefetchTimer, prefetchMethodDetail],
  );

  useEffect(() => clearPrefetchTimer, [clearPrefetchTimer]);

  const splitByCurrentSkill = <T extends { skill: string }>(
    entries: T[],
    collapseSingleOverflow: boolean,
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
    overflow: Array<{ skill: string; level: number }>,
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
            <p className="text-[11px] text-muted-foreground">
              Requirement skills
            </p>
            <div className="flex flex-wrap gap-1">
              {overflow.map((entry, index) => {
                const normalized = entry.skill.trim().toLowerCase();
                return (
                  <Badge
                    size="sm"
                    key={`${normalized}-${index}`}
                    variant="secondary"
                  >
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
    entries: Array<{ skill: string; level: number }>,
  ) => {
    if (entries.length === 0) {
      return {
        visible: [] as Array<{ skill: string; level: number }>,
        overflow: [] as Array<{ skill: string; level: number }>,
      };
    }

    const normalizedEntries = entries.map((entry, index) => ({
      entry,
      index,
      normalizedSkill: entry.skill.trim().toLowerCase(),
    }));

    const highlightedEntries = normalizedEntries.filter(
      ({ normalizedSkill }) =>
        normalizedHighlightSkill.length > 0 &&
        normalizedSkill === normalizedHighlightSkill,
    );

    const preferredEntry =
      highlightedEntries.length > 0
        ? highlightedEntries.reduce((best, candidate) =>
            candidate.entry.level > best.entry.level ? candidate : best,
          )
        : normalizedEntries.reduce((best, candidate) =>
            candidate.entry.level > best.entry.level ? candidate : best,
          );

    return {
      visible: [preferredEntry.entry],
      overflow: entries.filter((_, index) => index !== preferredEntry.index),
    };
  };

  const renderXpOverflow = (
    overflow: Array<{ skill: string; experience: number }>,
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
                  <Badge
                    size="sm"
                    key={`${normalized}-${index}`}
                    variant="secondary"
                  >
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

  const renderRequirementsCell = (row: Row, className?: string) => (
    <TableCell className={className}>
      <div className="flex flex-wrap gap-1">
        {(() => {
          const { visible, overflow } = isSkillTable
            ? splitRequirementsForSkillTable(row.levels)
            : splitByCurrentSkill(row.levels, true);
          return (
            <>
              {visible.map(
                ({ skill, level }: { skill: string; level: number }) => (
                  <Badge size="lg" key={skill} variant="secondary">
                    <img
                      src={getUrlByType(skill) ?? ""}
                      alt={`${skill.toLowerCase()}_icon`}
                    />
                    {level}
                  </Badge>
                ),
              )}
              {renderRequirementsOverflow(overflow)}
            </>
          );
        })()}
      </div>
    </TableCell>
  );

  const renderMethodCell = (row: Row, className?: string) => (
    <TableCell className={cn("min-w-0 font-medium", className)}>
      <div className="flex items-start gap-2">
        {row.iconId && variantIcons[row.iconId]?.iconUrl ? (
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
            <img
              src={variantIcons[row.iconId]?.iconUrl}
              alt={`${row.name} icon`}
              className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
            />
          </div>
        ) : null}
        <div className="min-w-0 space-y-1">
          <Link
            to={`/moneyMakingMethod/${row.methodSlug}${
              row.variantCount > 1 ? `/${row.variantSlug}` : ""
            }`}
            className="block min-w-0 truncate text-blue-600 hover:underline"
            onMouseEnter={() => scheduleMethodPrefetch(row.methodSlug)}
            onMouseLeave={clearPrefetchTimer}
            onFocus={() => scheduleMethodPrefetch(row.methodSlug)}
            onBlur={clearPrefetchTimer}
            onMouseDown={() => prefetchMethodDetail(row.methodSlug)}
            onTouchStart={() => prefetchMethodDetail(row.methodSlug)}
          >
            {row.name}
          </Link>
          {!isSkillTable ? (
            <VariantMembershipBadge members={row.members} compact />
          ) : null}
        </div>
      </div>
    </TableCell>
  );

  const renderVariantCell = (row: Row, className?: string) => (
    <TableCell className={cn("min-w-0", className)}>
      <div className="space-y-1">
        <Link
          to={`/moneyMakingMethod/${row.methodSlug}/${row.variantSlug}`}
          className="block min-w-0 truncate text-blue-600 hover:underline"
          onMouseEnter={() => scheduleMethodPrefetch(row.methodSlug)}
          onMouseLeave={clearPrefetchTimer}
          onFocus={() => scheduleMethodPrefetch(row.methodSlug)}
          onBlur={clearPrefetchTimer}
          onMouseDown={() => prefetchMethodDetail(row.methodSlug)}
          onTouchStart={() => prefetchMethodDetail(row.methodSlug)}
        >
          {row.variantLabel}
        </Link>
        <VariantMembershipBadge members={row.members} compact />
      </div>
    </TableCell>
  );

  const renderProfitCell = (row: Row, className?: string) => (
    <TableCell className={className}>
      <div className="flex flex-col">
        <span className="font-bold">
          {row.highProfit !== undefined ? formatNumber(row.highProfit) : "N/A"}
        </span>
        <span>
          {row.lowProfit !== undefined ? formatNumber(row.lowProfit) : "N/A"}
        </span>
      </div>
    </TableCell>
  );

  const renderGpPerXpCell = (row: Row, className?: string) => (
    <TableCell className={className}>
      <div className="flex flex-col leading-tight">
        <span>{formatGpPerXp(row.gpPerXpHigh)}</span>
        <span className="text-xs text-muted-foreground">
          {formatGpPerXp(row.gpPerXpLow)}
        </span>
      </div>
    </TableCell>
  );

  const renderLiquidityCell = (row: Row, className?: string) => (
    <TableCell className={className}>
      <div className="flex flex-col leading-tight">
        <span>{formatLiquidityScore(row.marketImpactSlow)}</span>
        <span className="text-xs text-muted-foreground">
          {formatLiquidityScore(row.marketImpactInstant)}
        </span>
      </div>
    </TableCell>
  );

  const renderXpCell = (row: Row, className?: string) => (
    <TableCell className={className}>
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
                ),
              )}
              {renderXpOverflow(overflow)}
            </>
          );
        })()}
      </div>
    </TableCell>
  );

  const renderClickIntensityCell = (row: Row, className?: string) => (
    <TableCell className={className}>
      {row.clickIntensity !== undefined ? `${row.clickIntensity}cph` : "-"}
    </TableCell>
  );

  const renderAfkinessCell = (row: Row, className?: string) => (
    <TableCell className={className}>
      {row.afkiness !== undefined ? `${row.afkiness}%` : "N/A"}
    </TableCell>
  );

  const renderLikesCell = (row: Row, className?: string) => (
    <TableCell className={className}>
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

  const renderSkeletonMetric = (
    primaryWidth = "70%",
    secondaryWidth = "55%",
  ) => (
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

  const getCellVisibilityClassName = (cellIndex: number) => {
    if (isSkillTable) {
      switch (cellIndex) {
        case 0:
        case 9:
          return SHOW_FROM_SECOND_SCALE;
        case 2:
        case 4:
        case 5:
        case 7:
          return SHOW_FROM_THIRD_SCALE;
        default:
          return undefined;
      }
    }

    switch (cellIndex) {
      case 2:
      case 4:
        return SHOW_FROM_THIRD_SCALE;
      case 6:
      case 7:
        return SHOW_FROM_SECOND_SCALE;
      default:
        return undefined;
    }
  };

  return (
    <div className="space-y-4">
      <Table className="table-fixed">
        <TableHeader>
          {isSkillTable ? (
            <TableRow>
              <TableHead
                className={cn(SHOW_FROM_SECOND_SCALE, "md:w-[16%] lg:w-[10%]")}
              >
                Requirements
              </TableHead>
              <TableHead className="w-[34%] md:w-[28%] lg:w-[17%]">
                Method Name
              </TableHead>
              <TableHead className={cn(SHOW_FROM_THIRD_SCALE, "lg:w-[13%]")}>
                Variant
              </TableHead>
              <TableHead className="w-[22%] md:w-[16%] lg:w-[10%]">
                {renderSortHeader("Gp/Hr", "highProfit")}
              </TableHead>
              <TableHead className={cn(SHOW_FROM_THIRD_SCALE, "lg:w-[9%]")}>
                {renderSortHeader("Gp/XP", "gpPerXpHigh")}
              </TableHead>
              <TableHead className={cn(SHOW_FROM_THIRD_SCALE, "lg:w-[10%]")}>
                Liquidity score
              </TableHead>
              <TableHead className="w-[22%] md:w-[16%] lg:w-[11%]">
                {renderSortHeader("XP/Hr", "xpHour")}
              </TableHead>
              <TableHead className={cn(SHOW_FROM_THIRD_SCALE, "lg:w-[8%]")}>
                {renderSortHeader("Click Intensity", "clickIntensity")}
              </TableHead>
              <TableHead className="w-[22%] md:w-[12%] lg:w-[6%]">
                {renderSortHeader("AFKiness", "afkiness")}
              </TableHead>
              <TableHead
                className={cn(SHOW_FROM_SECOND_SCALE, "md:w-[12%] lg:w-[6%]")}
              >
                {renderSortHeader("Likes", "likes")}
              </TableHead>
            </TableRow>
          ) : (
            <TableRow>
              <TableHead className="w-[34%] md:w-[28%] lg:w-[21%]">
                Method Name
              </TableHead>
              <TableHead className="w-[22%] md:w-[16%] lg:w-[12%]">
                {renderSortHeader("Gp/Hr", "highProfit")}
              </TableHead>
              <TableHead className={cn(SHOW_FROM_THIRD_SCALE, "lg:w-[12%]")}>
                Liquidity score
              </TableHead>
              <TableHead className="w-[22%] md:w-[16%] lg:w-[15%]">
                {renderSortHeader("XP/Hr", "xpHour")}
              </TableHead>
              <TableHead className={cn(SHOW_FROM_THIRD_SCALE, "lg:w-[12%]")}>
                {renderSortHeader("Click Intensity", "clickIntensity")}
              </TableHead>
              <TableHead className="w-[22%] md:w-[12%] lg:w-[8%]">
                {renderSortHeader("AFKiness", "afkiness")}
              </TableHead>
              <TableHead
                className={cn(SHOW_FROM_SECOND_SCALE, "md:w-[16%] lg:w-[12%]")}
              >
                Requirements
              </TableHead>
              <TableHead
                className={cn(SHOW_FROM_SECOND_SCALE, "md:w-[12%] lg:w-[8%]")}
              >
                {renderSortHeader("Likes", "likes")}
              </TableHead>
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {isTableLoading ? (
            Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
              <TableRow key={`fetching-skeleton-row-${index}`}>
                {Array.from({ length: tableColumnCount }).map(
                  (_, cellIndex) => (
                    <TableCell
                      key={`fetching-skeleton-cell-${index}-${cellIndex}`}
                      className={getCellVisibilityClassName(cellIndex)}
                    >
                      {renderSkeletonCellContent(cellIndex)}
                    </TableCell>
                  ),
                )}
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
              <TableCell
                colSpan={tableColumnCount}
                className="text-muted-foreground"
              >
                No methods found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {isSkillTable ? (
                  <>
                    {renderRequirementsCell(row, SHOW_FROM_SECOND_SCALE)}
                    {renderMethodCell(row)}
                    {renderVariantCell(row, SHOW_FROM_THIRD_SCALE)}
                    {renderProfitCell(row)}
                    {renderGpPerXpCell(row, SHOW_FROM_THIRD_SCALE)}
                    {renderLiquidityCell(row, SHOW_FROM_THIRD_SCALE)}
                    {renderXpCell(row)}
                    {renderClickIntensityCell(row, SHOW_FROM_THIRD_SCALE)}
                    {renderAfkinessCell(row)}
                    {renderLikesCell(row, SHOW_FROM_SECOND_SCALE)}
                  </>
                ) : (
                  <>
                    {renderMethodCell(row)}
                    {renderProfitCell(row)}
                    {renderLiquidityCell(row, SHOW_FROM_THIRD_SCALE)}
                    {renderXpCell(row)}
                    {renderClickIntensityCell(row, SHOW_FROM_THIRD_SCALE)}
                    {renderAfkinessCell(row)}
                    {renderRequirementsCell(row, SHOW_FROM_SECOND_SCALE)}
                    {renderLikesCell(row, SHOW_FROM_SECOND_SCALE)}
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
