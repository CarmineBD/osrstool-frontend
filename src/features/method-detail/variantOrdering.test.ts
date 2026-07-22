import { describe, expect, it } from "vitest";
import type { Variant } from "@/lib/api";
import {
  getOrderedVariants,
  getVariantSortMetricValue,
  getVariantXpTotal,
} from "./variantOrdering";

function buildVariant(overrides: Partial<Variant> & Pick<Variant, "label">): Variant {
  const { label, ...rest } = overrides;
  return {
    label,
    members: false,
    xpHour: [],
    requirements: {},
    inputs: [],
    outputs: [],
    ...rest,
  };
}

describe("variantOrdering", () => {
  const variants: Variant[] = [
    buildVariant({
      label: "Profit route",
      highProfit: 450000,
      afkiness: 20,
      xpHour: [{ skill: "Cooking", experience: 25000 }],
    }),
    buildVariant({
      label: "Training route",
      highProfit: 175000,
      afkiness: 55,
      xpHour: [
        { skill: "Magic", experience: 30000 },
        { skill: "Hitpoints", experience: 12000 },
      ],
    }),
    buildVariant({
      label: "Idle route",
      highProfit: 120000,
      afkiness: 75,
      xpHour: [{ skill: "Fishing", experience: 18000 }],
    }),
    buildVariant({
      label: "Not viable route",
      highProfit: 999999,
      afkiness: 90,
      xpHour: [{ skill: "Smithing", experience: 60000 }],
      tags: [{ label: "Not viable" }],
    }),
    buildVariant({
      label: "Unknown afk route",
      highProfit: 160000,
      xpHour: [{ skill: "Mining", experience: 9000 }],
    }),
  ];

  it("sorts viable variants by profit descending and keeps not viable last", () => {
    expect(getOrderedVariants(variants, "profit").map(({ variant }) => variant.label)).toEqual([
      "Profit route",
      "Training route",
      "Unknown afk route",
      "Idle route",
      "Not viable route",
    ]);
  });

  it("sorts by total xp across all skills", () => {
    expect(getVariantXpTotal(variants[1])).toBe(42000);
    expect(getOrderedVariants(variants, "xp").map(({ variant }) => variant.label)).toEqual([
      "Training route",
      "Profit route",
      "Idle route",
      "Unknown afk route",
      "Not viable route",
    ]);
  });

  it("sorts by afk descending and places missing afk values after defined ones", () => {
    expect(getOrderedVariants(variants, "afk").map(({ variant }) => variant.label)).toEqual([
      "Idle route",
      "Training route",
      "Profit route",
      "Unknown afk route",
      "Not viable route",
    ]);
  });

  it("returns the metric used for the selected sort mode", () => {
    expect(getVariantSortMetricValue(variants[0], "profit")).toBe(450000);
    expect(getVariantSortMetricValue(variants[1], "xp")).toBe(42000);
    expect(getVariantSortMetricValue(variants[2], "afk")).toBe(75);
  });
});
