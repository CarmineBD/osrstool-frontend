import type { Variant } from "@/lib/api";
import { getVariantTags } from "@/lib/variantTags";

export interface OrderedVariantEntry {
  variant: Variant;
  originalIndex: number;
  isNotViable: boolean;
}

function getNotViableTag(variant: Variant) {
  return getVariantTags(variant).find(
    (tag) => tag.label.trim().toLowerCase() === "not viable",
  );
}

function getSortableHighProfit(variant: Variant): number {
  return typeof variant.highProfit === "number" && Number.isFinite(variant.highProfit)
    ? variant.highProfit
    : Number.NEGATIVE_INFINITY;
}

export function getOrderedVariants(variants: Variant[]): OrderedVariantEntry[] {
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
