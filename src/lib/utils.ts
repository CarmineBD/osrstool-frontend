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
    achivement_diaries:
      "https://oldschool.runescape.wiki/images/thumb/Achievement_Diaries.png/25px-Quests.png?f5120",
    quests:
      "https://oldschool.runescape.wiki/images/thumb/Quests.png/25px-Quests.png?f5120",
    combat:
      "https://oldschool.runescape.wiki/images/Attack_style_icon.png?ceb2e",
  };

  return map[type.toLowerCase()] ?? null;
}

// export function getAchivementDiaryStageByLevel(id: number): string | null {
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
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "") + "b";
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "m";
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(2).replace(/\.?0+$/, "") + "k";
  } else {
    return num.toString();
  }
}
