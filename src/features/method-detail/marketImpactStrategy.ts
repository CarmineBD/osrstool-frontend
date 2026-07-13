export type StrategySubject = "inputs" | "outputs";
export type StrategyMode = "instant" | "slow";

export interface StrategyRecommendation {
  label: string;
  preferredMode: StrategyMode;
  preferredPercent: number;
  alternativeMode: StrategyMode;
  alternativePercent: number;
  summary: string;
  isTie: boolean;
}

function getMarketImpactPercent(score?: number): number | null {
  if (typeof score !== "number") return null;
  return score * 100;
}

export function formatImpactPercent(value: number): string {
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

function getStrategyActionLabel(
  subject: StrategySubject,
  mode: StrategyMode | "either",
): string {
  const action = subject === "inputs" ? "Buy inputs" : "Sell outputs";

  if (mode === "either") {
    return `${action} instantly or slowly`;
  }

  return `${action} ${mode === "instant" ? "instantly" : "slowly"}`;
}

export function getStrategyRecommendation(
  subject: StrategySubject,
  instantScore?: number,
  slowScore?: number,
): StrategyRecommendation | null {
  const instantPercent = getMarketImpactPercent(instantScore);
  const slowPercent = getMarketImpactPercent(slowScore);

  if (instantPercent === null || slowPercent === null) {
    return null;
  }

  const subjectAction = subject === "inputs" ? "buying" : "selling";
  const isTie = instantPercent === slowPercent;

  if (isTie) {
    return {
      label: getStrategyActionLabel(subject, "either"),
      preferredMode: "instant",
      preferredPercent: instantPercent,
      alternativeMode: "slow",
      alternativePercent: slowPercent,
      summary: `Instant and slow ${subjectAction} have the same market impact for this variant.`,
      isTie: true,
    };
  }

  const preferredMode = instantPercent < slowPercent ? "instant" : "slow";
  const alternativeMode = preferredMode === "instant" ? "slow" : "instant";
  const preferredPercent =
    preferredMode === "instant" ? instantPercent : slowPercent;
  const alternativePercent =
    alternativeMode === "instant" ? instantPercent : slowPercent;

  return {
    label: getStrategyActionLabel(subject, preferredMode),
    preferredMode,
    preferredPercent,
    alternativeMode,
    alternativePercent,
    summary: `${preferredMode === "instant" ? "Instant" : "Slow"} ${subjectAction} is better here because it has the lower market impact.`,
    isTie: false,
  };
}
