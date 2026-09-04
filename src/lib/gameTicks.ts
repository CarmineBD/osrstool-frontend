export const GAME_TICK_SECONDS = 0.6;
export const TICKS_PER_HOUR = 6_000;

export function secondsToGameTicks(seconds: number): number | undefined {
  if (!Number.isFinite(seconds)) return undefined;

  const rawTicks = seconds / GAME_TICK_SECONDS;
  const roundedTicks = Math.round(rawTicks);
  return Math.abs(rawTicks - roundedTicks) < 1e-9 ? roundedTicks : rawTicks;
}

export function isWholeGameTick(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isInteger(value);
}

export function formatGameTickSeconds(
  ticks: number | null | undefined,
): string {
  if (typeof ticks !== "number" || !Number.isFinite(ticks)) return "";

  return String(Math.round(ticks * GAME_TICK_SECONDS * 1_000_000) / 1_000_000);
}

export function formatGameTickCount(ticks: number | null | undefined): string {
  if (typeof ticks !== "number" || !Number.isFinite(ticks)) return "—";
  return `${ticks} ${Math.abs(ticks) === 1 ? "tick" : "ticks"}`;
}
