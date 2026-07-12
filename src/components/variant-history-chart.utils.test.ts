import { describe, expect, it } from "vitest";
import { getProfitChartMetrics } from "@/components/variant-history-chart.utils";

describe("getProfitChartMetrics", () => {
  it("includes min, zero, and max ticks when the visible range crosses zero", () => {
    const metrics = getProfitChartMetrics([
      { lowProfit: -1200, highProfit: 4000 },
      { lowProfit: -800, highProfit: 2500 },
    ]);

    expect(metrics.shouldShowZeroReferenceLine).toBe(true);
    expect(metrics.yTicks).toEqual([-1200, 0, 4000]);
    expect(metrics.yDomain[0]).toBeLessThan(-1200);
    expect(metrics.yDomain[1]).toBeGreaterThan(4000);
  });

  it("omits zero when all visible values stay above zero", () => {
    const metrics = getProfitChartMetrics([
      { lowProfit: 1200, highProfit: 4000 },
      { lowProfit: 1800, highProfit: 2500 },
    ]);

    expect(metrics.shouldShowZeroReferenceLine).toBe(false);
    expect(metrics.yTicks).toEqual([1200, 4000]);
  });

  it("deduplicates ticks when zero is also the min or max visible value", () => {
    const metrics = getProfitChartMetrics([
      { lowProfit: 0, highProfit: 4200 },
      { lowProfit: 300, highProfit: 3800 },
    ]);

    expect(metrics.shouldShowZeroReferenceLine).toBe(true);
    expect(metrics.yTicks).toEqual([0, 4200]);
  });
});
