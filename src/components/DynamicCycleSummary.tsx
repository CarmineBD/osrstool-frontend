import { EDITOR_META_TEXT_CLASS } from "@/components/method-editor/MethodEditorPrimitives";
import type { DynamicCycleSummary } from "@/lib/dynamicCycle";
import {
  formatGameTickCount,
  formatGameTickSeconds,
  isWholeGameTick,
} from "@/lib/gameTicks";

function formatValue(value: number | undefined, decimals = 0): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";

  return value.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  });
}

export function DynamicCycleSummary({
  clicksPerHour,
  afkiness,
  cycleTotalDurationTicks,
  cyclesPerHour,
}: DynamicCycleSummary) {
  const hasValidDuration = isWholeGameTick(cycleTotalDurationTicks);

  return (
    <section
      aria-label="Cycle summary"
      className="rounded-lg border border-border/60 bg-muted/20 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className={EDITOR_META_TEXT_CLASS}>Clicks/hr</p>
          <p className="mt-1 font-medium tabular-nums text-foreground">
            {formatValue(clicksPerHour)}
          </p>
        </div>
        <div>
          <p className={EDITOR_META_TEXT_CLASS}>% AFK</p>
          <p className="mt-1 font-medium tabular-nums text-foreground">
            {typeof afkiness === "number" ? `${formatValue(afkiness)}%` : "N/A"}
          </p>
        </div>
        <div>
          <p className={EDITOR_META_TEXT_CLASS}>Total cycle duration</p>
          <p className="mt-1 font-medium tabular-nums text-foreground">
            {hasValidDuration
              ? `${formatGameTickSeconds(cycleTotalDurationTicks)} seconds`
              : "N/A"}
          </p>
          {hasValidDuration ? (
            <p className={EDITOR_META_TEXT_CLASS}>
              {formatGameTickCount(cycleTotalDurationTicks)}
            </p>
          ) : null}
        </div>
        <div>
          <p className={EDITOR_META_TEXT_CLASS}>Cycles/hr</p>
          <p className="mt-1 font-medium tabular-nums text-foreground">
            {formatValue(cyclesPerHour, 1)}
          </p>
        </div>
      </div>
    </section>
  );
}
