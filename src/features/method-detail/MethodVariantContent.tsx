import { lazy, Suspense, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  IconClick,
  IconInfoCircle,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { AnimatedProfitValue } from "@/components/AnimatedProfitValue";
import { IoItemsGrid } from "@/components/IoItemsDisplay";
import {
  GuidanceColumn,
  hasGuidanceContent,
  LevelsAndQuestBadges,
} from "@/components/RequirementsDisplay";
import { UsernameFetchNotice } from "@/components/UsernameFetchNotice";
import {
  EDITOR_BODY_TEXT_CLASS,
  EDITOR_PAGE_EYEBROW_CLASS,
  EDITOR_META_TEXT_CLASS,
  EDITOR_SECTION_TITLE_CLASS,
  EditorSubsection,
  EmptySelectionState,
  PixelArtIcon,
  SectionHeader,
} from "@/components/method-editor/MethodEditorPrimitives";
import { VariantTags } from "@/components/VariantTags";
import { Badge } from "@/components/ui/badge";
import { VariantMembershipBadge } from "@/components/VariantMembershipBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import Markdown from "@/components/Markdown";
import {
  formatImpactPercent,
  getStrategyRecommendation,
  type StrategyRecommendation,
} from "@/features/method-detail/marketImpactStrategy";
import { cn, formatNumber, formatPercent, getUrlByType } from "@/lib/utils";
import type { Item, Method, Variant } from "@/lib/api";
import { LikeButton } from "@/features/methods/LikeButton";
import { MethodDetailFooter } from "@/features/method-detail/MethodDetailFooter";

const LazyVariantHistoryChart = lazy(
  () => import("@/components/VariantHistoryChart"),
);

const POSITIVE_TEXT_CLASS = "text-[var(--method-detail-positive)]";
const NEGATIVE_TEXT_CLASS = "text-[var(--method-detail-negative)]";

interface MethodVariantContentProps {
  method?: Method;
  methodId: string;
  variant: Variant;
  itemsMap: Record<number, Item>;
  username?: string;
  creatorAvatarUrl?: string;
  iconUrl?: string;
  inputsTotal?: number;
  outputsTotal?: number;
  isItemsLoading?: boolean;
}

function formatLiquidityScore(score?: number): string {
  if (typeof score !== "number") return "N/A";
  return `${Math.round(score * 100)}%`;
}

const MARKET_IMPACT_MAX_PERCENT = 2400;

type MarketImpactRating =
  | "great"
  | "very good"
  | "good"
  | "bad"
  | "very bad"
  | "not viable";

function getMarketImpactPercent(score?: number): number | null {
  if (typeof score !== "number") return null;
  return score * 100;
}

function getMarketImpactRating(percent: number): MarketImpactRating {
  if (percent < 25) return "great";
  if (percent < 100) return "very good";
  if (percent < 400) return "good";
  if (percent < 1200) return "bad";
  if (percent < MARKET_IMPACT_MAX_PERCENT) return "very bad";
  return "not viable";
}

function getMarketImpactProgressValue(percent: number): number {
  return Math.min((percent / MARKET_IMPACT_MAX_PERCENT) * 100, 100);
}

function formatMarketImpactMinutes(percent: number): string {
  return formatNumber(Math.round((percent / 100) * 60));
}

function formatMarketImpactHours(percent: number): string {
  const hours = percent / 100;
  return hours.toFixed(2).replace(/\.?0+$/, "");
}

function formatMarketImpactDays(percent: number): string {
  const days = percent / 100 / 24;
  return days.toFixed(2).replace(/\.?0+$/, "");
}

function formatMarketImpactDurationLabel(
  value: string,
  singularUnit: string,
  pluralUnit: string,
): string {
  return `${value} ${value === "1" ? singularUnit : pluralUnit}`;
}

function getMarketImpactToneClassName(rating: MarketImpactRating): string {
  switch (rating) {
    case "great":
      return "border-success/45 bg-success-soft text-success-foreground";
    case "very good":
      return "border-success/30 bg-success-soft/85 text-success-foreground";
    case "good":
      return "border-warning/35 bg-warning-soft text-warning-foreground";
    case "bad":
      return "border-warning/50 bg-warning-soft/90 text-warning-foreground";
    case "very bad":
      return "border-danger/30 bg-danger-soft text-danger-foreground";
    case "not viable":
      return "border-danger/45 bg-danger-soft/90 text-danger-foreground";
  }
}

function MarketImpactTooltipContent({
  rating,
  percent,
}: {
  rating: MarketImpactRating;
  percent: number;
}) {
  if (rating === "great" || rating === "very good") {
    const minutes = formatMarketImpactMinutes(percent);
    return (
      <p className="m-0">
        Easy to buy/sell the items involved in this method. It would take
        approximately{" "}
        {formatMarketImpactDurationLabel(minutes, "minute", "minutes")}.
        <br />
        <br />
        See how this metric is calculated in the{" "}
        <Link to="/wiki" className="font-medium underline">
          wiki
        </Link>
        .
      </p>
    );
  }

  if (rating === "good" || rating === "bad" || rating === "very bad") {
    const hours = formatMarketImpactHours(percent);
    return (
      <p className="m-0">
        Quite hard to buy/sell the items involved in this method. It would take
        approximately {formatMarketImpactDurationLabel(hours, "hour", "hours")}.
        <br />
        <br />
        See how this metric is calculated in the{" "}
        <Link to="/wiki" className="font-medium underline">
          wiki
        </Link>
        .
      </p>
    );
  }

  const days = formatMarketImpactDays(percent);
  return (
    <p className="m-0">
      Hard to buy/sell the items involved in this method. It would take
      approximately {formatMarketImpactDurationLabel(days, "day", "days")}.
      <br />
      <br />
      See how this metric is calculated in the{" "}
      <Link to="/wiki" className="font-medium underline">
        wiki
      </Link>
      .
    </p>
  );
}

function LabelInfoTooltip({
  label,
  tooltip,
}: {
  label: string;
  tooltip: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${label} explanation`}
          className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconInfoCircle className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        sideOffset={6}
        className="w-max max-w-[360px] whitespace-normal break-words text-wrap text-left"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function MetricLabelWithInfo({
  label,
  tooltip,
}: {
  label: string;
  tooltip?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-sm text-muted-foreground",
        tooltip ? "flex items-center gap-2" : "",
      )}
    >
      <span>{label}</span>
      {tooltip ? <LabelInfoTooltip label={label} tooltip={tooltip} /> : null}
    </span>
  );
}

function MarketImpactIndicator({
  label,
  score,
}: {
  label: string;
  score?: number;
}) {
  const percent = getMarketImpactPercent(score);

  if (percent === null) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className={EDITOR_META_TEXT_CLASS}>{label}</span>
          <span className={EDITOR_META_TEXT_CLASS}>N/A</span>
        </div>
        <Progress
          value={0}
          className="h-2 bg-muted [&>[data-slot=progress-indicator]]:bg-muted-foreground/25"
        />
      </div>
    );
  }

  const rating = getMarketImpactRating(percent);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={EDITOR_META_TEXT_CLASS}>{label}</span>
          <Badge
            variant="outline"
            size="sm"
            className={cn("capitalize", getMarketImpactToneClassName(rating))}
          >
            {rating}
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Market impact explanation for ${label}`}
                className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              >
                <IconInfoCircle className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              sideOffset={6}
              className="w-max max-w-[320px] whitespace-normal text-left"
            >
              <MarketImpactTooltipContent rating={rating} percent={percent} />
            </TooltipContent>
          </Tooltip>
        </div>
        <span className="text-sm font-medium tabular-nums text-foreground">
          {formatLiquidityScore(score)}
        </span>
      </div>
      <Progress
        value={getMarketImpactProgressValue(percent)}
        className={cn(
          "h-2 bg-muted",
          "[&>[data-slot=progress-indicator]]:transition-all",
          rating === "great" && "[&>[data-slot=progress-indicator]]:bg-success",
          rating === "very good" &&
            "[&>[data-slot=progress-indicator]]:bg-success/80",
          rating === "good" && "[&>[data-slot=progress-indicator]]:bg-warning",
          rating === "bad" &&
            "[&>[data-slot=progress-indicator]]:bg-warning/80",
          rating === "very bad" &&
            "[&>[data-slot=progress-indicator]]:bg-danger/75",
          rating === "not viable" &&
            "[&>[data-slot=progress-indicator]]:bg-danger",
        )}
      />
    </div>
  );
}

function StrategyTooltipContent({
  recommendation,
}: {
  recommendation: StrategyRecommendation;
}) {
  return (
    <div className="space-y-2">
      <p className="m-0">
        {recommendation.preferredMode === "instant" ? "Instant" : "Slow"}{" "}
        impact: {formatImpactPercent(recommendation.preferredPercent)}
      </p>
      <p className="m-0">
        {recommendation.alternativeMode === "instant" ? "Instant" : "Slow"}{" "}
        impact: {formatImpactPercent(recommendation.alternativePercent)}
      </p>
      <p className="m-0">{recommendation.summary}</p>
    </div>
  );
}

function StrategyRecommendationLine({
  recommendation,
}: {
  recommendation: StrategyRecommendation | null;
}) {
  if (!recommendation) {
    return <span className={EDITOR_META_TEXT_CLASS}>N/A</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="w-full text-left text-sm font-medium text-foreground underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground/80"
        >
          {recommendation.label}
        </button>
      </TooltipTrigger>
      <TooltipContent
        sideOffset={6}
        className="w-max max-w-[320px] whitespace-normal text-left"
      >
        <StrategyTooltipContent recommendation={recommendation} />
      </TooltipContent>
    </Tooltip>
  );
}

function MissingRequirementsNotice({
  variant,
  username,
}: {
  variant: Variant;
  username?: string;
}) {
  const normalizedUsername = username?.trim();
  const hasUsername = Boolean(normalizedUsername);
  const hasMissingRequirements = Boolean(variant.missingRequirements);
  const stickyNoticeClass = cn(
    !hasUsername || hasMissingRequirements
      ? "relative lg:sticky lg:top-24 lg:z-30 lg:shadow-sm"
      : "",
    hasMissingRequirements && "lg:bg-danger-soft",
  );

  if (!hasUsername) {
    return <UsernameFetchNotice state="info" className={stickyNoticeClass} />;
  }

  if (hasMissingRequirements) {
    return (
      <UsernameFetchNotice
        state="error"
        className={stickyNoticeClass}
        resetKey={variant.id ?? variant.label}
      >
        <div className="space-y-3">
          <p className={EDITOR_BODY_TEXT_CLASS}>
            You are missing some requirements to do this variant:
          </p>
          <div className="flex flex-wrap gap-2">
            <LevelsAndQuestBadges requirement={variant.missingRequirements} />
          </div>
        </div>
      </UsernameFetchNotice>
    );
  }

  return <UsernameFetchNotice state="success" />;
}

function MetricsCards({ variant }: { variant: Variant }) {
  const xpHourEntries = variant.xpHour ?? [];
  const xpHourTotal = xpHourEntries.reduce(
    (total, { experience }) => total + experience,
    0,
  );
  const hasInputs = (variant.inputs?.length ?? 0) > 0;
  const hasOutputs = (variant.outputs?.length ?? 0) > 0;
  const inputStrategyRecommendation = getStrategyRecommendation(
    "inputs",
    variant.inputMarketImpactInstant,
    variant.inputMarketImpactSlow,
  );
  const outputStrategyRecommendation = getStrategyRecommendation(
    "outputs",
    variant.outputMarketImpactInstant,
    variant.outputMarketImpactSlow,
  );
  const trendToneClassName =
    typeof variant.trendLastMonth !== "number"
      ? "text-muted-foreground"
      : variant.trendLastMonth >= 0
        ? POSITIVE_TEXT_CLASS
        : NEGATIVE_TEXT_CLASS;

  const rowClassName =
    "flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3";
  const labelClassName = "text-sm text-muted-foreground";
  const valueClassName =
    "text-right text-sm font-medium tabular-nums text-foreground";

  return (
    <Card className="@container/card gap-0 overflow-hidden rounded-xl border-border/70 mb-6">
      <CardHeader className="border-b border-border/60 pb-6">
        <SectionHeader
          title="Summary"
          description="Key metrics for the active variant."
          level="h2"
        />
      </CardHeader>
      <CardContent className="pt-6">
        <div className="divide-y divide-border/50">
          <div className={rowClassName}>
            <span className={labelClassName}>Access</span>
            <VariantMembershipBadge members={variant.members} />
          </div>

          <div className={rowClassName}>
            <span className={labelClassName}>GP/hr</span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="flex items-center gap-2 text-right text-2xl font-semibold tabular-nums text-foreground">
                <figure className="shrink-0">
                  <img
                    src="https://oldschool.runescape.wiki/images/Coins_10000.png"
                    alt="Coins"
                    title="Coins"
                    className="size-5 shrink-0 object-contain"
                  />
                </figure>
                <AnimatedProfitValue value={variant.highProfit} />
              </span>
            </div>
          </div>

          <div className={rowClassName}>
            <MetricLabelWithInfo
              label="Low profit"
              tooltip={
                <p className="m-0">
                  The profit expected if the player insta-buys the inputs and
                  insta-sells the outputs.
                </p>
              }
            />
            <span className={valueClassName}>
              <AnimatedProfitValue value={variant.lowProfit} />
            </span>
          </div>

          <div className={rowClassName}>
            <span className={labelClassName}>Monthly trend</span>
            <span
              className={cn(
                "flex items-center justify-end gap-2 text-right text-sm font-medium tabular-nums",
                trendToneClassName,
              )}
            >
              {typeof variant.trendLastMonth === "number" ? (
                <>
                  {variant.trendLastMonth >= 0 ? (
                    <IconTrendingUp className="size-4" />
                  ) : (
                    <IconTrendingDown className="size-4" />
                  )}
                  {formatPercent(variant.trendLastMonth, 0)}
                </>
              ) : (
                "N/A"
              )}
            </span>
          </div>

          <div className={rowClassName}>
            <span className={labelClassName}>XP/hr</span>
            <div className="flex max-w-full flex-col items-end gap-2">
              {xpHourEntries.length === 0 ? (
                <span className={valueClassName}>N/A</span>
              ) : xpHourEntries.length === 1 ? (
                xpHourEntries.map(({ skill, experience }) => (
                  <Badge size="md" key={skill} variant="secondary">
                    <img
                      src={getUrlByType(skill) ?? ""}
                      alt={`${skill.toLowerCase()}_icon`}
                      title={skill}
                    />
                    {formatNumber(experience)}
                  </Badge>
                ))
              ) : (
                <>
                  <div className="flex flex-col items-end gap-1">
                    <span className={EDITOR_META_TEXT_CLASS}>Total</span>
                    <span className={valueClassName}>
                      {formatNumber(xpHourTotal)}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {xpHourEntries.map(({ skill, experience }) => (
                      <Badge size="md" key={skill} variant="secondary">
                        <img
                          src={getUrlByType(skill) ?? ""}
                          alt={`${skill.toLowerCase()}_icon`}
                          title={skill}
                        />
                        {formatNumber(experience)}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={rowClassName}>
            <span className={labelClassName}>% AFK</span>
            <span className={valueClassName}>
              {variant.afkiness !== undefined ? `${variant.afkiness}%` : "N/A"}
            </span>
          </div>

          <div className={rowClassName}>
            <MetricLabelWithInfo
              label="Click intensity"
              tooltip={
                <p className="m-0">
                  The number of clicks required for 1 hour of this method.
                </p>
              }
            />
            <span className="flex items-center justify-end gap-2 text-right text-sm font-medium tabular-nums text-foreground">
              <IconClick className="size-4" />
              {variant.clickIntensity !== undefined
                ? `${formatNumber(variant.clickIntensity)} clicks/hr`
                : "N/A"}
            </span>
          </div>

          <div className={rowClassName}>
            <MetricLabelWithInfo
              label="Market impact"
              tooltip={
                <p className="m-0">
                  Estimated market impact from one hour of item volume. See the{" "}
                  <Link to="/wiki" className="font-medium underline">
                    wiki
                  </Link>{" "}
                  for the calculation details.
                </p>
              }
            />
            <div className="w-full max-w-[15rem] space-y-3">
              <MarketImpactIndicator
                label="Patient"
                score={variant.marketImpactSlow}
              />
              <MarketImpactIndicator
                label="Instant"
                score={variant.marketImpactInstant}
              />
            </div>
          </div>

          {hasInputs || hasOutputs ? (
            <div className={rowClassName}>
              <MetricLabelWithInfo
                label="Strategy"
                tooltip={
                  <p className="m-0">
                    Strategy compares instant and slow market impact for inputs
                    and outputs. Lower impact is better because it puts less
                    pressure on the weighted daily volume behind this variant.
                  </p>
                }
              />
              <div className="w-full max-w-[15rem] rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className={EDITOR_META_TEXT_CLASS}>It&apos;s better to</p>
                <div className="mt-2 space-y-3">
                  {hasInputs ? (
                    <StrategyRecommendationLine
                      recommendation={inputStrategyRecommendation}
                    />
                  ) : null}
                  {hasOutputs ? (
                    <StrategyRecommendationLine
                      recommendation={outputStrategyRecommendation}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className={rowClassName}>
            <span className={labelClassName}>Tags</span>
            <div className="flex max-w-full justify-end">
              <VariantTags tags={variant.tags} emptyLabel="None" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MethodVariantMetricsPanel({ variant }: { variant: Variant }) {
  return (
    <aside className="self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
      <MetricsCards variant={variant} />
    </aside>
  );
}

function RequirementsAndRecommendationsSection({
  variant,
  itemsMap,
  isItemsLoading = false,
  showAdvancedDetails,
  onToggleAdvancedDetails,
}: {
  variant: Variant;
  itemsMap: Record<number, Item>;
  isItemsLoading?: boolean;
  showAdvancedDetails: boolean;
  onToggleAdvancedDetails: () => void;
}) {
  const hasRequirements = hasGuidanceContent(
    variant.requirements,
    variant.requirements?.items ?? [],
  );
  const hasRecommendations = hasGuidanceContent(
    variant.recommendations,
    variant.recommendations?.items ?? [],
  );

  if (!hasRequirements && !hasRecommendations) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {hasRequirements ? (
        <GuidanceColumn
          title="Requirements"
          requirement={variant.requirements}
          items={variant.requirements?.items ?? []}
          itemsMap={itemsMap}
          isItemsLoading={isItemsLoading}
          tooltipKeyPrefix="requirements"
          showAdvancedDetails={showAdvancedDetails}
          onToggleAdvancedDetails={onToggleAdvancedDetails}
        />
      ) : null}
      {hasRecommendations ? (
        <GuidanceColumn
          title="Recommendations"
          requirement={variant.recommendations}
          items={variant.recommendations?.items ?? []}
          itemsMap={itemsMap}
          isItemsLoading={isItemsLoading}
          tooltipKeyPrefix="recommendations"
          showAdvancedDetails={showAdvancedDetails}
          onToggleAdvancedDetails={onToggleAdvancedDetails}
        />
      ) : null}
    </div>
  );
}

export function MethodVariantContent({
  method,
  methodId,
  variant,
  itemsMap,
  username,
  creatorAvatarUrl,
  iconUrl,
  inputsTotal,
  outputsTotal,
  isItemsLoading = false,
}: MethodVariantContentProps) {
  const [showAdvancedItemDetails, setShowAdvancedItemDetails] = useState(false);
  const toggleAdvancedItemDetails = () =>
    setShowAdvancedItemDetails((current) => !current);
  const variantTitle = variant.label?.trim() || "Variant";
  const hasRequirementsSection = hasGuidanceContent(
    variant.requirements,
    variant.requirements?.items ?? [],
  );
  const hasRecommendationsSection = hasGuidanceContent(
    variant.recommendations,
    variant.recommendations?.items ?? [],
  );

  return (
    <div className="w-full space-y-6 mb-6">
      <MissingRequirementsNotice variant={variant} username={username} />

      <section
        className={cn(
          "overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm",
        )}
      >
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <p className={EDITOR_PAGE_EYEBROW_CLASS}>Variant Details</p>
              <div className="flex items-center gap-3">
                {iconUrl ? (
                  <PixelArtIcon
                    src={iconUrl}
                    alt={`${variantTitle} icon`}
                    title={variantTitle}
                  />
                ) : null}
                <h2 className={EDITOR_SECTION_TITLE_CLASS}>{variantTitle}</h2>
              </div>
              <p className={EDITOR_BODY_TEXT_CLASS}>
                Scenario-specific notes and setup for the selected variant.
              </p>
            </div>
            {variant.id ? (
              <LikeButton
                methodId={methodId}
                variantId={variant.id}
                likedByMe={variant.likedByMe}
                likes={variant.likes ?? 0}
                className="self-start"
              />
            ) : null}
          </div>

          {variant.description?.trim() ? (
            <div className="space-y-4">
              <Markdown content={variant.description} items={itemsMap} />
            </div>
          ) : (
            <EmptySelectionState description="No description is configured for this variant yet." />
          )}
        </div>

        <EditorSubsection
          title="Inputs & outputs"
          description="Review the setup cost and expected loot for this scenario."
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <IoItemsGrid
              title="Inputs"
              total={inputsTotal}
              items={variant.inputs}
              itemsMap={itemsMap}
              weightPriceMode="input"
              isLoading={isItemsLoading}
              showAdvancedDetails={showAdvancedItemDetails}
              onToggleAdvancedDetails={toggleAdvancedItemDetails}
            />
            <IoItemsGrid
              title="Outputs"
              total={outputsTotal}
              items={variant.outputs}
              itemsMap={itemsMap}
              weightPriceMode="output"
              isLoading={isItemsLoading}
              showAdvancedDetails={showAdvancedItemDetails}
              onToggleAdvancedDetails={toggleAdvancedItemDetails}
            />
          </div>
        </EditorSubsection>

        {hasRequirementsSection || hasRecommendationsSection ? (
          <EditorSubsection
            title="Requirements & recommendations"
            description="Mandatory prerequisites first, then optional improvements."
          >
            <RequirementsAndRecommendationsSection
              variant={variant}
              itemsMap={itemsMap}
              isItemsLoading={isItemsLoading}
              showAdvancedDetails={showAdvancedItemDetails}
              onToggleAdvancedDetails={toggleAdvancedItemDetails}
            />
          </EditorSubsection>
        ) : null}

        <EditorSubsection
          title="Profit history"
          description="Use the trend view to judge short-term and long-term volatility."
        >
          {variant.id ? (
            <Suspense
              fallback={
                <div className="space-y-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-64 w-full rounded-xl lg:h-72" />
                </div>
              }
            >
              <LazyVariantHistoryChart
                variantId={variant.id}
                trendLastHour={variant.trendLastHour}
                trendLast24h={variant.trendLast24h}
                trendLastWeek={variant.trendLastWeek}
                trendLastMonth={variant.trendLastMonth}
                trendLastYear={variant.trendLastYear}
              />
            </Suspense>
          ) : (
            <EmptySelectionState description="History data is not available for this variant yet." />
          )}
        </EditorSubsection>

        <MethodDetailFooter
          method={method}
          creatorAvatarUrl={creatorAvatarUrl}
        />
      </section>
    </div>
  );
}
