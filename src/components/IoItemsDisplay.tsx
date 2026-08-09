import { Fragment, useEffect, useMemo, useState } from "react";
import {
  formatOsrsItemQuantity,
  OsrsItemSprite,
  OSRS_ITEM_TRAY_BAR_ACTIVE_CLASS,
  OSRS_ITEM_TRAY_BAR_MUTED_CLASS,
  OSRS_ITEM_TRAY_CLASS,
  OSRS_ITEM_TRAY_TEXT_CLASS,
} from "@/components/OsrsItemTray";
import { EDITOR_META_TEXT_CLASS } from "@/components/method-editor/MethodEditorPrimitives";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { IoItem, Item } from "@/lib/api";
import { cn, formatElapsedTimeFromUnix, formatNumber } from "@/lib/utils";

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
          <ItemTooltipToggleButton expanded onClick={onToggleAdvancedDetails} />
        </>
      )}
    </div>
  );
}

export type WeightPriceMode = "input" | "output";

function getWeightPrice(item: Item, mode: WeightPriceMode): number {
  if (mode === "input") {
    return item.lowPrice ?? 0;
  }
  return item.highPrice ?? 0;
}

function OsrsItemsIcons({
  items,
  itemsMap,
  tooltipKeyPrefix,
  showAdvancedDetails,
  onToggleAdvancedDetails,
}: {
  items: IoItem[];
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
        const quantityDisplay = formatOsrsItemQuantity(entry.quantity);
        return (
          <Tooltip key={`${tooltipKeyPrefix}-${entry.id}`}>
            <TooltipTrigger asChild>
              <OsrsItemSprite
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

export function OsrsItemsContainer({
  items,
  itemsMap,
  isLoading = false,
  tooltipKeyPrefix,
  showAdvancedDetails,
  onToggleAdvancedDetails,
}: {
  items: IoItem[];
  itemsMap: Record<number, Item>;
  isLoading?: boolean;
  tooltipKeyPrefix: string;
  showAdvancedDetails: boolean;
  onToggleAdvancedDetails: () => void;
}) {
  return (
    <div className={OSRS_ITEM_TRAY_CLASS}>
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

export function IoItemsGrid({
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
  items: IoItem[];
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

    const totalCoins = withValues.reduce(
      (sum, entry) =>
        disabledRowKeys[entry.rowKey] ? sum : sum + entry.totalCoins,
      0,
    );

    const sortedItems = withValues
      .map((entry) => ({
        ...entry,
        isDisabled: Boolean(disabledRowKeys[entry.rowKey]),
        weightPercent:
          !disabledRowKeys[entry.rowKey] && totalCoins > 0
            ? (entry.totalCoins / totalCoins) * 100
            : 0,
      }))
      .sort((a, b) => b.totalCoins - a.totalCoins);

    return { weightedItems: sortedItems, enabledTotalCoins: totalCoins };
  }, [items, itemsMap, weightPriceMode, disabledRowKeys]);

  useEffect(() => {
    if (!canShowWeights) {
      setShowWeights(false);
    }
  }, [canShowWeights]);

  const displayTotal =
    showWeights && !isLoading ? Math.round(enabledTotalCoins) : total;

  return (
    <div className="flex flex-1 flex-col justify-between space-y-3">
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
          <label
            className={cn("flex items-center gap-2", EDITOR_META_TEXT_CLASS)}
          >
            <Switch checked={showWeights} onCheckedChange={setShowWeights} />
            View weights
          </label>
        ) : null}
      </div>
      <div className={OSRS_ITEM_TRAY_CLASS}>
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
              const quantityDisplay = formatOsrsItemQuantity(
                entry.entry.quantity,
              );
              const reasonLabel = entry.entry.reason?.trim();
              const roundedTotalCoins = Math.round(entry.totalCoins);
              const showExactCoinsTitle = roundedTotalCoins > 999;
              const rowMutedClass = entry.isDisabled
                ? "opacity-45 saturate-0"
                : "";
              const numberClassName = entry.isDisabled
                ? "text-muted-foreground"
                : OSRS_ITEM_TRAY_TEXT_CLASS;
              const barClassName = entry.isDisabled
                ? OSRS_ITEM_TRAY_BAR_MUTED_CLASS
                : OSRS_ITEM_TRAY_BAR_ACTIVE_CLASS;

              return (
                <Fragment key={`${title}-weight-${entry.rowKey}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <OsrsItemSprite
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
                        <div className="h-3 w-full overflow-hidden rounded-full bg-foreground/20">
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
