import {
  Fragment,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMethods } from "./hooks";
import { useUsername } from "@/contexts/UsernameContext";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatedProfitValue } from "@/components/AnimatedProfitValue";
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
import { VariantTags } from "@/components/VariantTags";
import { cn, formatNumber, getUrlByType } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { VariantMembershipBadge } from "@/components/VariantMembershipBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  fetchIconRecords,
  fetchItems,
  fetchMethodDetailBySlug,
  getIconReferenceKey,
  normalizeIconSource,
  type IconRecord,
  type Method,
  type MethodDetailResponse,
  type MethodsFilters,
  type Item,
  type Variant,
  type VariantTag,
} from "@/lib/api";
import { ArrowDown, ArrowUp, ArrowUpDown, Heart } from "lucide-react";
import { QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";
import {
  getItemsQueryKey,
  getMethodDetailQueryKey,
  getMethodItemIds,
  normalizeMethodSlug,
} from "@/lib/queryKeys";
import { getVariantTags } from "@/lib/variantTags";
import {
  getDefaultMethodsTableFieldsState,
  getDefaultMethodsTableColumnIds,
  type MethodsTableColumnId,
} from "./tableColumns";

type SortBy = NonNullable<MethodsFilters["sortBy"]>;
type SortOrder = NonNullable<MethodsFilters["order"]>;
const DETAIL_PREFETCH_HOVER_DELAY_MS = 200;
type ColumnWidthToken = "method" | "tags" | "small";
type ColumnVisibilityTier = "always" | "md" | "lg" | "xl" | "2xl";
type ColumnPresentation = {
  width: ColumnWidthToken;
  visibility: ColumnVisibilityTier;
};
type CellRectSnapshot = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const COLUMN_WIDTH_CLASSNAMES: Record<ColumnWidthToken, string> = {
  method: "w-[46%] sm:w-[44%] md:w-[18rem] xl:w-[20rem]",
  tags: "w-[30%] sm:w-[28%] md:w-[13rem] xl:w-[15rem]",
  small: "w-[24%] sm:w-[20%] md:w-[7.5rem]",
};
const COLUMN_VISIBILITY_ANIMATION_MS = 220;
const COLUMN_VISIBILITY_ANIMATION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

const COLUMN_VISIBILITY_CLASSNAMES: Record<ColumnVisibilityTier, string> = {
  always: "",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
  "2xl": "hidden 2xl:table-cell",
};

const DEFAULT_COLUMN_PRESENTATION: Record<
  MethodsTableColumnId,
  ColumnPresentation
> = {
  requirements: { width: "small", visibility: "2xl" },
  methodName: { width: "method", visibility: "always" },
  members: { width: "small", visibility: "md" },
  variant: { width: "small", visibility: "md" },
  gpPerHr: { width: "small", visibility: "always" },
  tags: { width: "tags", visibility: "md" },
  gpPerXp: { width: "small", visibility: "xl" },
  liquidityScore: { width: "small", visibility: "xl" },
  xpPerHr: { width: "small", visibility: "lg" },
  clickIntensity: { width: "small", visibility: "xl" },
  afkiness: { width: "small", visibility: "xl" },
  likes: { width: "small", visibility: "2xl" },
};

const SKILL_COLUMN_PRESENTATION: Record<
  MethodsTableColumnId,
  ColumnPresentation
> = {
  requirements: { width: "small", visibility: "lg" },
  methodName: { width: "method", visibility: "always" },
  members: { width: "small", visibility: "lg" },
  variant: { width: "small", visibility: "md" },
  gpPerHr: { width: "small", visibility: "always" },
  tags: { width: "tags", visibility: "md" },
  gpPerXp: { width: "small", visibility: "xl" },
  liquidityScore: { width: "small", visibility: "xl" },
  xpPerHr: { width: "small", visibility: "xl" },
  clickIntensity: { width: "small", visibility: "2xl" },
  afkiness: { width: "small", visibility: "2xl" },
  likes: { width: "small", visibility: "2xl" },
};

export type Props = {
  username: string;
  name?: string;
  filters?: MethodsFilters;
  isSkillTable?: boolean;
  highlightSkill?: string;
  orderedColumnIds?: MethodsTableColumnId[];
  visibleColumnIds?: MethodsTableColumnId[];
  sortBy?: SortBy;
  order?: SortOrder;
  onSortChange?: (sortBy?: SortBy, order?: SortOrder) => void;
};

interface Row {
  id: string;
  methodSlug: string;
  variantSlug: string;
  variantLabel: string;
  variantCount: number;
  members: boolean;
  iconId?: number;
  iconSource: "item" | "game_icon";
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
  tags: VariantTag[];
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

function getSecondaryVariantLabel(
  methodName: string,
  variantLabel: string,
  isSkillTable: boolean,
): string | null {
  if (isSkillTable) return null;

  const normalizedMethodName = methodName.trim().toLowerCase();
  const trimmedVariantLabel = variantLabel.trim();
  const normalizedVariantLabel = trimmedVariantLabel.toLowerCase();

  if (!trimmedVariantLabel || normalizedVariantLabel === normalizedMethodName) {
    return null;
  }

  return trimmedVariantLabel;
}

function prefersReducedMotion() {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function buildColumnAnimationKey(
  rowKey: string,
  columnId: MethodsTableColumnId,
) {
  return `${rowKey}::${columnId}`;
}

function snapshotCellRect(
  element: HTMLElement,
  containerRect: DOMRect,
): CellRectSnapshot | null {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return {
    left: rect.left - containerRect.left,
    top: rect.top - containerRect.top,
    width: rect.width,
    height: rect.height,
  };
}

function animateCellReflow(
  element: HTMLElement,
  previousRect: CellRectSnapshot,
  currentRect: CellRectSnapshot,
) {
  const deltaX = previousRect.left - currentRect.left;
  const deltaY = previousRect.top - currentRect.top;
  const scaleX = previousRect.width / Math.max(currentRect.width, 1);
  const scaleY = previousRect.height / Math.max(currentRect.height, 1);

  if (
    Math.abs(deltaX) < 0.5 &&
    Math.abs(deltaY) < 0.5 &&
    Math.abs(scaleX - 1) < 0.01 &&
    Math.abs(scaleY - 1) < 0.01
  ) {
    return;
  }

  element.animate(
    [
      {
        transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`,
        opacity: 0.92,
      },
      {
        transform: "translate(0px, 0px) scale(1, 1)",
        opacity: 1,
      },
    ],
    {
      duration: COLUMN_VISIBILITY_ANIMATION_MS,
      easing: COLUMN_VISIBILITY_ANIMATION_EASING,
    },
  );
}

function animateCellEnter(element: HTMLElement) {
  element.animate(
    [
      {
        opacity: 0,
        transform: "translateY(-4px) scale(0.94, 0.98)",
      },
      {
        opacity: 1,
        transform: "translateY(0px) scale(1, 1)",
      },
    ],
    {
      duration: COLUMN_VISIBILITY_ANIMATION_MS,
      easing: COLUMN_VISIBILITY_ANIMATION_EASING,
    },
  );
}

function createExitGhost(source: HTMLElement, previousRect: CellRectSnapshot) {
  const ghost = document.createElement("div");
  const computedStyle = window.getComputedStyle(source);

  ghost.setAttribute("aria-hidden", "true");
  ghost.innerHTML = source.innerHTML;
  ghost.style.position = "absolute";
  ghost.style.left = `${previousRect.left}px`;
  ghost.style.top = `${previousRect.top}px`;
  ghost.style.width = `${previousRect.width}px`;
  ghost.style.height = `${previousRect.height}px`;
  ghost.style.boxSizing = "border-box";
  ghost.style.padding = computedStyle.padding;
  ghost.style.background = computedStyle.background;
  ghost.style.color = computedStyle.color;
  ghost.style.font = computedStyle.font;
  ghost.style.lineHeight = computedStyle.lineHeight;
  ghost.style.textAlign =
    computedStyle.textAlign as typeof ghost.style.textAlign;
  ghost.style.borderTop = computedStyle.borderTop;
  ghost.style.borderRight = computedStyle.borderRight;
  ghost.style.borderBottom = computedStyle.borderBottom;
  ghost.style.borderLeft = computedStyle.borderLeft;
  ghost.style.borderRadius = computedStyle.borderRadius;
  ghost.style.overflow = "hidden";
  ghost.style.pointerEvents = "none";
  ghost.style.transformOrigin = "left center";
  ghost.style.zIndex = "2";

  return ghost;
}

function animateCellExit(ghost: HTMLElement) {
  return ghost.animate(
    [
      {
        opacity: 1,
        transform: "translateY(0px) scale(1, 1)",
      },
      {
        opacity: 0,
        transform: "translateY(3px) scale(0.9, 0.98)",
      },
    ],
    {
      duration: COLUMN_VISIBILITY_ANIMATION_MS,
      easing: COLUMN_VISIBILITY_ANIMATION_EASING,
    },
  );
}

export function MethodsList({
  username,
  name,
  filters,
  isSkillTable = false,
  highlightSkill,
  orderedColumnIds,
  visibleColumnIds,
  sortBy,
  order,
  onSortChange,
}: Props) {
  const queryClient = useQueryClient();
  const SKELETON_ROW_COUNT = 8;
  const columnPresentation = isSkillTable
    ? SKILL_COLUMN_PRESENTATION
    : DEFAULT_COLUMN_PRESENTATION;
  const [page, setPage] = useState(1);
  const [cursorByPage, setCursorByPage] = useState<
    Record<number, string | undefined>
  >({ 1: undefined });
  const hoverPrefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const tableAnimationRootRef = useRef<HTMLDivElement | null>(null);
  const previousAnimatedCellsRef = useRef<Map<string, HTMLElement>>(new Map());
  const previousAnimatedCellRectsRef = useRef<Map<string, CellRectSnapshot>>(
    new Map(),
  );
  const previousColumnSignatureRef = useRef<string | null>(null);
  const hoveredSlugRef = useRef<string | null>(null);
  const cursor = page > 1 ? cursorByPage[page] : undefined;
  const { player } = useUsername();
  const playerContext = username ? (player ?? undefined) : undefined;
  const { data, error, isFetching, isLoading } = useMethods(
    playerContext,
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
  }, [username, playerContext, name, filters]);

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
        methodSlug: method.slug,
        variantSlug: variant.slug ?? (variant.id ?? index).toString(),
        variantLabel: variant.label,
        variantCount,
        members: variant.members,
        iconId: variant.icon_id ?? undefined,
        iconSource: normalizeIconSource(variant.iconSource),
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
        tags: getVariantTags(variant),
      };
    }),
  );

  const variantIconReferences = useMemo(
    () =>
      Array.from(
        new Map(
          rows
            .filter((row): row is Row & { iconId: number } =>
              Number.isInteger(row.iconId),
            )
            .map((row) => {
              const reference = { id: row.iconId, source: row.iconSource };
              return [getIconReferenceKey(reference), reference] as const;
            }),
        ).values(),
      ),
    [rows],
  );

  const { data: variantIcons = {} } = useQuery<Record<string, IconRecord>>({
    queryKey: [
      "iconRecords",
      variantIconReferences.map(getIconReferenceKey).sort(),
    ],
    queryFn: () => fetchIconRecords(variantIconReferences),
    enabled: variantIconReferences.length > 0,
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

      const playerForDetail = playerContext;
      const queryKey = getMethodDetailQueryKey(normalizedSlug, playerForDetail);
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
            fetchMethodDetailBySlug(normalizedSlug, playerForDetail),
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
    [queryClient, playerContext],
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
                const iconUrl = getUrlByType(normalized);
                return (
                  <Badge
                    size="sm"
                    key={`${normalized}-${index}`}
                    variant="secondary"
                  >
                    {iconUrl ? (
                      <img src={iconUrl} alt={`${normalized}_icon`} />
                    ) : null}
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
                const iconUrl = getUrlByType(normalized);
                return (
                  <Badge
                    size="sm"
                    key={`${normalized}-${index}`}
                    variant="secondary"
                  >
                    {iconUrl ? (
                      <img src={iconUrl} alt={`${normalized}_icon`} />
                    ) : null}
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
                ({ skill, level }: { skill: string; level: number }) => {
                  const iconUrl = getUrlByType(skill);
                  return (
                    <Badge size="lg" key={skill} variant="secondary">
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt={`${skill.toLowerCase()}_icon`}
                        />
                      ) : null}
                      {level}
                    </Badge>
                  );
                },
              )}
              {renderRequirementsOverflow(overflow)}
            </>
          );
        })()}
      </div>
    </TableCell>
  );

  const renderMethodCell = (row: Row, className?: string) => {
    const secondaryVariantLabel = getSecondaryVariantLabel(
      row.name,
      row.variantLabel,
      isSkillTable,
    );

    return (
      <TableCell className={cn("min-w-0 font-medium", className)}>
        <div className="flex items-start gap-2">
          {row.iconId &&
          variantIcons[
            getIconReferenceKey({ id: row.iconId, source: row.iconSource })
          ]?.iconUrl ? (
            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
              <img
                src={
                  variantIcons[
                    getIconReferenceKey({
                      id: row.iconId,
                      source: row.iconSource,
                    })
                  ]?.iconUrl
                }
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
              className="block min-w-0 truncate text-link transition-colors hover:text-link-hover hover:underline"
              onMouseEnter={() => scheduleMethodPrefetch(row.methodSlug)}
              onMouseLeave={clearPrefetchTimer}
              onFocus={() => scheduleMethodPrefetch(row.methodSlug)}
              onBlur={clearPrefetchTimer}
              onMouseDown={() => prefetchMethodDetail(row.methodSlug)}
              onTouchStart={() => prefetchMethodDetail(row.methodSlug)}
            >
              {row.name}
            </Link>
            {secondaryVariantLabel ? (
              <p className="truncate text-xs font-medium leading-4 text-muted-foreground">
                {secondaryVariantLabel}
              </p>
            ) : null}
          </div>
        </div>
      </TableCell>
    );
  };

  const renderVariantCell = (row: Row, className?: string) => (
    <TableCell className={cn("min-w-0", className)}>
      <div className="space-y-1">
        <Link
          to={`/moneyMakingMethod/${row.methodSlug}/${row.variantSlug}`}
          className="block min-w-0 truncate text-link transition-colors hover:text-link-hover hover:underline"
          onMouseEnter={() => scheduleMethodPrefetch(row.methodSlug)}
          onMouseLeave={clearPrefetchTimer}
          onFocus={() => scheduleMethodPrefetch(row.methodSlug)}
          onBlur={clearPrefetchTimer}
          onMouseDown={() => prefetchMethodDetail(row.methodSlug)}
          onTouchStart={() => prefetchMethodDetail(row.methodSlug)}
        >
          {row.variantLabel}
        </Link>
      </div>
    </TableCell>
  );

  const renderMembersCell = (row: Row, className?: string) => (
    <TableCell className={className}>
      <VariantMembershipBadge members={row.members} compact />
    </TableCell>
  );

  const renderProfitCell = (row: Row, className?: string) => (
    <TableCell className={className}>
      <div className="flex flex-col">
        <span className="font-bold">
          <AnimatedProfitValue value={row.highProfit} />
        </span>
        <span>
          <AnimatedProfitValue value={row.lowProfit} />
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

  const renderTagsCell = (row: Row, className?: string) => (
    <TableCell className={cn("min-w-0", className)}>
      <VariantTags tags={row.tags} mode="table" emptyLabel="-" />
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
                }) => {
                  const iconUrl = getUrlByType(skill);
                  return (
                    <Badge size="lg" key={skill} variant="secondary">
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt={`${skill.toLowerCase()}_icon`}
                        />
                      ) : null}
                      {formatNumber(experience)}
                    </Badge>
                  );
                },
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
      <div className="inline-flex items-center gap-2 text-sm font-medium tabular-nums text-foreground">
        <Heart className="h-4 w-4 text-muted-foreground" />
        <span>{formatNumber(row.likes ?? 0)}</span>
      </div>
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

  const getColumnClassName = (columnId: MethodsTableColumnId) => {
    const presentation = columnPresentation[columnId];
    return cn(
      COLUMN_WIDTH_CLASSNAMES[presentation.width],
      COLUMN_VISIBILITY_CLASSNAMES[presentation.visibility],
    );
  };

  type ColumnConfig = {
    id: MethodsTableColumnId;
    headerClassName?: string;
    cellClassName?: string;
    renderHeader: () => ReactNode;
    renderCell: (row: Row) => ReactNode;
    renderSkeleton: () => ReactNode;
  };

  const allColumns: ColumnConfig[] = isSkillTable
    ? [
        {
          id: "requirements",
          headerClassName: getColumnClassName("requirements"),
          cellClassName: getColumnClassName("requirements"),
          renderHeader: () => "Requirements",
          renderCell: (row) =>
            renderRequirementsCell(row, getColumnClassName("requirements")),
          renderSkeleton: () => renderSkeletonBadges(2),
        },
        {
          id: "methodName",
          headerClassName: getColumnClassName("methodName"),
          cellClassName: getColumnClassName("methodName"),
          renderHeader: () => "Method Name",
          renderCell: (row) =>
            renderMethodCell(row, getColumnClassName("methodName")),
          renderSkeleton: () => (
            <Skeleton className="h-4" style={{ width: "78%" }} />
          ),
        },
        {
          id: "variant",
          headerClassName: getColumnClassName("variant"),
          cellClassName: getColumnClassName("variant"),
          renderHeader: () => "Variant",
          renderCell: (row) =>
            renderVariantCell(row, getColumnClassName("variant")),
          renderSkeleton: () => (
            <Skeleton className="h-4" style={{ width: "66%" }} />
          ),
        },
        {
          id: "members",
          headerClassName: getColumnClassName("members"),
          cellClassName: getColumnClassName("members"),
          renderHeader: () => "Members",
          renderCell: (row) =>
            renderMembersCell(row, getColumnClassName("members")),
          renderSkeleton: () => <Skeleton className="h-6 w-16 rounded-full" />,
        },
        {
          id: "gpPerHr",
          headerClassName: getColumnClassName("gpPerHr"),
          cellClassName: getColumnClassName("gpPerHr"),
          renderHeader: () => renderSortHeader("Gp/Hr", "highProfit"),
          renderCell: (row) =>
            renderProfitCell(row, getColumnClassName("gpPerHr")),
          renderSkeleton: () => renderSkeletonMetric(),
        },
        {
          id: "tags",
          headerClassName: getColumnClassName("tags"),
          cellClassName: getColumnClassName("tags"),
          renderHeader: () => "Tags",
          renderCell: (row) => renderTagsCell(row, getColumnClassName("tags")),
          renderSkeleton: () => renderSkeletonBadges(2),
        },
        {
          id: "gpPerXp",
          headerClassName: getColumnClassName("gpPerXp"),
          cellClassName: getColumnClassName("gpPerXp"),
          renderHeader: () => renderSortHeader("Gp/XP", "gpPerXpHigh"),
          renderCell: (row) =>
            renderGpPerXpCell(row, getColumnClassName("gpPerXp")),
          renderSkeleton: () => renderSkeletonMetric(),
        },
        {
          id: "liquidityScore",
          headerClassName: getColumnClassName("liquidityScore"),
          cellClassName: getColumnClassName("liquidityScore"),
          renderHeader: () => "Market impact",
          renderCell: (row) =>
            renderLiquidityCell(row, getColumnClassName("liquidityScore")),
          renderSkeleton: () => renderSkeletonMetric(),
        },
        {
          id: "xpPerHr",
          headerClassName: getColumnClassName("xpPerHr"),
          cellClassName: getColumnClassName("xpPerHr"),
          renderHeader: () => renderSortHeader("XP/Hr", "xpHour"),
          renderCell: (row) => renderXpCell(row, getColumnClassName("xpPerHr")),
          renderSkeleton: () => renderSkeletonBadges(2),
        },
        {
          id: "clickIntensity",
          headerClassName: getColumnClassName("clickIntensity"),
          cellClassName: getColumnClassName("clickIntensity"),
          renderHeader: () =>
            renderSortHeader("Click Intensity", "clickIntensity"),
          renderCell: (row) =>
            renderClickIntensityCell(row, getColumnClassName("clickIntensity")),
          renderSkeleton: () => (
            <Skeleton className="h-4" style={{ width: "58%" }} />
          ),
        },
        {
          id: "afkiness",
          headerClassName: getColumnClassName("afkiness"),
          cellClassName: getColumnClassName("afkiness"),
          renderHeader: () => renderSortHeader("% AFK", "afkiness"),
          renderCell: (row) =>
            renderAfkinessCell(row, getColumnClassName("afkiness")),
          renderSkeleton: () => (
            <Skeleton className="h-4" style={{ width: "58%" }} />
          ),
        },
        {
          id: "likes",
          headerClassName: getColumnClassName("likes"),
          cellClassName: getColumnClassName("likes"),
          renderHeader: () => renderSortHeader("Likes", "likes"),
          renderCell: (row) =>
            renderLikesCell(row, getColumnClassName("likes")),
          renderSkeleton: () => <Skeleton className="h-8 w-8 rounded-full" />,
        },
      ]
    : [
        {
          id: "methodName",
          headerClassName: getColumnClassName("methodName"),
          cellClassName: getColumnClassName("methodName"),
          renderHeader: () => "Method Name",
          renderCell: (row) =>
            renderMethodCell(row, getColumnClassName("methodName")),
          renderSkeleton: () => (
            <Skeleton className="h-4" style={{ width: "72%" }} />
          ),
        },
        {
          id: "members",
          headerClassName: getColumnClassName("members"),
          cellClassName: getColumnClassName("members"),
          renderHeader: () => "Members",
          renderCell: (row) =>
            renderMembersCell(row, getColumnClassName("members")),
          renderSkeleton: () => <Skeleton className="h-6 w-16 rounded-full" />,
        },
        {
          id: "gpPerHr",
          headerClassName: getColumnClassName("gpPerHr"),
          cellClassName: getColumnClassName("gpPerHr"),
          renderHeader: () => renderSortHeader("Gp/Hr", "highProfit"),
          renderCell: (row) =>
            renderProfitCell(row, getColumnClassName("gpPerHr")),
          renderSkeleton: () => renderSkeletonMetric(),
        },
        {
          id: "tags",
          headerClassName: getColumnClassName("tags"),
          cellClassName: getColumnClassName("tags"),
          renderHeader: () => "Tags",
          renderCell: (row) => renderTagsCell(row, getColumnClassName("tags")),
          renderSkeleton: () => renderSkeletonBadges(2),
        },
        {
          id: "liquidityScore",
          headerClassName: getColumnClassName("liquidityScore"),
          cellClassName: getColumnClassName("liquidityScore"),
          renderHeader: () => "Market impact",
          renderCell: (row) =>
            renderLiquidityCell(row, getColumnClassName("liquidityScore")),
          renderSkeleton: () => renderSkeletonMetric(),
        },
        {
          id: "xpPerHr",
          headerClassName: getColumnClassName("xpPerHr"),
          cellClassName: getColumnClassName("xpPerHr"),
          renderHeader: () => renderSortHeader("XP/Hr", "xpHour"),
          renderCell: (row) => renderXpCell(row, getColumnClassName("xpPerHr")),
          renderSkeleton: () => renderSkeletonBadges(2),
        },
        {
          id: "clickIntensity",
          headerClassName: getColumnClassName("clickIntensity"),
          cellClassName: getColumnClassName("clickIntensity"),
          renderHeader: () =>
            renderSortHeader("Click Intensity", "clickIntensity"),
          renderCell: (row) =>
            renderClickIntensityCell(row, getColumnClassName("clickIntensity")),
          renderSkeleton: () => (
            <Skeleton className="h-4" style={{ width: "60%" }} />
          ),
        },
        {
          id: "afkiness",
          headerClassName: getColumnClassName("afkiness"),
          cellClassName: getColumnClassName("afkiness"),
          renderHeader: () => renderSortHeader("% AFK", "afkiness"),
          renderCell: (row) =>
            renderAfkinessCell(row, getColumnClassName("afkiness")),
          renderSkeleton: () => (
            <Skeleton className="h-4" style={{ width: "60%" }} />
          ),
        },
        {
          id: "requirements",
          headerClassName: getColumnClassName("requirements"),
          cellClassName: getColumnClassName("requirements"),
          renderHeader: () => "Requirements",
          renderCell: (row) =>
            renderRequirementsCell(row, getColumnClassName("requirements")),
          renderSkeleton: () => renderSkeletonBadges(2),
        },
        {
          id: "likes",
          headerClassName: getColumnClassName("likes"),
          cellClassName: getColumnClassName("likes"),
          renderHeader: () => renderSortHeader("Likes", "likes"),
          renderCell: (row) =>
            renderLikesCell(row, getColumnClassName("likes")),
          renderSkeleton: () => <Skeleton className="h-8 w-8 rounded-full" />,
        },
      ];

  const defaultOrderedColumnIds = getDefaultMethodsTableColumnIds(isSkillTable);
  const effectiveOrderedColumnIds =
    orderedColumnIds && orderedColumnIds.length > 0
      ? orderedColumnIds
      : defaultOrderedColumnIds;
  const defaultVisibleColumnIds =
    getDefaultMethodsTableFieldsState(isSkillTable).visibleColumnIds;
  const visibleColumnSet = new Set(visibleColumnIds ?? defaultVisibleColumnIds);
  const columnsById = new Map(allColumns.map((column) => [column.id, column]));
  const activeColumns = effectiveOrderedColumnIds
    .filter((columnId) => visibleColumnSet.has(columnId))
    .map((columnId) => columnsById.get(columnId))
    .filter((column): column is ColumnConfig => !!column);
  const activeColumnSignature = activeColumns
    .map((column) => column.id)
    .join("|");
  const tableColumnCount = activeColumns.length;

  useLayoutEffect(() => {
    const root = tableAnimationRootRef.current;
    if (!root || prefersReducedMotion()) {
      previousColumnSignatureRef.current = activeColumnSignature;
      return;
    }

    const tableContainer = root.querySelector<HTMLElement>(
      "[data-slot='table-container']",
    );
    if (
      !tableContainer ||
      typeof HTMLElement.prototype.animate !== "function"
    ) {
      previousColumnSignatureRef.current = activeColumnSignature;
      return;
    }

    const currentElements = new Map<string, HTMLElement>();
    const currentRects = new Map<string, CellRectSnapshot>();
    const containerRect = tableContainer.getBoundingClientRect();
    const nodes = root.querySelectorAll<HTMLElement>(
      "[data-column-animation-key]",
    );

    for (const node of nodes) {
      const animationKey = node.dataset.columnAnimationKey;
      if (!animationKey) {
        continue;
      }

      currentElements.set(animationKey, node);
      const rect = snapshotCellRect(node, containerRect);
      if (rect) {
        currentRects.set(animationKey, rect);
      }
    }

    const previousRects = previousAnimatedCellRectsRef.current;
    const previousElements = previousAnimatedCellsRef.current;
    const previousColumnSignature = previousColumnSignatureRef.current;

    if (
      previousColumnSignature !== null &&
      previousColumnSignature !== activeColumnSignature
    ) {
      for (const [animationKey, currentElement] of currentElements) {
        const previousRect = previousRects.get(animationKey);
        const currentRect = currentRects.get(animationKey);

        if (previousRect && currentRect) {
          animateCellReflow(currentElement, previousRect, currentRect);
          continue;
        }

        if (currentRect) {
          animateCellEnter(currentElement);
        }
      }

      for (const [animationKey, previousRect] of previousRects) {
        if (currentRects.has(animationKey)) {
          continue;
        }

        const previousElement = previousElements.get(animationKey);
        if (!previousElement) {
          continue;
        }

        const ghost = createExitGhost(previousElement, previousRect);
        tableContainer.appendChild(ghost);
        const animation = animateCellExit(ghost);
        animation.addEventListener("finish", () => {
          ghost.remove();
        });
      }
    }

    previousAnimatedCellsRef.current = currentElements;
    previousAnimatedCellRectsRef.current = currentRects;
    previousColumnSignatureRef.current = activeColumnSignature;
  }, [activeColumnSignature]);

  const attachColumnAnimationProps = (
    node: ReactNode,
    rowKey: string,
    columnId: MethodsTableColumnId,
  ) => {
    if (!isValidElement(node)) {
      return node;
    }

    return cloneElement(node as React.ReactElement<Record<string, unknown>>, {
      "data-column-animation-key": buildColumnAnimationKey(rowKey, columnId),
      "data-column-id": columnId,
    });
  };

  return (
    <div className="space-y-4">
      <div ref={tableAnimationRootRef}>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              {activeColumns.map((column) => (
                <TableHead
                  key={column.id}
                  data-column-animation-key={buildColumnAnimationKey(
                    "header",
                    column.id,
                  )}
                  data-column-id={column.id}
                  className={column.headerClassName}
                >
                  {column.renderHeader()}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isTableLoading ? (
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                <TableRow key={`fetching-skeleton-row-${index}`}>
                  {activeColumns.map((column) => (
                    <TableCell
                      key={`fetching-skeleton-cell-${index}-${column.id}`}
                      data-column-animation-key={buildColumnAnimationKey(
                        `loading-${index}`,
                        column.id,
                      )}
                      data-column-id={column.id}
                      className={column.cellClassName}
                    >
                      {column.renderSkeleton()}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error && !data ? (
              <TableRow>
                <TableCell
                  colSpan={tableColumnCount}
                  className="text-destructive"
                >
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
                  {activeColumns.map((column) => (
                    <Fragment key={`${row.id}-${column.id}`}>
                      {attachColumnAnimationProps(
                        column.renderCell(row),
                        row.id,
                        column.id,
                      )}
                    </Fragment>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
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
