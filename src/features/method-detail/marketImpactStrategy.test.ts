import { describe, expect, it } from "vitest";
import {
  formatImpactPercent,
  getStrategyRecommendation,
} from "./marketImpactStrategy";

describe("marketImpactStrategy", () => {
  it("recommends instant input buying when it has lower impact", () => {
    const recommendation = getStrategyRecommendation(
      "inputs",
      0.4298422333404345,
      1.4274046057434544,
    );

    expect(recommendation).toMatchObject({
      label: "Buy inputs instantly",
      preferredMode: "instant",
      alternativeMode: "slow",
      isTie: false,
      summary:
        "Instant buying is better here because it has the lower market impact.",
    });
    expect(formatImpactPercent(recommendation?.preferredPercent ?? 0)).toBe(
      "43%",
    );
    expect(formatImpactPercent(recommendation?.alternativePercent ?? 0)).toBe(
      "142.7%",
    );
  });

  it("recommends slow output selling when it has lower impact", () => {
    const recommendation = getStrategyRecommendation(
      "outputs",
      7.442439327940261,
      1.9630156472261735,
    );

    expect(recommendation).toMatchObject({
      label: "Sell outputs slowly",
      preferredMode: "slow",
      alternativeMode: "instant",
      isTie: false,
      summary:
        "Slow selling is better here because it has the lower market impact.",
    });
    expect(formatImpactPercent(recommendation?.preferredPercent ?? 0)).toBe(
      "196.3%",
    );
    expect(formatImpactPercent(recommendation?.alternativePercent ?? 0)).toBe(
      "744.2%",
    );
  });
});
