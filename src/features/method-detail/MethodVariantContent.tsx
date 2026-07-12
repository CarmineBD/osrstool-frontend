import {
  Fragment,
  forwardRef,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  IconClick,
  IconInfoCircle,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { UsernameFetchNotice } from "@/components/UsernameFetchNotice";
import {
  EDITOR_BODY_TEXT_CLASS,
  EDITOR_META_TEXT_CLASS,
  EDITOR_NESTED_SURFACE_CLASS,
  EDITOR_SECTION_CARD_CLASS,
  EmptySelectionState,
  PixelArtIcon,
  SectionHeader,
} from "@/components/method-editor/MethodEditorPrimitives";
import { Badge } from "@/components/ui/badge";
import { VariantMembershipBadge } from "@/components/VariantMembershipBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import Markdown from "@/components/Markdown";
import OsrsQuantitySprite from "@/components/OsrsQuantitySprite";
import {
  cn,
  formatElapsedTimeFromUnix,
  formatNumber,
  formatPercent,
  getUrlByType,
} from "@/lib/utils";
import type { Item, Variant } from "@/lib/api";

const LazyVariantHistoryChart = lazy(
  () => import("@/components/VariantHistoryChart"),
);

const ITEM_TRAY_CLASS =
  "min-h-14 w-full rounded-lg border border-black/15 bg-[var(--method-detail-item-tray)] p-4 shadow-[inset_0_1px_3px_rgba(0,0,0,0.45)]";
const ITEM_TRAY_TEXT_CLASS = "text-[var(--method-detail-item-tray-foreground)]";
const ITEM_TRAY_BAR_ACTIVE_CLASS = "bg-[var(--method-detail-item-tray-bar)]";
const ITEM_TRAY_BAR_MUTED_CLASS =
  "bg-[var(--method-detail-item-tray-bar-muted)]";
const POSITIVE_TEXT_CLASS = "text-[var(--method-detail-positive)]";
const NEGATIVE_TEXT_CLASS = "text-[var(--method-detail-negative)]";

interface MethodVariantContentProps {
  variant: Variant;
  itemsMap: Record<number, Item>;
  username?: string;
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
      return "border-emerald-400/70 bg-emerald-50 text-emerald-900";
    case "very good":
      return "border-lime-300/60 bg-lime-50 text-lime-800";
    case "good":
      return "border-amber-300/60 bg-amber-50 text-amber-800";
    case "bad":
      return "border-orange-300/60 bg-orange-50 text-orange-800";
    case "very bad":
      return "border-rose-300/60 bg-rose-50 text-rose-700";
    case "not viable":
      return "border-rose-400/70 bg-rose-100 text-rose-900";
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
        Quite hard to buy/sell the items involved in this method. It would
        take approximately {formatMarketImpactDurationLabel(hours, "hour", "hours")}.
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
          rating === "great" &&
            "[&>[data-slot=progress-indicator]]:bg-emerald-600",
          rating === "very good" &&
            "[&>[data-slot=progress-indicator]]:bg-lime-500",
          rating === "good" &&
            "[&>[data-slot=progress-indicator]]:bg-amber-500",
          rating === "bad" &&
            "[&>[data-slot=progress-indicator]]:bg-orange-500",
          rating === "very bad" &&
            "[&>[data-slot=progress-indicator]]:bg-rose-400",
          rating === "not viable" &&
            "[&>[data-slot=progress-indicator]]:bg-rose-600",
        )}
      />
    </div>
  );
}

function toFiniteNumber(value: number | undefined): number | null {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatItemStat(value: number | undefined): string {
  const parsedValue = toFiniteNumber(value);
  if (parsedValue === null) return "N/A";
  return formatNumber(parsedValue);
}

function formatItemElapsedTime(value: number | undefined): string {
  const parsedValue = toFiniteNumber(value);
  if (parsedValue === null) return "N/A";
  return formatElapsedTimeFromUnix(parsedValue);
}

function DetailSection({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(EDITOR_SECTION_CARD_CLASS, className)}>
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
        level="h2"
      />
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ItemTooltipToggleButton({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 w-fit text-left text-xs font-medium text-muted-foreground underline transition-colors hover:text-foreground"
    >
      {expanded ? "Hide item details" : "Show item details"}
    </button>
  );
}

function ItemTooltipBody({
  item,
  quantity,
  showExactQuantity,
  reasonLabel,
  showAdvancedDetails,
  onToggleAdvancedDetails,
}: {
  item: Item;
  quantity: number;
  showExactQuantity: boolean;
  reasonLabel?: string;
  showAdvancedDetails: boolean;
  onToggleAdvancedDetails: () => void;
}) {
  return (
    <div className="flex flex-col">
      <span>
        {item.name}
        {showExactQuantity ? (
          <span className="text-muted-foreground">
            {" "}
            ({formatNumber(quantity)})
          </span>
        ) : null}
      </span>

      {reasonLabel ? (
        <span className="text-muted-foreground">{reasonLabel}</span>
      ) : null}

      {!showAdvancedDetails ? (
        <ItemTooltipToggleButton
          expanded={false}
          onClick={onToggleAdvancedDetails}
        />
      ) : (
        <>
          <div className="my-1 border-t border-border/60" />
          <div className="flex flex-col text-muted-foreground">
            <span>Daily buys: {formatItemStat(item.high24h)}</span>
            <span>Daily sales: {formatItemStat(item.low24h)}</span>
            <span>Last buy: {formatItemElapsedTime(item.highTime)}</span>
            <span>Last sell: {formatItemElapsedTime(item.lowTime)}</span>
          </div>
          <ItemTooltipToggleButton
            expanded
            onClick={onToggleAdvancedDetails}
          />
        </>
      )}
    </div>
  );
}

function formatItemQuantity(quantity: number): {
  label: string;
  color: "yellow" | "white" | "green";
  showExactQuantity: boolean;
} {
  if (quantity > 999_999_999) {
    return {
      label: `${(quantity / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`,
      color: "green",
      showExactQuantity: true,
    };
  }

  if (quantity > 9_999_999) {
    return {
      label: `${Math.floor(quantity / 1_000_000)}M`,
      color: "green",
      showExactQuantity: true,
    };
  }

  if (quantity > 99_999) {
    return {
      label: `${Math.floor(quantity / 1_000)}k`,
      color: "white",
      showExactQuantity: true,
    };
  }

  return {
    label: String(quantity),
    color: "yellow",
    showExactQuantity: false,
  };
}

const ItemSprite = forwardRef<
  HTMLDivElement,
  {
    iconUrl: string;
    itemName: string;
    quantity: number;
    quantityDisplay: ReturnType<typeof formatItemQuantity>;
  } & ComponentPropsWithoutRef<"div">
>(function ItemSprite(
  { iconUrl, itemName, quantity, quantityDisplay, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn("relative grid h-8 w-8 place-items-center", className)}
      {...props}
    >
      <PixelArtIcon
        src={iconUrl}
        alt={itemName}
        className="h-8 w-8"
        imgClassName="drop-shadow-[1px_1px_0_#333333]"
      />

      {quantity > 0 ? (
        <OsrsQuantitySprite
          text={quantityDisplay.label}
          color={quantityDisplay.color}
          scale={1}
          className="pointer-events-none absolute top-0 left-[2px]"
        />
      ) : null}
    </div>
  );
});

type WeightPriceMode = "input" | "output";

function getWeightPrice(item: Item, mode: WeightPriceMode): number {
  if (mode === "input") {
    return item.lowPrice ?? 0;
  }
  return item.highPrice ?? 0;
}

function RequirementReasonBadge({
  reason,
  children,
}: {
  reason?: string;
  children: ReactNode;
}) {
  const reasonLabel = reason?.trim();

  if (!reasonLabel) {
    return children;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent sideOffset={6}>
        <span>{reasonLabel}</span>
      </TooltipContent>
    </Tooltip>
  );
}

function LevelsAndQuestBadges({
  requirement,
}: {
  requirement?: Variant["requirements"];
}) {
  return (
    <>
      {(requirement?.levels || []).map(({ skill, level, reason }) => (
        <RequirementReasonBadge key={skill} reason={reason}>
          <Badge size="md" variant="secondary">
            <img
              src={getUrlByType(skill) ?? ""}
              alt={`${skill.toLowerCase()}_icon`}
            />
            {level}
          </Badge>
        </RequirementReasonBadge>
      ))}
      {(requirement?.quests || []).map(({ name, stage, reason }) => (
        <RequirementReasonBadge key={name} reason={reason}>
          <Badge size="md" variant="secondary">
            <img
              src={getUrlByType("quests") ?? ""}
              alt="quests_icon"
            />
            {stage === 1 ? `${name} (started)` : name}
          </Badge>
        </RequirementReasonBadge>
      ))}
      {(requirement?.achievement_diaries || []).map(({ name, tier, reason }) => (
        <RequirementReasonBadge key={`${name}_${tier}`} reason={reason}>
          <Badge size="md" variant="secondary">
            <img
              src={getUrlByType("achievement_diaries") ?? ""}
              alt="achievement_diaries_icon"
            />
            {`${name} ${tier}`}
          </Badge>
        </RequirementReasonBadge>
      ))}
    </>
  );
}

function OsrsItemsIcons({
  items,
  itemsMap,
  tooltipKeyPrefix,
  showAdvancedDetails,
  onToggleAdvancedDetails,
}: {
  items: Variant["inputs"];
  itemsMap: Record<number, Item>;
  tooltipKeyPrefix: string;
  showAdvancedDetails: boolean;
  onToggleAdvancedDetails: () => void;
}) {
  return (
    <>
      {items.map((entry) => {
        const item = itemsMap[entry.id];
        if (!item) return null;
        const reasonLabel = entry.reason?.trim();
        const quantityDisplay = formatItemQuantity(entry.quantity);
        return (
          <Tooltip key={`${tooltipKeyPrefix}-${entry.id}`}>
            <TooltipTrigger asChild>
              <ItemSprite
                iconUrl={item.iconUrl}
                itemName={item.name}
                quantity={entry.quantity}
                quantityDisplay={quantityDisplay}
              />
            </TooltipTrigger>
            <TooltipContent>
              <ItemTooltipBody
                item={item}
                quantity={entry.quantity}
                showExactQuantity={quantityDisplay.showExactQuantity}
                reasonLabel={reasonLabel}
                showAdvancedDetails={showAdvancedDetails}
                onToggleAdvancedDetails={onToggleAdvancedDetails}
              />
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}

function OsrsItemsContainer({
  items,
  itemsMap,
  isLoading = false,
  tooltipKeyPrefix,
  showAdvancedDetails,
  onToggleAdvancedDetails,
}: {
  items: Variant["inputs"];
  itemsMap: Record<number, Item>;
  isLoading?: boolean;
  tooltipKeyPrefix: string;
  showAdvancedDetails: boolean;
  onToggleAdvancedDetails: () => void;
}) {
  return (
    <div className={ITEM_TRAY_CLASS}>
      <div className="flex flex-wrap gap-2">
        {isLoading ? (
          Array.from({
            length: Math.min(12, Math.max(items.length, 6)),
          }).map((_, index) => (
            <Skeleton
              key={`${tooltipKeyPrefix}-items-skeleton-${index}`}
              className="h-8 w-8 rounded-sm bg-muted/70"
            />
          ))
        ) : (
          <OsrsItemsIcons
            items={items}
            itemsMap={itemsMap}
            tooltipKeyPrefix={tooltipKeyPrefix}
            showAdvancedDetails={showAdvancedDetails}
            onToggleAdvancedDetails={onToggleAdvancedDetails}
          />
        )}
      </div>
    </div>
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
    !hasUsername || hasMissingRequirements ? "lg:sticky lg:top-24 lg:z-10" : "",
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
    <Card className="@container/card gap-0 overflow-hidden rounded-xl border-border/70">
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
                {variant.highProfit !== undefined
                  ? formatNumber(variant.highProfit)
                  : "N/A"}
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
              {variant.lowProfit !== undefined
                ? formatNumber(variant.lowProfit)
                : "N/A"}
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
            <span className={labelClassName}>AFKiness</span>
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

function IoItemsGrid({
  title,
  total,
  items,
  itemsMap,
  weightPriceMode,
  isLoading = false,
  showAdvancedDetails,
  onToggleAdvancedDetails,
}: {
  title: string;
  total?: number;
  items: Variant["inputs"];
  itemsMap: Record<number, Item>;
  weightPriceMode: WeightPriceMode;
  isLoading?: boolean;
  showAdvancedDetails: boolean;
  onToggleAdvancedDetails: () => void;
}) {
  const [showWeights, setShowWeights] = useState(false);
  const [disabledRowKeys, setDisabledRowKeys] = useState<
    Record<string, boolean>
  >({});
  const canShowWeights = items.length > 1;
  const { weightedItems, enabledTotalCoins } = useMemo(() => {
    const withValues = items
      .map((entry, index) => {
        const item = itemsMap[entry.id];
        if (!item) return null;
        const totalCoins =
          entry.quantity * getWeightPrice(item, weightPriceMode);
        return { entry, item, totalCoins, rowKey: `${entry.id}-${index}` };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    const enabledTotalCoins = withValues.reduce(
      (sum, entry) =>
        disabledRowKeys[entry.rowKey] ? sum : sum + entry.totalCoins,
      0,
    );

    const sortedItems = withValues
      .map((entry) => ({
        ...entry,
        isDisabled: Boolean(disabledRowKeys[entry.rowKey]),
        weightPercent:
          !disabledRowKeys[entry.rowKey] && enabledTotalCoins > 0
            ? (entry.totalCoins / enabledTotalCoins) * 100
            : 0,
      }))
      .sort((a, b) => b.totalCoins - a.totalCoins);
    return { weightedItems: sortedItems, enabledTotalCoins };
  }, [items, itemsMap, weightPriceMode, disabledRowKeys]);

  useEffect(() => {
    if (!canShowWeights) {
      setShowWeights(false);
    }
  }, [canShowWeights]);

  const displayTotal =
    showWeights && !isLoading ? Math.round(enabledTotalCoins) : total;

  return (
    <div className="flex-1 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold leading-5 text-foreground">
            {title}
          </h3>
          <span className={EDITOR_META_TEXT_CLASS}>
            {typeof displayTotal === "number"
              ? `(${formatNumber(displayTotal)} gp)`
              : isLoading
                ? null
                : "(N/A)"}
          </span>
          {isLoading ? <Skeleton className="h-3 w-24" /> : null}
        </div>

        {canShowWeights ? (
          <label className={cn("flex items-center gap-2", EDITOR_META_TEXT_CLASS)}>
            <Switch checked={showWeights} onCheckedChange={setShowWeights} />
            View weights
          </label>
        ) : null}
      </div>
      <div className={ITEM_TRAY_CLASS}>
        <div
          className={
            showWeights && !isLoading
              ? "grid grid-cols-[2rem_max-content_minmax(0,1fr)_1.25rem] items-center gap-x-2 gap-y-2"
              : "flex flex-wrap gap-2"
          }
        >
          {isLoading ? (
            Array.from({
              length: Math.min(12, Math.max(items.length, 6)),
            }).map((_, index) => (
              <Skeleton
                key={`${title}-items-skeleton-${index}`}
                className="h-8 w-8 rounded-sm bg-muted/70"
              />
            ))
          ) : showWeights ? (
            weightedItems.map((entry) => {
              const quantityDisplay = formatItemQuantity(entry.entry.quantity);
              const reasonLabel = entry.entry.reason?.trim();
              const roundedTotalCoins = Math.round(entry.totalCoins);
              const showExactCoinsTitle = roundedTotalCoins > 999;
              const rowMutedClass = entry.isDisabled
                ? "opacity-45 saturate-0"
                : "";
              const numberClassName = entry.isDisabled
                ? "text-muted-foreground"
                : ITEM_TRAY_TEXT_CLASS;
              const barClassName = entry.isDisabled
                ? ITEM_TRAY_BAR_MUTED_CLASS
                : ITEM_TRAY_BAR_ACTIVE_CLASS;

              return (
                <Fragment key={`${title}-weight-${entry.rowKey}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ItemSprite
                        iconUrl={entry.item.iconUrl}
                        itemName={entry.item.name}
                        quantity={entry.entry.quantity}
                        quantityDisplay={quantityDisplay}
                        className={rowMutedClass}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <ItemTooltipBody
                        item={entry.item}
                        quantity={entry.entry.quantity}
                        showExactQuantity={quantityDisplay.showExactQuantity}
                        reasonLabel={reasonLabel}
                        showAdvancedDetails={showAdvancedDetails}
                        onToggleAdvancedDetails={onToggleAdvancedDetails}
                      />
                    </TooltipContent>
                  </Tooltip>

                  {showExactCoinsTitle ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            "justify-self-end whitespace-nowrap text-right text-xs font-medium",
                            numberClassName,
                          )}
                        >
                          {formatNumber(roundedTotalCoins)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6}>
                        <span>{roundedTotalCoins.toLocaleString()}</span>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span
                      className={cn(
                        "justify-self-end whitespace-nowrap text-right text-xs font-medium",
                        numberClassName,
                      )}
                    >
                      {formatNumber(roundedTotalCoins)}
                    </span>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn("min-w-0 w-full", rowMutedClass)}>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-black/30">
                          <div
                            className={cn("h-full rounded-full", barClassName)}
                            style={{ width: `${entry.weightPercent}%` }}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      <span>{entry.weightPercent.toFixed(2)}%</span>
                    </TooltipContent>
                  </Tooltip>

                  <input
                    type="checkbox"
                    aria-label={`Include ${entry.item.name} in weight calculation`}
                    className="justify-self-end size-3.5 cursor-pointer accent-[var(--method-detail-item-tray-bar)]"
                    checked={!entry.isDisabled}
                    onChange={(event) => {
                      const isEnabled = event.currentTarget.checked;
                      setDisabledRowKeys((current) => {
                        if (isEnabled) {
                          const remaining = { ...current };
                          delete remaining[entry.rowKey];
                          return remaining;
                        }

                        return { ...current, [entry.rowKey]: true };
                      });
                    }}
                  />
                </Fragment>
              );
            })
          ) : (
            <OsrsItemsIcons
              items={items}
              itemsMap={itemsMap}
              tooltipKeyPrefix={title}
              showAdvancedDetails={showAdvancedDetails}
              onToggleAdvancedDetails={onToggleAdvancedDetails}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function GuidanceColumn({
  title,
  requirement,
  items,
  itemsMap,
  isItemsLoading = false,
  tooltipKeyPrefix,
  emptyDescription,
  showAdvancedDetails,
  onToggleAdvancedDetails,
}: {
  title: string;
  requirement?: Variant["requirements"];
  items: Variant["inputs"];
  itemsMap: Record<number, Item>;
  isItemsLoading?: boolean;
  tooltipKeyPrefix: string;
  emptyDescription: string;
  showAdvancedDetails: boolean;
  onToggleAdvancedDetails: () => void;
}) {
  const hasProgression = Boolean(
    requirement?.levels?.length ||
    requirement?.quests?.length ||
    requirement?.achievement_diaries?.length,
  );
  const hasItems = items.length > 0;
  const hasContent = hasProgression || hasItems;

  return (
    <section className={cn(EDITOR_NESTED_SURFACE_CLASS, "space-y-4 bg-card p-4")}>
      <SectionHeader title={title} level="h3" />

      {!hasContent ? (
        <EmptySelectionState description={emptyDescription} />
      ) : (
        <>
          {hasProgression ? (
            <div className="flex flex-wrap gap-2">
              <LevelsAndQuestBadges requirement={requirement} />
            </div>
          ) : (
            <p className={EDITOR_BODY_TEXT_CLASS}>No progression entries.</p>
          )}

          {hasItems ? (
            <OsrsItemsContainer
              items={items}
              itemsMap={itemsMap}
              isLoading={isItemsLoading}
              tooltipKeyPrefix={tooltipKeyPrefix}
              showAdvancedDetails={showAdvancedDetails}
              onToggleAdvancedDetails={onToggleAdvancedDetails}
            />
          ) : (
            <p className={EDITOR_BODY_TEXT_CLASS}>No items configured.</p>
          )}
        </>
      )}
    </section>
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
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <GuidanceColumn
        title="Requirements"
        requirement={variant.requirements}
        items={variant.requirements?.items ?? []}
        itemsMap={itemsMap}
        isItemsLoading={isItemsLoading}
        tooltipKeyPrefix="requirements"
        emptyDescription="No requirements are configured for this variant."
        showAdvancedDetails={showAdvancedDetails}
        onToggleAdvancedDetails={onToggleAdvancedDetails}
      />
      <GuidanceColumn
        title="Recommendations"
        requirement={variant.recommendations}
        items={variant.recommendations?.items ?? []}
        itemsMap={itemsMap}
        isItemsLoading={isItemsLoading}
        tooltipKeyPrefix="recommendations"
        emptyDescription="No recommendations are configured for this variant."
        showAdvancedDetails={showAdvancedDetails}
        onToggleAdvancedDetails={onToggleAdvancedDetails}
      />
    </div>
  );
}

export function MethodVariantContent({
  variant,
  itemsMap,
  username,
  iconUrl,
  inputsTotal,
  outputsTotal,
  isItemsLoading = false,
}: MethodVariantContentProps) {
  const [showAdvancedItemDetails, setShowAdvancedItemDetails] = useState(false);
  const toggleAdvancedItemDetails = () =>
    setShowAdvancedItemDetails((current) => !current);
  const variantTitle = variant.label?.trim() || "Variant";

  return (
    <div className="w-full space-y-6">
      <MissingRequirementsNotice variant={variant} username={username} />

      <DetailSection
        eyebrow="Active variant"
        title={variantTitle}
        description="Scenario-specific notes and setup for the selected variant."
        actions={
          <div className="flex items-center gap-2">
            {iconUrl ? (
              <PixelArtIcon
                src={iconUrl}
                alt={`${variantTitle} icon`}
                title={variantTitle}
              />
            ) : null}
            <VariantMembershipBadge members={variant.members} />
          </div>
        }
      >
        {variant.description?.trim() ? (
          <div className={cn(EDITOR_NESTED_SURFACE_CLASS, "bg-card p-4")}>
            <Markdown content={variant.description} items={itemsMap} />
          </div>
        ) : (
          <EmptySelectionState description="No description is configured for this variant yet." />
        )}
      </DetailSection>

      <DetailSection
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
      </DetailSection>

      <DetailSection
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
      </DetailSection>

      <DetailSection
        title="Profit history"
        description="Use the trend view to judge short-term and long-term volatility."
      >
        {variant.id ? (
          <Suspense
            fallback={
              <div className="space-y-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-64 w-full rounded-xl" />
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
      </DetailSection>
    </div>
  );
}
