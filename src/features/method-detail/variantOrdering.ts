import type { Variant } from "@/lib/api";
import { getVariantTags } from "@/lib/variantTags";

export interface OrderedVariantEntry {
  variant: Variant;
  originalIndex: number;
  isNotViable: boolean;
}

export type VariantSortMode = "profit" | "xp" | "afk";

export const DEFAULT_VARIANT_SORT_MODE: VariantSortMode = "profit";

export const VARIANT_SORT_OPTIONS: Array<{
  value: VariantSortMode;
  label: string;
}> = [
  { value: "profit", label: "By profit" },
  { value: "xp", label: "By xp" },
  { value: "afk", label: "By afk %" },
];

function getNotViableTag(variant: Variant) {
  return getVariantTags(variant).find(
    (tag) => tag.label.trim().toLowerCase() === "not viable",
  );
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function getVariantXpTotal(variant: Variant): number {
  return (variant.xpHour ?? []).reduce((total, entry) => {
    const experience = entry?.experience;
    return isFiniteNumber(experience) ? total + experience : total;
  }, 0);
}

export function getVariantSortMetricValue(
  variant: Variant,
  sortMode: VariantSortMode,
): number | undefined {
  if (sortMode === "xp") {
    return getVariantXpTotal(variant);
  }

  if (sortMode === "afk") {
    return isFiniteNumber(variant.afkiness) ? variant.afkiness : undefined;
  }

  return isFiniteNumber(variant.highProfit) ? variant.highProfit : undefined;
}

function getSortableMetricValue(
  variant: Variant,
  sortMode: VariantSortMode,
): number {
  const metricValue = getVariantSortMetricValue(variant, sortMode);
  return metricValue !== undefined ? metricValue : Number.NEGATIVE_INFINITY;
}

export function getOrderedVariants(
  variants: Variant[],
  sortMode: VariantSortMode = DEFAULT_VARIANT_SORT_MODE,
): OrderedVariantEntry[] {
  return variants
    .map((variant, originalIndex) => {
      const notViableTag = getNotViableTag(variant);
      return {
        variant,
        originalIndex,
        isNotViable: Boolean(notViableTag),
      };
    })
    .sort((left, right) => {
      if (left.isNotViable !== right.isNotViable) {
        return left.isNotViable ? 1 : -1;
      }

      const highProfitDifference =
        getSortableHighProfit(right.variant) - getSortableHighProfit(left.variant);
      if (highProfitDifference !== 0) {
        return highProfitDifference;
      }

      return left.originalIndex - right.originalIndex;
    });
}
