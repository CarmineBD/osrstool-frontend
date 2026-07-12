export interface ProfitHistoryPointLike {
  lowProfit: number;
  highProfit: number;
}

export interface ProfitChartMetrics {
  yDomain: [number, number];
  yTicks: number[];
  shouldShowZeroReferenceLine: boolean;
}

export function getProfitChartMetrics(
  points: ProfitHistoryPointLike[],
): ProfitChartMetrics {
  if (!points.length) {
    return {
      yDomain: [0, 0],
      yTicks: [0],
      shouldShowZeroReferenceLine: false,
    };
  }

  const lows = points.map((point) => point.lowProfit);
  const highs = points.map((point) => point.highProfit);
  const minValue = Math.min(...lows, ...highs);
  const maxValue = Math.max(...lows, ...highs);
  const padding = (maxValue - minValue) * 0.1 || 1;
  const shouldShowZeroReferenceLine = minValue <= 0 && maxValue >= 0;
  const yTicks = Array.from(
    new Set([
      minValue,
      ...(shouldShowZeroReferenceLine ? [0] : []),
      maxValue,
    ]),
  ).sort((left, right) => left - right);

  return {
    yDomain: [minValue - padding, maxValue + padding],
    yTicks,
    shouldShowZeroReferenceLine,
  };
}
