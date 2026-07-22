import { Fragment, useState } from "react";
import { IconArrowsSort, IconInfoCircle } from "@tabler/icons-react";
import { AnimatedProfitValue } from "@/components/AnimatedProfitValue";
import { VariantTabLabel } from "@/components/VariantTabLabel";
import {
  EDITOR_PAGE_EYEBROW_CLASS,
  EDITOR_SECTION_TITLE_CLASS,
  EDITOR_BODY_TEXT_CLASS,
  EDITOR_META_TEXT_CLASS,
} from "@/components/method-editor/MethodEditorPrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  VARIANT_SORT_OPTIONS,
  type VariantSortMode,
} from "@/features/method-detail/variantOrdering";
import { cn, formatNumber } from "@/lib/utils";

interface MethodVariantSelectorItem {
  value: string;
  label: string;
  iconUrl?: string;
  sortMetricValue?: number;
  isNotViable: boolean;
}

interface MethodVariantSelectorProps {
  items: MethodVariantSelectorItem[];
  variantCount: number;
  sortMode: VariantSortMode;
  onSortModeChange: (value: VariantSortMode) => void;
  className?: string;
}

function renderSortMetric(
  sortMode: VariantSortMode,
  metricValue: number | undefined,
) {
  if (sortMode === "profit") {
    const isNegative = typeof metricValue === "number" && metricValue < 0;
    return (
      <AnimatedProfitValue
        value={metricValue}
        fallback="N/A"
        suffix=" gp/hr"
        className={cn(
          "justify-end text-sm font-medium",
          isNegative ? "text-destructive" : "text-foreground",
        )}
      />
    );
  }

  if (sortMode === "xp") {
    return (
      <span
        className={cn(
          "truncate text-sm font-medium",
          metricValue !== undefined ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {metricValue !== undefined ? `${formatNumber(metricValue)} xp/hr` : "N/A"}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "truncate text-sm font-medium",
        metricValue !== undefined ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {metricValue !== undefined ? `${metricValue}%` : "N/A"}
    </span>
  );
}

export function MethodVariantSelector({
  items,
  variantCount,
  sortMode,
  onSortModeChange,
  className,
}: MethodVariantSelectorProps) {
  const [isNotViableInfoOpen, setIsNotViableInfoOpen] = useState(false);
  const notViableDescription =
    "These methods have extreme market impact. Even in the best case, operating at this one-hour scale may require more than 1 day to fully buy and sell through the market.";
  const expandingPanelClassName =
    "grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out";
  const expandedPanelStateClassName =
    "lg:grid-rows-[1fr] lg:opacity-100 lg:mt-0";
  const collapsedPanelStateClassName =
    "lg:grid-rows-[0fr] lg:opacity-0 lg:mt-0";

  return (
    <aside
      className={cn(
        "min-w-0 lg:sticky lg:top-24 lg:z-40 lg:self-start lg:w-[7.5rem] lg:overflow-visible",
        className,
      )}
    >
      <div
        className={cn(
          "group/variant-selector space-y-4 rounded-xl border border-border/70 bg-card p-6 shadow-sm lg:relative lg:z-50 lg:max-h-[calc(100vh-7rem)] lg:w-[7.5rem] lg:overflow-x-hidden lg:overflow-y-hidden lg:transition-[width,box-shadow] lg:duration-200 lg:ease-out lg:hover:w-[19rem] lg:hover:overflow-y-auto lg:focus-within:w-[19rem] lg:focus-within:overflow-y-auto lg:hover:shadow-lg lg:focus-within:shadow-lg",
          isNotViableInfoOpen && "lg:w-[19rem] lg:overflow-y-auto lg:shadow-lg",
        )}
      >
        <div className="space-y-3">
          <p className={cn(EDITOR_PAGE_EYEBROW_CLASS, "block lg:hidden")}>
            Details
          </p>
          <div className="flex items-center justify-between gap-2 lg:flex-nowrap">
            <h2 className={EDITOR_SECTION_TITLE_CLASS}>Variants</h2>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                size="sm"
                className="inline-flex lg:hidden lg:group-hover/variant-selector:inline-flex lg:group-focus-within/variant-selector:inline-flex"
              >
                {variantCount} variants
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
                    aria-label="Sort variants"
                    title="Sort variants"
                  >
                    <IconArrowsSort className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-lg">
                  <DropdownMenuLabel className="pb-1">
                    Sort variants
                  </DropdownMenuLabel>
                  <p className={cn("px-2 pb-2", EDITOR_META_TEXT_CLASS)}>
                    Highest to lowest
                  </p>
                  <DropdownMenuRadioGroup
                    value={sortMode}
                    onValueChange={(value) =>
                      onSortModeChange(value as VariantSortMode)
                    }
                  >
                    {VARIANT_SORT_OPTIONS.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className={cn(EDITOR_BODY_TEXT_CLASS, "block lg:hidden")}>
            Select a variant to compare requirements, loot, metrics, and history
            without leaving the page.
          </p>
        </div>

        <TabsList
          aria-label="Method variants"
          className={cn(
            "flex h-auto w-full flex-col items-stretch gap-1 rounded-lg bg-transparent p-0 lg:items-center lg:gap-[10px] lg:group-hover/variant-selector:items-stretch lg:group-hover/variant-selector:gap-1 lg:group-focus-within/variant-selector:items-stretch lg:group-focus-within/variant-selector:gap-1",
            isNotViableInfoOpen && "lg:items-stretch",
          )}
        >
          {items.map((item, index) => {
            const showNotViableDivider =
              item.isNotViable && index > 0 && !items[index - 1]?.isNotViable;

            return (
              <Fragment key={item.value}>
                {showNotViableDivider ? (
                  <>
                    <Separator
                      className={cn(
                        "my-2 hidden bg-border/80 lg:block lg:group-hover/variant-selector:hidden lg:group-focus-within/variant-selector:hidden",
                        isNotViableInfoOpen && "lg:hidden",
                      )}
                      aria-hidden="true"
                    />
                    <div
                      className={cn(
                        "min-w-0",
                        expandingPanelClassName,
                        "grid-rows-[1fr] opacity-100",
                        "lg:group-hover/variant-selector:grid-rows-[1fr] lg:group-hover/variant-selector:opacity-100",
                        "lg:group-focus-within/variant-selector:grid-rows-[1fr] lg:group-focus-within/variant-selector:opacity-100",
                        collapsedPanelStateClassName,
                        isNotViableInfoOpen && expandedPanelStateClassName,
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="flex min-w-0 flex-nowrap items-center justify-center gap-3 py-2">
                          <Separator className="min-w-0 flex-1 bg-border/80" />
                          <div className="flex shrink-0 items-center gap-2">
                            <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Not viable
                            </p>
                            <Tooltip
                              open={isNotViableInfoOpen}
                              onOpenChange={setIsNotViableInfoOpen}
                            >
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  aria-label="Why these variants are not viable"
                                  className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                  <IconInfoCircle className="size-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                sideOffset={6}
                                className="pointer-events-none max-w-xs text-left whitespace-normal"
                              >
                                <p className="m-0">{notViableDescription}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Separator className="min-w-0 flex-1 bg-border/80" />
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
                <TabsTrigger
                  value={item.value}
                  className={cn(
                    "h-14 w-full justify-start px-3 py-2 text-left",
                    "lg:h-[58px] lg:w-[4.5rem] lg:self-center lg:justify-center lg:px-3 lg:py-2",
                    "lg:group-hover/variant-selector:h-14 lg:group-hover/variant-selector:w-full lg:group-hover/variant-selector:justify-start lg:group-hover/variant-selector:px-3 lg:group-hover/variant-selector:py-2",
                    "lg:group-focus-within/variant-selector:h-14 lg:group-focus-within/variant-selector:w-full lg:group-focus-within/variant-selector:justify-start lg:group-focus-within/variant-selector:px-3 lg:group-focus-within/variant-selector:py-2",
                    isNotViableInfoOpen &&
                      "lg:h-14 lg:w-full lg:justify-start lg:px-3 lg:py-2",
                    item.isNotViable &&
                      "opacity-55 [&_img]:saturate-50 data-[state=active]:opacity-100",
                    "transition-[background-color,border-color,box-shadow,opacity]",
                    "hover:border-border/60 hover:bg-background/60 hover:shadow-sm",
                    "focus-visible:border-border/70 focus-visible:bg-background/60 focus-visible:shadow-sm",
                    "data-[state=active]:border-border/70 data-[state=active]:bg-background",
                  )}
                >
                  <VariantTabLabel
                    label={item.label}
                    iconUrl={item.iconUrl}
                    iconAlt={`${item.label} icon`}
                    className={cn(
                      "lg:w-auto lg:justify-center lg:group-hover/variant-selector:w-full lg:group-hover/variant-selector:justify-between lg:group-focus-within/variant-selector:w-full lg:group-focus-within/variant-selector:justify-between",
                      isNotViableInfoOpen && "lg:w-full lg:justify-between",
                    )}
                    labelClassName={cn(
                      "inline lg:hidden lg:group-hover/variant-selector:inline lg:group-focus-within/variant-selector:inline",
                      isNotViableInfoOpen && "lg:inline",
                    )}
                    summary={renderSortMetric(sortMode, item.sortMetricValue)}
                    summaryClassName={cn(
                      "flex lg:hidden lg:group-hover/variant-selector:flex lg:group-focus-within/variant-selector:flex",
                      isNotViableInfoOpen && "lg:flex",
                    )}
                  />
                </TabsTrigger>
              </Fragment>
            );
          })}
        </TabsList>

        <div
          className={cn(
            expandingPanelClassName,
            "grid-rows-[1fr] opacity-100 lg:grid-rows-[0fr] lg:opacity-0",
            "lg:group-hover/variant-selector:grid-rows-[1fr] lg:group-hover/variant-selector:opacity-100",
            "lg:group-focus-within/variant-selector:grid-rows-[1fr] lg:group-focus-within/variant-selector:opacity-100",
            isNotViableInfoOpen && expandedPanelStateClassName,
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-3 pt-1 lg:pt-0">
              <p className={EDITOR_PAGE_EYEBROW_CLASS}>Details</p>
              <p className={EDITOR_BODY_TEXT_CLASS}>
                Select a variant to compare requirements, loot, metrics, and
                history without leaving the page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
