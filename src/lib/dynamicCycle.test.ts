import { describe, expect, it } from "vitest";
import { calculateDynamicCycleSummary } from "@/lib/dynamicCycle";

describe("calculateDynamicCycleSummary", () => {
  it("calculates cycle metrics from manual and action-based steps", () => {
    expect(
      calculateDynamicCycleSummary(
        [
          {
            name: "Wait",
            stepOrderPosition: 1,
            clicksMade: 1,
            isAfk: true,
            actionsMade: 0,
            durationTicks: 2,
          },
          {
            name: "Cook",
            stepOrderPosition: 2,
            clicksMade: 2,
            isAfk: false,
            actionsMade: 3,
          },
        ],
        4,
      ),
    ).toEqual({
      clicksPerHour: 1285,
      afkiness: 14,
      cycleTotalDurationTicks: 14,
      cyclesPerHour: 428.6,
    });
  });

  it("keeps a zero-duration step valid while leaving hourly metrics unavailable", () => {
    expect(
      calculateDynamicCycleSummary(
        [
          {
            name: "Instant",
            stepOrderPosition: 1,
            clicksMade: 0,
            isAfk: false,
            actionsMade: 0,
            durationTicks: 0,
          },
        ],
        4,
      ),
    ).toEqual({ cycleTotalDurationTicks: 0 });
  });

  it("does not calculate metrics from a duration that is not a whole game tick", () => {
    expect(
      calculateDynamicCycleSummary(
        [
          {
            name: "Invalid",
            stepOrderPosition: 1,
            clicksMade: 0,
            isAfk: false,
            actionsMade: 0,
            durationTicks: 1.5,
          },
        ],
        4,
      ),
    ).toEqual({});
  });
});
