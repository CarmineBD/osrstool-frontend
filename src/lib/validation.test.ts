import { describe, expect, it } from "vitest";
import {
  clampDecimal,
  countDecimalPlaces,
  countRequirementEntries,
  hasAtMostDecimalPlaces,
} from "@/lib/validation";

describe("validation helpers", () => {
  it("counts decimal places for plain decimal values", () => {
    expect(countDecimalPlaces(1)).toBe(0);
    expect(countDecimalPlaces(1.25)).toBe(2);
    expect(countDecimalPlaces(1.123456)).toBe(6);
  });

  it("checks decimal precision correctly", () => {
    expect(hasAtMostDecimalPlaces(1.123456, 6)).toBe(true);
    expect(hasAtMostDecimalPlaces(1.1234567, 6)).toBe(false);
  });

  it("clamps decimals to the allowed precision and range", () => {
    expect(clampDecimal(1.1234567, 0, 999_999_999, 6)).toBe(1.123456);
    expect(clampDecimal(-1, 0, 999_999_999, 6)).toBe(0);
    expect(clampDecimal(1_000_000_000, 0, 999_999_999, 6)).toBe(999_999_999);
  });

  it("counts requirement entries by supported backend buckets", () => {
    expect(
      countRequirementEntries({
        items: [{ id: 1 }],
        levels: [{ skill: "attack", level: 1 }],
        quests: [{ name: "Cook's Assistant", stage: 2 }],
        achievement_diaries: [{ name: "Lumbridge & Draynor", tier: "easy" }],
      }),
    ).toBe(4);
  });
});
