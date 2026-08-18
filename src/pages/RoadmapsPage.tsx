import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertCircleIcon, CircleHelp } from "lucide-react";
import { IoItemsGrid } from "@/components/IoItemsDisplay";
import {
  GuidanceColumn,
  hasGuidanceContent,
} from "@/components/RequirementsDisplay";
import { MethodTagsFilterCombobox } from "@/features/methods/MethodTagsFilterCombobox";
import {
  EDITOR_NESTED_SURFACE_CLASS,
  EmptySelectionState,
  SectionHeader,
} from "@/components/method-editor/MethodEditorPrimitives";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UsernameLookupErrorMessage } from "@/components/UsernameLookupErrorMessage";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUsername } from "@/contexts/UsernameContext";
import { useSeo } from "@/hooks/useSeo";
import {
  ApiRequestError,
  fetchMethodTags,
  fetchItems,
  fetchSkillRoadmap,
  type MethodVariantTagKey,
  type Item,
  type RoadmapRange,
  type RoadmapStrategy,
  type SkillRoadmap,
  type SkillRoadmapResponse,
  type Variant,
} from "@/lib/api";
import { QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";
import { getItemsQueryKey } from "@/lib/queryKeys";
import { OSRS_SKILLS, type OsrsSkill } from "@/lib/skills";
import { cn, formatNumber, getUrlByType } from "@/lib/utils";
import {
  MAX_SKILL_LEVEL,
  clampInteger,
  normalizeBoundedText,
  USERNAME_MAX_LENGTH,
} from "@/lib/validation";

const DEFAULT_SKILL: OsrsSkill = "herblore";
const DEFAULT_TARGET_LEVEL = 99;
const PAGE_CARD_CLASS =
  "rounded-xl border border-border/70 bg-surface-panel shadow-sm";
const TIMELINE_LEFT_SPACING_CLASS = "pl-10";
const ROADMAP_SEGMENT_CLASS_NAMES = [
  "bg-brand/90",
  "bg-brand/80",
  "bg-brand/70",
  "bg-brand/60",
  "bg-brand/50",
  "bg-brand/40",
] as const;
const ROADMAP_INTRO_LINE_DURATION_MS = 900;
const ROADMAP_INTRO_STEP_DURATION_MS = 420;
const ROADMAP_INTRO_STEP_STAGGER_MS = 200;
const DEFAULT_ROADMAP_IGNORED_TAGS: MethodVariantTagKey[] = [
  "ge_limits",
  "not_viable",
];

const STRATEGY_OPTIONS: Array<{
  value: RoadmapStrategy;
  label: string;
  description: string;
}> = [
  {
    value: "profitable",
    label: "Profitable",
    description: "Prioritize the most profitable path.",
  },
  {
    value: "most_afk",
    label: "Most AFK",
    description: "Favor the most idle-friendly steps.",
  },
  {
    value: "fastest",
    label: "Fastest",
    description: "Reach target level as quickly as possible.",
  },
];

function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) {
    return "0h";
  }

  if (hours < 1) {
    return `${Math.max(1, Math.round(hours * 60))}m`;
  }

  if (hours < 24) {
    return `${hours.toFixed(1).replace(/\.0$/, "")}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours - days * 24;
  if (remainingHours < 0.1) {
    return `${days}d`;
  }

  return `${days}d ${remainingHours.toFixed(1).replace(/\.0$/, "")}h`;
}

function formatTotalHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) {
    return "0h";
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(hours))}h`;
}

function formatDaysLabel(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) {
    return "0 days";
  }

  const days = hours / 24;
  const roundedDays = days.toFixed(1).replace(/\.0$/, "");
  return `${roundedDays} ${roundedDays === "1" ? "day" : "days"}`;
}

function formatGp(value: number): string {
  return `${formatNumber(value)}`;
}

function getProfitRangeLabel(low: number, high: number): {
  primary: {
    value: number;
    label: string;
  };
  secondary: {
    value: number;
    label: string;
  } | null;
} {
  const roundedLow = Math.round(low);
  const roundedHigh = Math.round(high);

  if (roundedLow === roundedHigh) {
    return {
      primary: {
        value: roundedHigh,
        label: formatGp(high),
      },
      secondary: null,
    };
  }

  return {
    primary: {
      value: roundedHigh,
      label: formatGp(high),
    },
    secondary: {
      value: roundedLow,
      label: formatGp(low),
    },
  };
}

function formatPercent(value: number): string {
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
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

function getProfitTextClassName(value: number): string {
  if (value > 0) {
    return "text-success";
  }

  if (value < 0) {
    return "text-danger";
  }

  return "text-foreground";
}

function getRoadmapMethodLink(range: RoadmapRange): string {
  const variantPath = range.variant.slug ? `/${range.variant.slug}` : "";
  return `/moneyMakingMethod/${range.method.slug}${variantPath}`;
}

function getRoadmapRangeKey(range: RoadmapRange): string {
  return `${range.variant.id}-${range.levelStart}-${range.levelEnd}`;
}

function getRoadmapSecondaryVariantLabel(
  methodName: string,
  variantLabel: string,
): string | null {
  const normalizedMethodName = methodName.trim().toLowerCase();
  const trimmedVariantLabel = variantLabel.trim();
  const normalizedVariantLabel = trimmedVariantLabel.toLowerCase();

  if (!trimmedVariantLabel || normalizedVariantLabel === normalizedMethodName) {
    return null;
  }

  return trimmedVariantLabel;
}

function getRoadmapErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unable to calculate the roadmap right now.";
}

function getXpLeftLabel(roadmap: SkillRoadmap): string {
  return `${formatNumber(
    roadmap.targetExperience - roadmap.currentExperience,
  )} xp needed to reach level ${roadmap.targetLevel}.`;
}

function RoadmapMetricsPanel({
  roadmap,
  computedAt,
  strategyDescription,
}: {
  roadmap: SkillRoadmap;
  computedAt: string | null;
  strategyDescription?: string;
}) {
  const rowClassName =
    "flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3";
  const labelClassName = "text-sm text-muted-foreground";

  return (
    <aside className="self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
      <Card className="@container/card gap-0 overflow-hidden rounded-xl border-border/70">
        <CardHeader className="border-b border-border/60 pb-6">
          <SectionHeader
            title="Summary"
            description={strategyDescription}
            level="h2"
          />
        </CardHeader>
        <CardContent className="pt-6">
          <div className="divide-y divide-border/50">
            <div className={rowClassName}>
              <span className={labelClassName}>Time spent</span>
              <div className="text-right">
                <p className="text-2xl font-semibold tabular-nums text-foreground">
                  {formatTotalHours(roadmap.totalHours)}
                </p>
                {roadmap.totalHours >= 25 ? (
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    {formatDaysLabel(roadmap.totalHours)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className={rowClassName}>
              <div className="flex items-center gap-2">
                <span className={labelClassName}>Total profit</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Total profit explanation"
                      className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <CircleHelp className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    sideOffset={6}
                    className="max-w-[280px] text-left"
                  >
                    Shows the estimated total profit range for the full roadmap.
                    The large value is the optimistic outcome, and the smaller
                    value below is the conservative outcome.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold tabular-nums text-foreground">
                  {formatGp(roadmap.totalProfit.high)}
                </p>
                <p className="mt-1 text-xs font-medium tabular-nums text-muted-foreground">
                  {formatGp(roadmap.totalProfit.low)}
                </p>
              </div>
            </div>

            <div className={rowClassName}>
              <span className={labelClassName}>Average % AFK</span>
              <span className="text-right text-xl font-semibold tabular-nums text-foreground">
                {formatPercent(roadmap.averageAfkPercent)}
              </span>
            </div>

            <div className={rowClassName}>
              <span className={labelClassName}>XP left</span>
              <span className="text-right text-sm font-medium tabular-nums text-foreground">
                {formatNumber(
                  roadmap.targetExperience - roadmap.currentExperience,
                )}
              </span>
            </div>

            <div className={rowClassName}>
              <span className={labelClassName}>Journey</span>
              <span className="text-right text-sm font-medium text-foreground">
                Level {roadmap.currentLevel} to {roadmap.targetLevel}
              </span>
            </div>

            <div className={rowClassName}>
              <span className={labelClassName}>Steps</span>
              <span className="text-right text-sm font-medium text-foreground">
                {roadmap.ranges.length}
              </span>
            </div>

            {computedAt ? (
              <div className={rowClassName}>
                <span className={labelClassName}>Updated</span>
                <span className="text-right text-sm font-medium text-foreground">
                  {computedAt}
                </span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

function RoadmapMetricsPanelSkeleton() {
  return (
    <div className="self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
      <Card className="@container/card gap-0 overflow-hidden rounded-xl border-border/70">
        <CardHeader className="border-b border-border/60 pb-6">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-2 h-4 w-40" />
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RoadmapJourneyBar({
  ranges,
  variantIcons,
  onSelectStep,
}: {
  ranges: RoadmapRange[];
  variantIcons: Record<number, Item>;
  onSelectStep: (stepKey: string) => void;
}) {
  const totalHours = ranges.reduce(
    (sum, range) => sum + Math.max(range.hours, 0),
    0,
  );

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm font-medium text-muted-foreground">
        Progress by step
      </p>
      <div className="rounded-xl border border-border/70 bg-background/40 p-2">
        <div className="overflow-x-auto">
          <div className="flex h-6 min-w-full gap-0.5 rounded-lg">
            {ranges.map((range, index) => {
              const stepKey = getRoadmapRangeKey(range);
              const variantLabel = range.variant.label?.trim() || "Default variant";
              const secondaryVariantLabel = getRoadmapSecondaryVariantLabel(
                range.method.name,
                variantLabel,
              );
              const iconUrl = range.variant.icon_id
                ? variantIcons[range.variant.icon_id]?.iconUrl
                : undefined;
              const flexGrow = totalHours > 0 ? Math.max(range.hours, 0.01) : 1;

              return (
                <Tooltip key={stepKey}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onSelectStep(stepKey)}
                      aria-label={`${range.method.name} ${variantLabel} ${formatHours(range.hours)}`}
                      className={`relative flex min-w-[8px] items-center justify-center rounded-md transition-[filter,transform] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${ROADMAP_SEGMENT_CLASS_NAMES[index % ROADMAP_SEGMENT_CLASS_NAMES.length]}`}
                      style={{ flex: `${flexGrow} 1 0%` }}
                    >
                      <span className="sr-only">{range.method.name}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={8} className="w-[240px] text-left">
                    <div className="flex items-start gap-3">
                      {iconUrl ? (
                        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                          <img
                            src={iconUrl}
                            alt={`${variantLabel} icon`}
                            className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {range.method.name}
                        </p>
                        {secondaryVariantLabel ? (
                          <p className="truncate text-xs font-medium text-muted-foreground">
                            {secondaryVariantLabel}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs font-medium text-muted-foreground">
                          Time spent
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-foreground">
                          {formatHours(range.hours)}
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoadmapJourneyBarSkeleton() {
  return (
    <div className="mt-6">
      <Skeleton className="mb-3 h-4 w-28" />
      <div className="rounded-xl border border-border/70 bg-background/40 p-2">
        <Skeleton className="h-6 w-full rounded-lg" />
      </div>
    </div>
  );
}

function getRoadmapItemsTotal(
  items: Array<{ id: number; quantity: number }>,
  itemsMap: Record<number, Item>,
): number {
  return items.reduce((total, item) => {
    const lowPrice = itemsMap[item.id]?.lowPrice ?? 0;
    return total + lowPrice * item.quantity;
  }, 0);
}

type RoadmapRequirement = Variant["requirements"];
type RoadmapItemRequirement = NonNullable<RoadmapRequirement["items"]>[number];
type RoadmapLevelRequirement = NonNullable<RoadmapRequirement["levels"]>[number];
type RoadmapQuestRequirement = NonNullable<RoadmapRequirement["quests"]>[number];
type RoadmapDiaryRequirement =
  NonNullable<RoadmapRequirement["achievement_diaries"]>[number];

function getDiaryTierRank(tier: string | number | undefined): number {
  if (typeof tier === "number" && Number.isFinite(tier)) {
    return tier;
  }

  if (typeof tier !== "string") {
    return 0;
  }

  const normalizedTier = tier.trim().toLowerCase();
  if (!normalizedTier) {
    return 0;
  }

  const numericTier = Number(normalizedTier);
  if (Number.isFinite(numericTier)) {
    return numericTier;
  }

  switch (normalizedTier) {
    case "easy":
      return 1;
    case "medium":
      return 2;
    case "hard":
      return 3;
    case "elite":
      return 4;
    default:
      return 0;
  }
}

function getAggregatedRoadmapRequirements(
  roadmap: SkillRoadmap | undefined,
): RoadmapRequirement | undefined {
  if (!roadmap) {
    return undefined;
  }

  const itemRequirements = new Map<string, RoadmapItemRequirement>();
  const levelRequirements = new Map<string, RoadmapLevelRequirement>();
  const questRequirements = new Map<string, RoadmapQuestRequirement>();
  const diaryRequirements = new Map<string, RoadmapDiaryRequirement>();

  for (const range of roadmap.ranges) {
    const requirement = range.variant.requirements;
    if (!requirement) {
      continue;
    }

    for (const item of requirement.items ?? []) {
      const key = String(item.id);
      const current = itemRequirements.get(key);
      if (
        !current ||
        item.quantity > current.quantity ||
        (item.quantity === current.quantity && !current.reason && item.reason)
      ) {
        itemRequirements.set(key, item);
      }
    }

    for (const level of requirement.levels ?? []) {
      const key = level.skill.trim().toLowerCase();
      const current = levelRequirements.get(key);
      if (
        !current ||
        level.level > current.level ||
        (level.level === current.level && !current.reason && level.reason)
      ) {
        levelRequirements.set(key, level);
      }
    }

    for (const quest of requirement.quests ?? []) {
      const key = quest.name.trim().toLowerCase();
      const current = questRequirements.get(key);
      if (
        !current ||
        quest.stage > current.stage ||
        (quest.stage === current.stage && !current.reason && quest.reason)
      ) {
        questRequirements.set(key, quest);
      }
    }

    for (const diary of requirement.achievement_diaries ?? []) {
      const normalizedTier = diary.tier ?? diary.stage;
      const key = diary.name.trim().toLowerCase();
      const current = diaryRequirements.get(key);
      const currentTier = current?.tier ?? current?.stage;
      if (
        !current ||
        getDiaryTierRank(normalizedTier) > getDiaryTierRank(currentTier) ||
        (getDiaryTierRank(normalizedTier) === getDiaryTierRank(currentTier) &&
          !current.reason &&
          diary.reason)
      ) {
        diaryRequirements.set(key, {
          ...diary,
          ...(normalizedTier !== undefined ? { tier: normalizedTier } : {}),
        });
      }
    }
  }

  const aggregatedRequirements: RoadmapRequirement = {};
  if (itemRequirements.size > 0) {
    aggregatedRequirements.items = Array.from(itemRequirements.values());
  }
  if (levelRequirements.size > 0) {
    aggregatedRequirements.levels = Array.from(levelRequirements.values());
  }
  if (questRequirements.size > 0) {
    aggregatedRequirements.quests = Array.from(questRequirements.values());
  }
  if (diaryRequirements.size > 0) {
    aggregatedRequirements.achievement_diaries = Array.from(
      diaryRequirements.values(),
    );
  }

  return hasGuidanceContent(
    aggregatedRequirements,
    aggregatedRequirements.items ?? [],
  )
    ? aggregatedRequirements
    : undefined;
}

function RoadmapMaterialsSection({
  roadmap,
  itemsMap,
  isItemsLoading = false,
  warnings,
}: {
  roadmap: SkillRoadmap;
  itemsMap: Record<number, Item>;
  isItemsLoading?: boolean;
  warnings: string[];
}) {
  const [showAdvancedItemDetails, setShowAdvancedItemDetails] = useState(false);
  const totalInputs = roadmap.totalInputs ?? [];
  const totalOutputs = roadmap.totalOutputs ?? [];
  const hasMaterialTotals =
    Array.isArray(roadmap.totalInputs) || Array.isArray(roadmap.totalOutputs);
  const toggleAdvancedItemDetails = () =>
    setShowAdvancedItemDetails((current) => !current);
  const warningMessages =
    warnings.length > 0
      ? warnings
      : ["Roadmap material totals are unavailable for this roadmap."];

  return (
    <section className={cn(EDITOR_NESTED_SURFACE_CLASS, "mt-6 space-y-4 p-6")}>
      <SectionHeader
        title="Inputs & outputs"
        description="Review the total materials required and expected loot for the full roadmap."
        level="h3"
      />

      {hasMaterialTotals ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <IoItemsGrid
            title="Inputs"
            total={
              isItemsLoading ? undefined : getRoadmapItemsTotal(totalInputs, itemsMap)
            }
            items={totalInputs}
            itemsMap={itemsMap}
            weightPriceMode="input"
            isLoading={isItemsLoading}
            showAdvancedDetails={showAdvancedItemDetails}
            onToggleAdvancedDetails={toggleAdvancedItemDetails}
          />
          <IoItemsGrid
            title="Outputs"
            total={
              isItemsLoading
                ? undefined
                : getRoadmapItemsTotal(totalOutputs, itemsMap)
            }
            items={totalOutputs}
            itemsMap={itemsMap}
            weightPriceMode="output"
            isLoading={isItemsLoading}
            showAdvancedDetails={showAdvancedItemDetails}
            onToggleAdvancedDetails={toggleAdvancedItemDetails}
          />
        </div>
      ) : (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>Material totals unavailable</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-5">
              {warningMessages.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}

function RoadmapRequirementsSection({
  requirements,
  itemsMap,
  isItemsLoading = false,
}: {
  requirements: RoadmapRequirement;
  itemsMap: Record<number, Item>;
  isItemsLoading?: boolean;
}) {
  const [showAdvancedItemDetails, setShowAdvancedItemDetails] = useState(false);

  return (
    <div className="mt-6">
      <GuidanceColumn
        title="Requirements"
        requirement={requirements}
        items={requirements.items ?? []}
        itemsMap={itemsMap}
        isItemsLoading={isItemsLoading}
        tooltipKeyPrefix="roadmap-requirements"
        showAdvancedDetails={showAdvancedItemDetails}
        onToggleAdvancedDetails={() =>
          setShowAdvancedItemDetails((current) => !current)
        }
      />
    </div>
  );
}

function RoadmapTimelineItem({
  range,
  iconUrl,
  isLast,
  stepRef,
  isHighlighted,
  introIndex,
  isIntroVisible,
}: {
  range: RoadmapRange;
  iconUrl?: string;
  isLast: boolean;
  stepRef?: (node: HTMLElement | null) => void;
  isHighlighted?: boolean;
  introIndex: number;
  isIntroVisible: boolean;
}) {
  const methodLink = getRoadmapMethodLink(range);
  const variantLabel = range.variant.label?.trim() || "Default variant";
  const secondaryVariantLabel = getRoadmapSecondaryVariantLabel(
    range.method.name,
    variantLabel,
  );
  const profitLabel = getProfitRangeLabel(range.profit.low, range.profit.high);

  return (
    <article
      ref={stepRef}
      className={cn(
        "relative scroll-mt-28 rounded-lg transition-[background-color,box-shadow,opacity] ease-out motion-reduce:transition-none",
        isHighlighted
          ? "bg-surface-highlight/60 shadow-sm ring-1 ring-surface-highlight-border"
          : "",
        isIntroVisible ? "opacity-100" : "opacity-0",
        isLast ? "" : "pb-10",
      )}
      style={{
        transitionDuration: `${ROADMAP_INTRO_STEP_DURATION_MS}ms`,
        transitionDelay: `${introIndex * ROADMAP_INTRO_STEP_STAGGER_MS}ms`,
      }}
    >
      <span className="absolute top-2 left-0 z-10 size-3 rounded-full border-2 border-brand bg-surface-panel" />
      {!isLast ? (
        <span
          className={cn(
            "absolute top-5 left-[5px] bottom-0 w-px origin-top bg-border/80 transition-transform ease-out motion-reduce:transition-none motion-reduce:transform-none",
            isIntroVisible ? "scale-y-100" : "scale-y-0",
          )}
          style={{
            transitionDuration: `${ROADMAP_INTRO_LINE_DURATION_MS}ms`,
            transitionDelay: `${introIndex * ROADMAP_INTRO_STEP_STAGGER_MS}ms`,
          }}
        />
      ) : null}

      <div className={TIMELINE_LEFT_SPACING_CLASS}>
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-lg font-semibold tracking-tight text-foreground">
          From {range.levelStart} - {range.levelEnd}
          <span className="text-sm font-medium text-muted-foreground">
            ({formatNumber(range.experienceNeeded)} xp)
          </span>
        </p>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="min-w-0 flex items-start gap-2">
            {iconUrl ? (
              <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                <img
                  src={iconUrl}
                  alt={`${variantLabel} icon`}
                  className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                />
              </div>
            ) : null}
            <div className="min-w-0 space-y-1">
              <Link
                to={methodLink}
                className="block min-w-0 truncate text-link transition-colors hover:text-link-hover hover:underline"
              >
                {range.method.name}
              </Link>
              {secondaryVariantLabel ? (
                <p className="truncate text-xs font-medium leading-4 text-muted-foreground">
                  {secondaryVariantLabel}
                </p>
              ) : null}
            </div>
          </div>

          <dl className="flex flex-wrap gap-x-6 gap-y-3 sm:ml-auto sm:flex-none sm:flex-nowrap">
            <div className="w-[112px] space-y-1">
              <dt className="text-sm text-muted-foreground">Profit</dt>
              <div className="space-y-1">
                <dd
                  className={`text-sm font-semibold tabular-nums ${getProfitTextClassName(
                    profitLabel.primary.value,
                  )}`}
                >
                  {profitLabel.primary.label}
                </dd>
                {profitLabel.secondary ? (
                  <dd
                    className={`text-xs font-medium tabular-nums ${getProfitTextClassName(
                      profitLabel.secondary.value,
                    )}`}
                  >
                    {profitLabel.secondary.label}
                  </dd>
                ) : null}
              </div>
            </div>

            <div className="w-[112px] space-y-1">
              <dt className="text-sm text-muted-foreground">Time spent</dt>
              <dd className="text-sm font-semibold tabular-nums text-foreground">
                {formatHours(range.hours)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}

function RoadmapTimelineSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="relative">
          <span className="absolute top-2 left-0 z-10 size-3 rounded-full border-2 border-border bg-surface-panel" />
          {index < 3 ? (
            <span className="absolute top-5 left-[5px] bottom-[-2rem] w-px bg-border/80" />
          ) : null}
          <div className={TIMELINE_LEFT_SPACING_CLASS}>
            <Skeleton className="h-6 w-64" />
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
              <div className="flex items-start gap-2">
                <Skeleton className="h-[30px] w-[30px] shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-3 sm:ml-auto sm:flex-nowrap">
                {Array.from({ length: 2 }).map((_, metricIndex) => (
                  <div key={metricIndex} className="w-[112px] space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RoadmapsPage() {
  useSeo({
    title: "Roadmaps | RSMethods",
    description:
      "Generate a 1-99 training roadmap from your OSRS username, skill choice, and roadmap strategy.",
    path: "/roadmaps",
    keywords: "osrs roadmap, osrs skill planner, osrs 1-99 roadmap",
  });

  const { username, setUsername } = useUsername();
  const [usernameInput, setUsernameInput] = useState(username);
  const [skill, setSkill] = useState<OsrsSkill>(DEFAULT_SKILL);
  const [targetLevelInput, setTargetLevelInput] = useState(
    String(DEFAULT_TARGET_LEVEL),
  );
  const [strategy, setStrategy] = useState<RoadmapStrategy>("profitable");
  const [showOnlyFreeToPlay, setShowOnlyFreeToPlay] = useState(false);
  const [ignoredTags, setIgnoredTags] = useState<MethodVariantTagKey[]>(
    DEFAULT_ROADMAP_IGNORED_TAGS,
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setUsernameInput(username);
  }, [username]);

  const selectedStrategy = useMemo(
    () => STRATEGY_OPTIONS.find((option) => option.value === strategy),
    [strategy],
  );

  const roadmapMutation = useMutation({
    mutationFn: fetchSkillRoadmap,
  });
  const { data: methodTagOptions = [] } = useQuery({
    queryKey: ["method-tags"],
    queryFn: fetchMethodTags,
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });

  const roadmapResponse = roadmapMutation.data as
    | SkillRoadmapResponse
    | undefined;
  const roadmap = roadmapResponse?.data.roadmap;
  const roadmapIntroKey = useMemo(
    () =>
      roadmap
        ? `${roadmapResponse?.meta.computedAt ?? "none"}:${roadmap.ranges
            .map(getRoadmapRangeKey)
            .join("|")}`
        : "",
    [roadmap, roadmapResponse?.meta.computedAt],
  );
  const aggregatedRoadmapRequirements = useMemo(
    () => getAggregatedRoadmapRequirements(roadmap),
    [roadmap],
  );
  const [isRoadmapIntroVisible, setIsRoadmapIntroVisible] = useState(false);
  const [highlightedStepKey, setHighlightedStepKey] = useState<string | null>(
    null,
  );
  const stepRefs = useRef<Record<string, HTMLElement | null>>({});
  const roadmapIntroFrameRef = useRef<number | null>(null);
  const highlightDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const highlightResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const roadmapItemIds = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...(roadmap?.ranges ?? []).map((range) => range.variant.icon_id),
            ...(roadmap?.totalInputs ?? []).map((entry) => entry.id),
            ...(roadmap?.totalOutputs ?? []).map((entry) => entry.id),
            ...(aggregatedRoadmapRequirements?.items ?? []).map(
              (entry) => entry.id,
            ),
          ].filter(
            (iconId): iconId is number =>
              typeof iconId === "number" &&
              Number.isInteger(iconId) &&
              iconId > 0,
          ),
        ),
      ).sort((a, b) => a - b),
    [aggregatedRoadmapRequirements, roadmap],
  );

  const { data: roadmapItemsMap = {}, isLoading: isRoadmapItemsLoading } =
    useQuery<Record<number, Item>>({
      queryKey: getItemsQueryKey(roadmapItemIds),
      queryFn: () => fetchItems(roadmapItemIds),
      enabled: roadmapItemIds.length > 0,
      staleTime: QUERY_STALE_TIME_MS,
    });

  const roadmapWarnings = roadmapResponse?.warnings ?? [];

  const computedAt = roadmapResponse?.meta.computedAt
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(roadmapResponse.meta.computedAt * 1000))
    : null;

  useEffect(() => {
    return () => {
      if (roadmapIntroFrameRef.current !== null) {
        window.cancelAnimationFrame(roadmapIntroFrameRef.current);
      }
      if (highlightDelayTimeoutRef.current) {
        clearTimeout(highlightDelayTimeoutRef.current);
      }
      if (highlightResetTimeoutRef.current) {
        clearTimeout(highlightResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!roadmapIntroKey) {
      setIsRoadmapIntroVisible(false);
      return;
    }

    if (prefersReducedMotion()) {
      setIsRoadmapIntroVisible(true);
      return;
    }

    setIsRoadmapIntroVisible(false);
    roadmapIntroFrameRef.current = window.requestAnimationFrame(() => {
      setIsRoadmapIntroVisible(true);
      roadmapIntroFrameRef.current = null;
    });

    return () => {
      if (roadmapIntroFrameRef.current !== null) {
        window.cancelAnimationFrame(roadmapIntroFrameRef.current);
        roadmapIntroFrameRef.current = null;
      }
    };
  }, [roadmapIntroKey]);

  const normalizedUsername = normalizeBoundedText(
    usernameInput.trim(),
    USERNAME_MAX_LENGTH,
  );
  const normalizedResponseUsername = roadmapResponse?.meta.username
    ? normalizeBoundedText(roadmapResponse.meta.username, USERNAME_MAX_LENGTH)
    : "";
  const currentSkillLevel =
    normalizedUsername &&
    normalizedResponseUsername &&
    normalizedUsername.toLowerCase() === normalizedResponseUsername.toLowerCase()
      ? roadmapResponse?.data.user.levels[
          skill.charAt(0).toUpperCase() + skill.slice(1)
        ]
      : undefined;

  const commitTargetLevelInput = () => {
    const parsedTargetLevel = Number.parseInt(targetLevelInput, 10);
    const minimumTargetLevel = Math.min(
      MAX_SKILL_LEVEL,
      Math.max(2, (currentSkillLevel ?? 1) + 1),
    );

    const normalizedTargetLevel = Number.isFinite(parsedTargetLevel)
      ? parsedTargetLevel < minimumTargetLevel
        ? minimumTargetLevel
        : clampInteger(parsedTargetLevel, 2, MAX_SKILL_LEVEL) ??
          DEFAULT_TARGET_LEVEL
      : Math.max(DEFAULT_TARGET_LEVEL, minimumTargetLevel);

    setTargetLevelInput(String(normalizedTargetLevel));

    return normalizedTargetLevel;
  };

  const handleCalculate = () => {
    const normalizedTargetLevel = commitTargetLevelInput();

    if (!normalizedUsername) {
      setFormError("Enter your OSRS username before generating a roadmap.");
      return;
    }

    setFormError(null);
    setUsername(normalizedUsername);
    roadmapMutation.mutate({
      username: normalizedUsername,
      skill,
      strategy,
      targetLevel: normalizedTargetLevel,
      showOnlyFreeToPlay,
      ignoredTags,
    });
  };

  const handleSelectRoadmapStep = (stepKey: string) => {
    const targetStep = stepRefs.current[stepKey];
    if (!targetStep) {
      return;
    }

    targetStep.scrollIntoView({ behavior: "smooth", block: "start" });

    if (highlightDelayTimeoutRef.current) {
      clearTimeout(highlightDelayTimeoutRef.current);
    }
    if (highlightResetTimeoutRef.current) {
      clearTimeout(highlightResetTimeoutRef.current);
    }

    highlightDelayTimeoutRef.current = setTimeout(() => {
      setHighlightedStepKey(stepKey);
      highlightResetTimeoutRef.current = setTimeout(() => {
        setHighlightedStepKey((currentStepKey) =>
          currentStepKey === stepKey ? null : currentStepKey,
        );
      }, 1600);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-surface-page">
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <section className={`${PAGE_CARD_CLASS} p-6`}>
          <SectionHeader
            title="Roadmaps generator"
            description="Generate personalized roadmaps to a target level."
            level="h1"
          />

          <div className="mt-6 max-w-4xl space-y-6">
            <FieldGroup className="gap-6">
              <Field>
                <FieldLabel htmlFor="roadmap-username">
                  OSRS username
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="roadmap-username"
                    placeholder="Enter username"
                    maxLength={USERNAME_MAX_LENGTH}
                    value={usernameInput}
                    onChange={(event) =>
                      setUsernameInput(
                        normalizeBoundedText(
                          event.target.value,
                          USERNAME_MAX_LENGTH,
                        ),
                      )
                    }
                  />
                </FieldContent>
              </Field>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)_160px]">
                <Field>
                  <FieldLabel>Skill</FieldLabel>
                  <FieldContent>
                    <Select
                      value={skill}
                      onValueChange={(value) => setSkill(value as OsrsSkill)}
                    >
                      <SelectTrigger className="w-full">
                        <span className="flex items-center gap-2">
                          {getUrlByType(skill) ? (
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                              <img
                                src={getUrlByType(skill) ?? ""}
                                alt={`${skill}_icon`}
                                className="max-h-full max-w-full object-contain"
                                loading="lazy"
                              />
                            </span>
                          ) : null}
                          <span>{skill}</span>
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {OSRS_SKILLS.map((entry) => (
                          <SelectItem key={entry} value={entry}>
                            <span className="flex items-center gap-2">
                              {getUrlByType(entry) ? (
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                                  <img
                                    src={getUrlByType(entry) ?? ""}
                                    alt={`${entry}_icon`}
                                    className="max-h-full max-w-full object-contain"
                                    loading="lazy"
                                  />
                                </span>
                              ) : null}
                              <span>{entry}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="roadmap-target-level">
                    Target level
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="roadmap-target-level"
                      type="text"
                      min={2}
                      max={MAX_SKILL_LEVEL}
                      step={1}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={targetLevelInput}
                      onChange={(event) =>
                        setTargetLevelInput(event.target.value)
                      }
                      onBlur={commitTargetLevelInput}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>Strategy</FieldLabel>
                  <FieldContent>
                    <Select
                      value={strategy}
                      onValueChange={(value) =>
                        setStrategy(value as RoadmapStrategy)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <span
                          className={
                            strategy
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }
                        >
                          {selectedStrategy?.label ?? "Select a strategy"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {STRATEGY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="flex w-full items-center justify-between gap-2">
                              <span>{option.label}</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    aria-label={`${option.label} info`}
                                    className="inline-flex shrink-0 text-muted-foreground"
                                  >
                                    <CircleHelp className="h-4 w-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={8}>
                                  {option.description}
                                </TooltipContent>
                              </Tooltip>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>

                <div className="rounded-lg border border-border/70 bg-background/40 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    F2P only
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {showOnlyFreeToPlay ? "Enabled" : "Disabled"}
                    </span>
                    <Switch
                      id="roadmap-f2p"
                      checked={showOnlyFreeToPlay}
                      onCheckedChange={setShowOnlyFreeToPlay}
                      aria-label="Only free-to-play methods"
                    />
                  </div>
                </div>
              </div>

              <Field>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Ignored tags</FieldLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs"
                    disabled={ignoredTags.length === 0}
                    onClick={() => setIgnoredTags([])}
                  >
                    Clear
                  </Button>
                </div>
                <FieldContent>
                  <MethodTagsFilterCombobox
                    options={methodTagOptions}
                    value={ignoredTags}
                    onValueChange={setIgnoredTags}
                  />
                </FieldContent>
                <p className="text-sm text-muted-foreground">
                  Ignore methods containing any selected tag when calculating the roadmap.
                </p>
              </Field>

              {formError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}

              {roadmapMutation.error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <UsernameLookupErrorMessage
                    message={getRoadmapErrorMessage(roadmapMutation.error)}
                    helperClassName="text-[13px] leading-[18px] text-destructive/85"
                  />
                </div>
              ) : null}

              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={handleCalculate}
                  disabled={roadmapMutation.isPending}
                  className="w-full"
                >
                  {roadmapMutation.isPending ? "Generating..." : "Generate"}
                </Button>
              </div>
            </FieldGroup>
          </div>

          <div className="mt-8 border-t border-border/60 pt-8">
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
              <div className="order-2 min-w-0 lg:order-1">
                <SectionHeader
                  title="Roadmap overview"
                  description={
                    roadmap
                      ? getXpLeftLabel(roadmap)
                      : "Generate a roadmap to see the path to a target level."
                  }
                  level="h2"
                />

                {roadmapMutation.isPending ? <RoadmapJourneyBarSkeleton /> : null}

                {!roadmapMutation.isPending && roadmap ? (
                  <RoadmapJourneyBar
                    ranges={roadmap.ranges}
                    variantIcons={roadmapItemsMap}
                    onSelectStep={handleSelectRoadmapStep}
                  />
                ) : null}

                {!roadmapMutation.isPending && roadmap ? (
                  <RoadmapMaterialsSection
                    roadmap={roadmap}
                    itemsMap={roadmapItemsMap}
                    isItemsLoading={isRoadmapItemsLoading}
                    warnings={roadmapWarnings}
                  />
                ) : null}

                {!roadmapMutation.isPending &&
                aggregatedRoadmapRequirements ? (
                  <RoadmapRequirementsSection
                    requirements={aggregatedRoadmapRequirements}
                    itemsMap={roadmapItemsMap}
                    isItemsLoading={isRoadmapItemsLoading}
                  />
                ) : null}

                <div className="mt-6">
                  {roadmapMutation.isPending ? (
                    <RoadmapTimelineSkeleton />
                  ) : null}

                  {!roadmapMutation.isPending && roadmap ? (
                    <div className="space-y-0">
                      {roadmap.ranges.map((range, index) => (
                        <RoadmapTimelineItem
                          key={getRoadmapRangeKey(range)}
                          range={range}
                          iconUrl={
                            range.variant.icon_id
                              ? roadmapItemsMap[range.variant.icon_id]?.iconUrl
                              : undefined
                          }
                          isLast={index === roadmap.ranges.length - 1}
                          stepRef={(node) => {
                            stepRefs.current[getRoadmapRangeKey(range)] = node;
                          }}
                          isHighlighted={
                            highlightedStepKey === getRoadmapRangeKey(range)
                          }
                          introIndex={index}
                          isIntroVisible={isRoadmapIntroVisible}
                        />
                      ))}
                    </div>
                  ) : null}

                  {!roadmapMutation.isPending &&
                  !roadmap &&
                  !roadmapMutation.error ? (
                    <EmptySelectionState
                      title="No roadmap yet"
                      description="Enter your username, choose a skill, and generate the roadmap."
                      className="px-6 py-10"
                    />
                  ) : null}
                </div>
              </div>

              <div className="order-1 lg:sticky lg:top-24 lg:order-2 lg:self-start">
                {roadmapMutation.isPending ? (
                  <RoadmapMetricsPanelSkeleton />
                ) : null}
                {!roadmapMutation.isPending && roadmap ? (
                  <RoadmapMetricsPanel
                    roadmap={roadmap}
                    computedAt={computedAt}
                    strategyDescription={selectedStrategy?.description}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
