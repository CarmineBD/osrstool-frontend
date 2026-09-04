import type { DynamicCycleStep } from "@/lib/api";
import { TICKS_PER_HOUR } from "@/lib/gameTicks";

export interface DynamicCycleSummary {
  clicksPerHour?: number;
  afkiness?: number;
  cycleTotalDurationTicks?: number;
  cyclesPerHour?: number;
}

interface ResolvedCycleStep {
  clicksMade: number;
  durationTicks: number;
  isAfk: boolean;
}

export function calculateDynamicCycleSummary(
  steps: DynamicCycleStep[],
  rollIntervalTicks: number | undefined,
): DynamicCycleSummary {
  const resolvedSteps: ResolvedCycleStep[] = [];

  for (const step of steps) {
    if (
      !Number.isSafeInteger(step.clicksMade) ||
      step.clicksMade < 0 ||
      typeof step.isAfk !== "boolean"
    ) {
      return {};
    }

    const actionsMade = step.actionsMade ?? 0;
    if (!Number.isSafeInteger(actionsMade) || actionsMade < 0) {
      return {};
    }

    let durationTicks: number;
    if (actionsMade > 0) {
      if (
        typeof rollIntervalTicks !== "number" ||
        !Number.isSafeInteger(rollIntervalTicks) ||
        rollIntervalTicks <= 0
      ) {
        return {};
      }
      durationTicks = actionsMade * rollIntervalTicks;
    } else {
      const manualDurationTicks = step.durationTicks;
      if (
        typeof manualDurationTicks !== "number" ||
        !Number.isSafeInteger(manualDurationTicks) ||
        manualDurationTicks < 0
      ) {
        return {};
      }
      durationTicks = manualDurationTicks;
    }

    resolvedSteps.push({
      clicksMade: step.clicksMade,
      durationTicks,
      isAfk: step.isAfk,
    });
  }

  const cycleTotalDurationTicks = resolvedSteps.reduce(
    (total, step) => total + step.durationTicks,
    0,
  );
  if (cycleTotalDurationTicks <= 0) {
    return { cycleTotalDurationTicks };
  }

  const exactCyclesPerHour = TICKS_PER_HOUR / cycleTotalDurationTicks;
  const clicksPerHour = Math.floor(
    resolvedSteps.reduce((total, step) => total + step.clicksMade, 0) *
      exactCyclesPerHour,
  );
  const afkTicks = resolvedSteps.reduce(
    (total, step) => total + (step.isAfk ? step.durationTicks : 0),
    0,
  );

  return {
    clicksPerHour,
    afkiness: Math.floor((afkTicks / cycleTotalDurationTicks) * 100),
    cycleTotalDurationTicks,
    cyclesPerHour:
      Math.round((exactCyclesPerHour + Number.EPSILON) * 10) / 10,
  };
}
