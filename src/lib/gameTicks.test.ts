import { describe, expect, it } from "vitest";
import {
  formatGameTickCount,
  formatGameTickSeconds,
  isWholeGameTick,
  secondsToGameTicks,
} from "@/lib/gameTicks";

describe("game tick helpers", () => {
  it("converts exact game-tick durations between seconds and ticks", () => {
    expect(secondsToGameTicks(2.4)).toBe(4);
    expect(formatGameTickSeconds(4)).toBe("2.4");
    expect(formatGameTickCount(1)).toBe("1 tick");
    expect(formatGameTickCount(4)).toBe("4 ticks");
  });

  it("keeps non-divisible seconds fractional so the form can reject them", () => {
    const ticks = secondsToGameTicks(0.5);

    expect(ticks).toBeCloseTo(0.8333333333);
    expect(isWholeGameTick(ticks)).toBe(false);
  });
});
