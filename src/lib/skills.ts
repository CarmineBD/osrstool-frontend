export const OSRS_SKILLS = [
  "attack",
  "strength",
  "defence",
  "hitpoints",
  "ranged",
  "prayer",
  "magic",
  "cooking",
  "woodcutting",
  "fletching",
  "fishing",
  "firemaking",
  "crafting",
  "smithing",
  "mining",
  "herblore",
  "agility",
  "thieving",
  "slayer",
  "farming",
  "runecraft",
  "hunter",
  "construction",
  "sailing",
] as const;

export type OsrsSkill = (typeof OSRS_SKILLS)[number];

export function isOsrsSkill(value: string): value is OsrsSkill {
  return OSRS_SKILLS.includes(value as OsrsSkill);
}

export function formatSkillName(skill: string): string {
  if (!skill) return "";
  return skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase();
}

