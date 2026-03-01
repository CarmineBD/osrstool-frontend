import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getUrlByType(type: string): string | null {
  const map: Record<string, string> = {
    attack: "https://oldschool.runescape.wiki/images/Attack_icon.png?b4bce",
    strength: "https://oldschool.runescape.wiki/images/Strength_icon.png?b4bce",
    defence: "https://oldschool.runescape.wiki/images/Defence_icon.png?ca0cd",
    hitpoints:
      "https://oldschool.runescape.wiki/images/Hitpoints_icon.png?b4bce",
    ranged: "https://oldschool.runescape.wiki/images/Ranged_icon.png?b4bce",
    magic: "https://oldschool.runescape.wiki/images/Magic_icon.png?b4bce",
    runecraft:
      "https://oldschool.runescape.wiki/images/Runecraft_icon.png?b4bce",
    prayer: "https://oldschool.runescape.wiki/images/Prayer_icon.png?b4bce",
    agility: "https://oldschool.runescape.wiki/images/Agility_icon.png?b4bce",
    herblore: "https://oldschool.runescape.wiki/images/Herblore_icon.png?b4bce",
    thieving: "https://oldschool.runescape.wiki/images/Thieving_icon.png?b4bce",
    crafting: "https://oldschool.runescape.wiki/images/Crafting_icon.png?b4bce",
    fletching:
      "https://oldschool.runescape.wiki/images/Fletching_icon.png?b4bce",
    slayer: "https://oldschool.runescape.wiki/images/Slayer_icon.png?b4bce",
    mining: "https://oldschool.runescape.wiki/images/Mining_icon.png?b4bce",
    smithing: "https://oldschool.runescape.wiki/images/Smithing_icon.png?b4bce",
    fishing: "https://oldschool.runescape.wiki/images/Fishing_icon.png?b4bce",
    cooking: "https://oldschool.runescape.wiki/images/Cooking_icon.png?b4bce",
    firemaking:
      "https://oldschool.runescape.wiki/images/Firemaking_icon.png?b4bce",
    woodcutting:
      "https://oldschool.runescape.wiki/images/Woodcutting_icon.png?b4bce",
    construction:
      "https://oldschool.runescape.wiki/images/Construction_icon.png?b4bce",
    hunter: "https://oldschool.runescape.wiki/images/Hunter_icon.png?b4bce",
    farming: "https://oldschool.runescape.wiki/images/Farming_icon.png?b4bce",
    sailing: "https://oldschool.runescape.wiki/images/Sailing_icon.png?b4bce",
    achievement_diaries:
      "https://oldschool.runescape.wiki/images/thumb/Achievement_Diaries.png/25px-Quests.png?f5120",
    quests:
      "https://oldschool.runescape.wiki/images/thumb/Quests.png/25px-Quests.png?f5120",
    combat:
      "https://oldschool.runescape.wiki/images/Attack_style_icon.png?ceb2e",
  };

  return map[type.toLowerCase()] ?? null;
}

// export function getAchievementDiaryStageByLevel(id: number): string | null {
//   const map: Record<number, string> = {
//     1: "Easy",
//     2: "Medium",
//     3: "Hard",
//     4: "Elite",
//   };

//   return map[id] ?? null;
// }

export function getQuestStageByLevel(id: number): string | null {
  const map: Record<number, string> = {
    0: "Started",
    1: "Medium",
    3: "Hard",
  };

  return map[id] ?? null;
}

// utils/formatNumber.ts

export function formatNumber(num: number): string {
  const sign = num < 0 ? "-" : "";
  const absNum = Math.abs(num);

  if (absNum >= 1_000_000_000) {
    return (
      sign + (absNum / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "") + "b"
    );
  } else if (absNum >= 1_000_000) {
    return sign + (absNum / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "m";
  } else if (absNum >= 1_000) {
    return sign + (absNum / 1_000).toFixed(2).replace(/\.?0+$/, "") + "k";
  } else {
    return sign + absNum.toString();
  }
}

export function formatPercent(num: number, decimals = 1): string {
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(decimals)}%`;
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;
const SECONDS_PER_MONTH = 30 * SECONDS_PER_DAY;
const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

function formatAgo(
  primaryValue: number,
  primaryUnit: string,
  secondaryValue: number,
  secondaryUnit: string,
): string {
  return `${primaryValue}${primaryUnit} ${secondaryValue}${secondaryUnit} ago`;
}

function normalizeUnixTimestampToMs(
  unixTimestamp: number,
  nowMs: number,
): number {
  const asMilliseconds = Math.trunc(unixTimestamp);
  const asSeconds = Math.trunc(unixTimestamp * 1000);

  const millisecondsDistance = Math.abs(nowMs - asMilliseconds);
  const secondsDistance = Math.abs(nowMs - asSeconds);

  return secondsDistance < millisecondsDistance ? asSeconds : asMilliseconds;
}

export function formatElapsedTimeFromUnix(
  unixTimestamp: number,
  nowMs = Date.now(),
): string {
  if (!Number.isFinite(unixTimestamp)) {
    return "just now";
  }

  const normalizedTimestampMs = normalizeUnixTimestampToMs(
    unixTimestamp,
    nowMs,
  );
  const elapsedSeconds = Math.max(
    0,
    Math.floor((nowMs - normalizedTimestampMs) / 1000),
  );

  if (elapsedSeconds === 0) {
    return "just now";
  }

  if (elapsedSeconds < SECONDS_PER_HOUR) {
    const minutes = Math.floor(elapsedSeconds / SECONDS_PER_MINUTE);
    const seconds = elapsedSeconds % SECONDS_PER_MINUTE;
    return formatAgo(minutes, "m", seconds, "s");
  }

  if (elapsedSeconds < SECONDS_PER_DAY) {
    const hours = Math.floor(elapsedSeconds / SECONDS_PER_HOUR);
    const minutes = Math.floor(
      (elapsedSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE,
    );
    return formatAgo(hours, "h", minutes, "m");
  }

  if (elapsedSeconds < SECONDS_PER_WEEK) {
    const days = Math.floor(elapsedSeconds / SECONDS_PER_DAY);
    const hours = Math.floor(
      (elapsedSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR,
    );
    return formatAgo(days, "d", hours, "h");
  }

  if (elapsedSeconds < SECONDS_PER_MONTH) {
    const weeks = Math.floor(elapsedSeconds / SECONDS_PER_WEEK);
    const days = Math.floor(
      (elapsedSeconds % SECONDS_PER_WEEK) / SECONDS_PER_DAY,
    );
    return formatAgo(weeks, "w", days, "d");
  }

  if (elapsedSeconds < SECONDS_PER_YEAR) {
    const months = Math.floor(elapsedSeconds / SECONDS_PER_MONTH);
    const weeks = Math.floor(
      (elapsedSeconds % SECONDS_PER_MONTH) / SECONDS_PER_WEEK,
    );
    return formatAgo(months, "M", weeks, "w");
  }

  const years = Math.floor(elapsedSeconds / SECONDS_PER_YEAR);
  const months = Math.floor(
    (elapsedSeconds % SECONDS_PER_YEAR) / SECONDS_PER_MONTH,
  );
  return formatAgo(years, "Y", months, "M");
}
