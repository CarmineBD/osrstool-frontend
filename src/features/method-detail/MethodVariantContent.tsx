import { Fragment, lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClick,
  IconInfoCircle,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { UsernameFetchNotice } from "@/components/UsernameFetchNotice";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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

interface MethodVariantContentProps {
  variant: Variant;
  itemsMap: Record<number, Item>;
  username?: string;
  inputsTotal?: number;
  outputsTotal?: number;
  isItemsLoading?: boolean;
}

function formatLiquidityScore(score?: number): string {
  if (typeof score !== "number") return "N/A";
  return `${(score * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
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
        <button
          type="button"
          onClick={onToggleAdvancedDetails}
          className="mt-1 w-fit cursor-pointer text-left text-[11px] text-muted-foreground underline hover:text-foreground"
        >
          show more details
        </button>
      ) : (
        <>
          <div className="my-1 border-t border-white/35" />
          <div className="flex flex-col text-muted-foreground">
            <span>Dailes buys: {formatItemStat(item.high24h)}</span>
            <span>Dailies sales: {formatItemStat(item.low24h)}</span>
            <span>last buy: {formatItemElapsedTime(item.highTime)}</span>
            <span>last sell: {formatItemElapsedTime(item.lowTime)}</span>
          </div>
          <button
            type="button"
            onClick={onToggleAdvancedDetails}
            className="mt-1 w-fit cursor-pointer text-left text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            show less details
          </button>
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

type WeightPriceMode = "input" | "output";

function getWeightPrice(item: Item, mode: WeightPriceMode): number {
  if (mode === "input") {
    return item.lowPrice ?? 0;
  }
  return item.highPrice ?? 0;
}

function LevelsAndQuestBadges({
  requirement,
}: {
  requirement?: Variant["requirements"];
}) {
  return (
    <>
      {(requirement?.levels || []).map(({ skill, level }) => (
        <Badge size="lg" key={skill} variant="secondary">
          <img
            src={getUrlByType(skill) ?? ""}
            alt={`${skill.toLowerCase()}_icon`}
            title={skill}
          />
          {level}
        </Badge>
      ))}
      {(requirement?.quests || []).map(({ name, stage }) => (
        <Badge size="lg" key={name} variant="secondary">
          <img
            src={getUrlByType("quests") ?? ""}
            alt="quests_icon"
            title="quests"
          />
          {stage === 1 ? name : `${name} (started)`}
        </Badge>
      ))}
      {(requirement?.achievement_diaries || []).map(({ name, tier }) => (
        <Badge size="lg" key={`${name}_${tier}`} variant="secondary">
          <img
            src={getUrlByType("achievement_diaries") ?? ""}
            alt="achievement_diaries_icon"
            title="quests"
          />
          {`${name} ${tier}`}
        </Badge>
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
              <div className="relative mx-0.75 grid h-8 w-8 place-items-center">
                <figure className="grid h-full w-full place-items-center">
                  <img
                    src={item.iconUrl}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain drop-shadow-[1px_1px_0_#333333] [image-rendering:pixelated]"
                  />
                </figure>

                {entry.quantity > 0 ? (
                  <OsrsQuantitySprite
                    text={quantityDisplay.label}
                    color={quantityDisplay.color}
                    scale={1}
                    className="pointer-events-none absolute top-0 left-[2px]"
                  />
                ) : null}
              </div>
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
    <div className="min-h-14 w-full rounded-md bg-[#494034] p-4 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
      <div className="flex flex-start flex-wrap gap-1">
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
  const hasMissingRequirements = Boolean(variant.missingRequirements);
  const allRequirementsMet = Boolean(username) && !hasMissingRequirements;
  const statusIcon = hasMissingRequirements ? (
    <IconAlertTriangle className="size-4" />
  ) : allRequirementsMet ? (
    <IconCircleCheck className="size-4" />
  ) : (
    <IconInfoCircle className="size-4" />
  );

  return (
    <UsernameFetchNotice
      showPrompt={!username}
      icon={statusIcon}
      resetKey={`${variant.id}-${username ?? "missing"}-${
        hasMissingRequirements ? "missing" : "complete"
      }`}
      dismissLabel="Dismiss requirements notice"
      className={cn(!allRequirementsMet && "lg:sticky lg:top-24 lg:z-10")}
    >
      {hasMissingRequirements ? (
        <div className="space-y-3">
          <p>You are missing some requirements to do this method:</p>
          <div className="flex flex-start flex-wrap gap-2">
            <LevelsAndQuestBadges requirement={variant.missingRequirements} />
          </div>
        </div>
      ) : username ? (
        <p>All requirements met!</p>
      ) : null}
    </UsernameFetchNotice>
  );
}

function MetricsCards({ variant }: { variant: Variant }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Gp/hr</CardDescription>
          <CardTitle className="flex items-center gap-3 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            <figure className="shrink-0">
              <img
                src="https://oldschool.runescape.wiki/images/Coins_10000.png"
                alt="Coins"
                title="Coins"
                className="size-6 shrink-0 object-contain"
              />
            </figure>

            {variant.highProfit !== undefined
              ? formatNumber(variant.highProfit)
              : "N/A"}
          </CardTitle>
          <CardAction>
            {typeof variant.trendLastHour === "number" ? (
              <Badge variant="outline">
                {variant.trendLastHour >= 0 ? (
                  <IconTrendingUp />
                ) : (
                  <IconTrendingDown />
                )}
                {formatPercent(variant.trendLastHour)}
              </Badge>
            ) : null}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {typeof variant.trendLastMonth === "number" ? (
            <div className="line-clamp-1 flex gap-2 font-medium">
              {variant.trendLastMonth >= 0
                ? "Trending up this month"
                : "Trending down this month"}
              {variant.trendLastMonth >= 0 ? (
                <IconTrendingUp className="size-4" />
              ) : (
                <IconTrendingDown className="size-4" />
              )}
            </div>
          ) : null}
          <div className="text-muted-foreground">
            {variant.lowProfit !== undefined
              ? `${formatNumber(variant.lowProfit)} (lowest profit)`
              : "N/A"}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Xp/hr</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {variant.xpHour
              ? formatNumber(
                  variant.xpHour.reduce(
                    (total, { experience }) => total + experience,
                    0,
                  ),
                )
              : "N/A"}
          </CardTitle>
        </CardHeader>
        {variant.xpHour?.length > 0 ? (
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            {(variant.xpHour || []).map(({ skill, experience }) => (
              <Badge size="lg" key={skill} variant="secondary">
                <img
                  src={getUrlByType(skill) ?? ""}
                  alt={`${skill.toLowerCase()}_icon`}
                  title={skill}
                />
                {formatNumber(experience)}
              </Badge>
            ))}
          </CardFooter>
        ) : null}
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>AFKiness</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {variant.afkiness !== undefined ? `${variant.afkiness}%` : "N/A"}
          </CardTitle>
        </CardHeader>
        {variant.clickIntensity && (
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              <IconClick className="size-4" />
              {variant.clickIntensity ?? "N/A"} clicks/hr
            </div>
          </CardFooter>
        )}
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <span>Market impact</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help text-muted-foreground">
                  <IconInfoCircle className="size-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent
                sideOffset={6}
                className="w-max max-w-[360px] whitespace-normal break-words text-wrap text-left"
              >
                <p className="m-0">
                  {
                    "% De impacto comparando del valumen de cada item entre la cantidad de cada uno en base a 1 hora. Para mas informacion visita la "
                  }
                  <Link to="/wiki" className="underline font-medium">
                    wiki
                  </Link>
                  {"."}
                </p>
              </TooltipContent>
            </Tooltip>
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div>Patient: {formatLiquidityScore(variant.marketImpactSlow)}</div>
          <div className="text-muted-foreground">
            Instant: {formatLiquidityScore(variant.marketImpactInstant)}
          </div>
        </CardFooter>
      </Card>
    </div>
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
  const displayTotal =
    showWeights && !isLoading ? Math.round(enabledTotalCoins) : total;

  return (
    <div className="flex-1 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 text-sm font-semibold">
          <h3>{title}</h3>
          <span className="text-xs font-normal text-muted-foreground">
            {typeof displayTotal === "number"
              ? `(${formatNumber(displayTotal)} gp)`
              : isLoading
                ? null
                : "(N/A)"}
          </span>
          {isLoading ? <Skeleton className="h-3 w-24" /> : null}
        </div>

        <label className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
          <Switch checked={showWeights} onCheckedChange={setShowWeights} />
          view weights
        </label>
      </div>
      <div className="min-h-14 w-full rounded-md bg-[#494034] p-4 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
        <div
          className={
            showWeights && !isLoading
              ? "grid grid-cols-[2rem_max-content_minmax(0,1fr)_1.25rem] items-center gap-x-1.5 gap-y-2"
              : "flex flex-start flex-wrap gap-1"
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
                : "text-white";
              const barClassName = entry.isDisabled
                ? "bg-[#a49f94]"
                : "bg-[#f2c94c]";

              return (
                <Fragment key={`${title}-weight-${entry.rowKey}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "relative grid h-8 w-8 place-items-center",
                          rowMutedClass,
                        )}
                      >
                        <figure className="grid h-full w-full place-items-center">
                          <img
                            src={entry.item.iconUrl}
                            alt={entry.item.name}
                            className="max-h-full max-w-full object-contain drop-shadow-[1px_1px_0_#333333] [image-rendering:pixelated]"
                          />
                        </figure>

                        {entry.entry.quantity > 0 ? (
                          <OsrsQuantitySprite
                            text={quantityDisplay.label}
                            color={quantityDisplay.color}
                            scale={1}
                            className="pointer-events-none absolute top-0 left-[2px]"
                          />
                        ) : null}
                      </div>
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
                        <div className="h-3 w-full overflow-hidden rounded-full bg-black/35">
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
                    className="justify-self-end size-3.5 cursor-pointer accent-[#f2c94c]"
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
  const hasRequirementProgression = Boolean(
    variant.requirements?.levels?.length ||
    variant.requirements?.quests?.length ||
    variant.requirements?.achievement_diaries?.length,
  );
  const requirementItems = variant.requirements?.items ?? [];
  const hasRequirementItems = requirementItems.length > 0;

  const recommendation = variant.recommendations;
  const hasRecommendationProgression = Boolean(
    recommendation?.levels?.length ||
    recommendation?.quests?.length ||
    recommendation?.achievement_diaries?.length,
  );
  const recommendationItems = recommendation?.items ?? [];
  const hasRecommendationItems = recommendationItems.length > 0;
  const showRecommendationsColumn = Boolean(
    recommendation && (hasRecommendationProgression || hasRecommendationItems),
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <section className="space-y-3">
        <div className="space-y-2">
          <h3 className="text-base font-semibold tracking-tight">
            Requirements
          </h3>
        </div>

        {hasRequirementProgression ? (
          <div className="flex flex-wrap gap-2">
            <LevelsAndQuestBadges requirement={variant.requirements} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No progression requirements.
          </p>
        )}

        {hasRequirementItems ? (
          <OsrsItemsContainer
            items={requirementItems}
            itemsMap={itemsMap}
            isLoading={isItemsLoading}
            tooltipKeyPrefix="requirements"
            showAdvancedDetails={showAdvancedDetails}
            onToggleAdvancedDetails={onToggleAdvancedDetails}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No required items.</p>
        )}
      </section>

      <section className="space-y-3">
        <div className="space-y-2">
          <h3 className="text-base font-semibold tracking-tight">
            Recommendations
          </h3>
        </div>

        {showRecommendationsColumn ? (
          <>
            {hasRecommendationProgression ? (
              <div className="flex flex-wrap gap-2">
                <LevelsAndQuestBadges requirement={recommendation} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No progression recommendations.
              </p>
            )}

            {hasRecommendationItems ? (
              <OsrsItemsContainer
                items={recommendationItems}
                itemsMap={itemsMap}
                isLoading={isItemsLoading}
                tooltipKeyPrefix="recommendations"
                showAdvancedDetails={showAdvancedDetails}
                onToggleAdvancedDetails={onToggleAdvancedDetails}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No recommended items.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            This variant has no recommendations configured.
          </p>
        )}
      </section>
    </div>
  );
}

export function MethodVariantContent({
  variant,
  itemsMap,
  username,
  inputsTotal,
  outputsTotal,
  isItemsLoading = false,
}: MethodVariantContentProps) {
  const [showAdvancedItemDetails, setShowAdvancedItemDetails] = useState(false);
  const toggleAdvancedItemDetails = () =>
    setShowAdvancedItemDetails((current) => !current);
  const shouldShowIoSideBySideOnMobile =
    variant.inputs.length < 8 && variant.outputs.length < 8;

  return (
    <div className="w-full space-y-8">
      <MissingRequirementsNotice variant={variant} username={username} />

      <section className="rounded-md border border-gray-300 bg-gray-200 p-5 dark:border-gray-700 dark:bg-gray-800">
        <Markdown content={variant.description} items={itemsMap} />
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Inputs and Outputs
          </h2>
        </div>
        <Separator className="bg-border/80" />

        <div
          className={cn(
            "grid gap-6",
            shouldShowIoSideBySideOnMobile
              ? "grid-cols-2"
              : "grid-cols-1 xl:grid-cols-2",
          )}
        >
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
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          {/* <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Access Setup
          </p> */}
          <h2 className="text-xl font-semibold tracking-tight">
            Requirements and Recommendations
          </h2>
          {/* <p className="text-sm text-muted-foreground">
            Mandatory prerequisites first, optional improvements second.
          </p> */}
        </div>
        <Separator className="bg-border/80" />

        <RequirementsAndRecommendationsSection
          variant={variant}
          itemsMap={itemsMap}
          isItemsLoading={isItemsLoading}
          showAdvancedDetails={showAdvancedItemDetails}
          onToggleAdvancedDetails={toggleAdvancedItemDetails}
        />
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            History profits
          </h2>
        </div>
        <Separator className="bg-border/80" />
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
        ) : null}
      </section>
    </div>
  );
}
