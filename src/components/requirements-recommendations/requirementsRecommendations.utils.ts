import type { ItemSearchResponse } from "@/lib/api";
import type {
  DiaryTier,
  EntryRequirementType,
  RecommendationPayload,
  RequirementPayload,
  StageRequirement,
  UnifiedAchievementDiaryEntry,
  UnifiedEntry,
  UnifiedItemEntry,
  UnifiedQuestEntry,
  UnifiedSkillEntry,
} from "@/components/requirements-recommendations/requirementsRecommendations.types";
import {
  clampDecimal,
  clampInteger,
  MAX_COMBAT_LEVEL,
  MAX_ITEM_QUANTITY,
  MAX_ITEM_QUANTITY_DECIMAL_PLACES,
  MAX_SKILL_LEVEL,
  MIN_COMBAT_LEVEL,
  normalizeBoundedText,
  REASON_MAX_LENGTH,
} from "@/lib/validation";

export const ITEM_SEARCH_LIMIT = 5;
export const LOCAL_SEARCH_LIMIT = 5;
export const ITEM_SEARCH_DEBOUNCE_MS = 200;
export const SCROLL_BOTTOM_THRESHOLD_PX = 24;

export function hasMoreItemPages(
  response: ItemSearchResponse,
  requestedPage: number,
  limit: number
): boolean {
  const resolvedPage = response.page ?? requestedPage;
  if (response.pageCount !== undefined) {
    return resolvedPage < response.pageCount;
  }
  if (
    response.total !== undefined &&
    response.perPage !== undefined &&
    response.perPage > 0
  ) {
    return resolvedPage * response.perPage < response.total;
  }
  return response.items.length >= limit;
}

export function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function sanitizeReasonInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const singleLine = normalizeBoundedText(
    value.replace(/\r?\n|\r/g, " "),
    REASON_MAX_LENGTH,
  );
  return singleLine === "" ? null : singleLine;
}

export function normalizeReason(value: unknown): string | null {
  const sanitized = sanitizeReasonInput(value);
  if (!sanitized?.trim()) return null;
  return sanitized;
}

function toPayloadReason(value: string | null): string | undefined {
  const sanitized = sanitizeReasonInput(value);
  if (!sanitized?.trim()) return undefined;
  return sanitized;
}

function normalizeStage(value: unknown): StageRequirement {
  return Number(value) === 1 ? 1 : 2;
}

export function normalizeTier(value: unknown): DiaryTier {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : trimmed;
  }
  return undefined;
}

export function itemEntryKey(id: number): string {
  return `item:${id}`;
}

export function skillEntryKey(skill: string): string {
  return `skill:${normalizeText(skill)}`;
}

export function questEntryKey(name: string): string {
  return `quest:${normalizeText(name)}`;
}

export function achievementDiaryEntryKey(name: string, tier?: DiaryTier): string {
  const tierKey = tier === undefined ? "" : `::${normalizeText(String(tier))}`;
  return `achievement_diary:${normalizeText(name)}${tierKey}`;
}

export function formatAchievementDiaryLabel(name: string, tier?: DiaryTier): string {
  return tier === undefined ? name : `${name} - ${String(tier)}`;
}

export function formatRequiredLabel(isRequired: boolean): string {
  return isRequired ? "Required" : "Recommended";
}

export function isCombatRequirementSkill(skill: string): boolean {
  return normalizeText(skill) === "combat";
}

export function getSkillLevelBounds(skill: string) {
  return isCombatRequirementSkill(skill)
    ? { min: MIN_COMBAT_LEVEL, max: MAX_COMBAT_LEVEL }
    : { min: 1, max: MAX_SKILL_LEVEL };
}

export function buildUnifiedEntryInstanceKey(
  baseKey: string,
  type: EntryRequirementType
): string {
  return `${baseKey}::${type}`;
}

export function supportsDualRequirementEntries(
  kind: UnifiedEntry["kind"]
): boolean {
  return kind === "skill";
}

export function buildUnifiedEntryKey(
  kind: UnifiedEntry["kind"],
  baseKey: string,
  isRequired: boolean
): string {
  if (!supportsDualRequirementEntries(kind)) {
    return baseKey;
  }

  return buildUnifiedEntryInstanceKey(
    baseKey,
    isRequired ? "required" : "recommended"
  );
}

export function hasRequirementContent(value: RequirementPayload | undefined): boolean {
  if (!value) return false;
  return (
    (value.items?.length ?? 0) > 0 ||
    (value.levels?.length ?? 0) > 0 ||
    (value.quests?.length ?? 0) > 0 ||
    (value.achievement_diaries?.length ?? 0) > 0
  );
}

function getEntryLabel(entry: UnifiedEntry): string {
  switch (entry.kind) {
    case "item":
      return entry.name ?? `#${entry.id}`;
    case "skill":
      return entry.skill;
    case "quest":
      return entry.name;
    case "achievement_diary":
      return formatAchievementDiaryLabel(entry.name, entry.tier);
  }
}

function mergeUnifiedEntry(map: Map<string, UnifiedEntry>, entry: UnifiedEntry) {
  const existing = map.get(entry.key);
  if (!existing) {
    map.set(entry.key, entry);
    return;
  }
  if (!existing.reason && entry.reason) {
    existing.reason = entry.reason;
  }
}

export function sortUnifiedEntries(entries: UnifiedEntry[]): UnifiedEntry[] {
  const kindOrder: Record<UnifiedEntry["kind"], number> = {
    item: 0,
    quest: 1,
    achievement_diary: 2,
    skill: 3,
  };

  return [...entries].sort((left, right) => {
    const byKind = kindOrder[left.kind] - kindOrder[right.kind];
    if (byKind !== 0) return byKind;

    const byLabel = getEntryLabel(left).localeCompare(getEntryLabel(right));
    if (byLabel !== 0) return byLabel;

    if (left.isRequired !== right.isRequired) {
      return left.isRequired ? -1 : 1;
    }

    return left.key.localeCompare(right.key);
  });
}

export function buildUnifiedEntries(
  requirements: RequirementPayload,
  recommendations?: RecommendationPayload
): UnifiedEntry[] {
  const entriesMap = new Map<string, UnifiedEntry>();

  const ingest = (source: RequirementPayload | undefined, isRequired: boolean) => {
    if (!source) return;

    for (const item of source.items ?? []) {
      const id = Number(item.id);
      if (!Number.isFinite(id)) continue;
      const quantity = Number(item.quantity);
      const baseKey = itemEntryKey(id);
      mergeUnifiedEntry(entriesMap, {
        kind: "item",
        key: buildUnifiedEntryKey("item", baseKey, isRequired),
        baseKey,
        id,
        quantity:
          clampDecimal(
            Number.isFinite(quantity) ? quantity : 1,
            0,
            MAX_ITEM_QUANTITY,
            MAX_ITEM_QUANTITY_DECIMAL_PLACES,
          ) ?? 1,
        reason: normalizeReason(item.reason),
        isRequired,
      });
    }

    for (const level of source.levels ?? []) {
      const skill = level.skill?.trim();
      if (!skill) continue;
      const parsedLevel = Number(level.level);
      const bounds = getSkillLevelBounds(skill);
      const baseKey = skillEntryKey(skill);
      mergeUnifiedEntry(entriesMap, {
        kind: "skill",
        key: buildUnifiedEntryKey("skill", baseKey, isRequired),
        baseKey,
        skill,
        level:
          clampInteger(
            Number.isFinite(parsedLevel) ? parsedLevel : bounds.min,
            bounds.min,
            bounds.max,
          ) ?? bounds.min,
        reason: normalizeReason(level.reason),
        isRequired,
      });
    }

    for (const quest of source.quests ?? []) {
      const name = quest.name?.trim();
      if (!name) continue;
      const baseKey = questEntryKey(name);
      mergeUnifiedEntry(entriesMap, {
        kind: "quest",
        key: buildUnifiedEntryKey("quest", baseKey, isRequired),
        baseKey,
        name,
        stage: normalizeStage(quest.stage),
        reason: normalizeReason(quest.reason),
        isRequired,
      });
    }

    for (const diary of source.achievement_diaries ?? []) {
      const name = diary.name?.trim();
      if (!name) continue;
      const tier = normalizeTier(diary.tier);
      const baseKey = achievementDiaryEntryKey(name, tier);
      mergeUnifiedEntry(entriesMap, {
        kind: "achievement_diary",
        key: buildUnifiedEntryKey("achievement_diary", baseKey, isRequired),
        baseKey,
        name,
        tier,
        stage: normalizeStage(diary.stage),
        reason: normalizeReason(diary.reason),
        isRequired,
      });
    }
  };

  ingest(requirements, true);
  ingest(recommendations, false);

  return sortUnifiedEntries(Array.from(entriesMap.values()));
}

export function splitUnifiedEntries(entries: UnifiedEntry[]): {
  requirements: RequirementPayload;
  recommendations?: RecommendationPayload;
} {
  const requiredItems: NonNullable<RequirementPayload["items"]> = [];
  const requiredLevels: NonNullable<RequirementPayload["levels"]> = [];
  const requiredQuests: NonNullable<RequirementPayload["quests"]> = [];
  const requiredDiaries: NonNullable<RequirementPayload["achievement_diaries"]> =
    [];
  const recommendedItems: NonNullable<RequirementPayload["items"]> = [];
  const recommendedLevels: NonNullable<RequirementPayload["levels"]> = [];
  const recommendedQuests: NonNullable<RequirementPayload["quests"]> = [];
  const recommendedDiaries: NonNullable<
    RequirementPayload["achievement_diaries"]
  > = [];

  for (const entry of entries) {
    const reason = toPayloadReason(entry.reason);
    const target = entry.isRequired
      ? {
          items: requiredItems,
          levels: requiredLevels,
          quests: requiredQuests,
          diaries: requiredDiaries,
        }
      : {
          items: recommendedItems,
          levels: recommendedLevels,
          quests: recommendedQuests,
          diaries: recommendedDiaries,
        };

    if (entry.kind === "item") {
      target.items.push({
        id: entry.id,
        quantity:
          clampDecimal(
            Number(entry.quantity) || 0,
            0,
            MAX_ITEM_QUANTITY,
            MAX_ITEM_QUANTITY_DECIMAL_PLACES,
          ) ?? 0,
        ...(reason ? { reason } : {}),
      });
      continue;
    }
    if (entry.kind === "skill") {
      const bounds = getSkillLevelBounds(entry.skill);
      target.levels.push({
        skill: entry.skill,
        level:
          clampInteger(
            Number(entry.level) || bounds.min,
            bounds.min,
            bounds.max,
          ) ?? bounds.min,
        ...(reason ? { reason } : {}),
      });
      continue;
    }
    if (entry.kind === "quest") {
      target.quests.push({
        name: entry.name,
        stage: entry.stage === 1 ? 1 : 2,
        ...(reason ? { reason } : {}),
      });
      continue;
    }
    target.diaries.push({
      name: entry.name,
      stage: entry.stage === 1 ? 1 : 2,
      ...(entry.tier !== undefined ? { tier: entry.tier } : {}),
      ...(reason ? { reason } : {}),
    });
  }

  const requirements: RequirementPayload = {};
  if (requiredItems.length > 0) requirements.items = requiredItems;
  if (requiredLevels.length > 0) requirements.levels = requiredLevels;
  if (requiredQuests.length > 0) requirements.quests = requiredQuests;
  if (requiredDiaries.length > 0) requirements.achievement_diaries = requiredDiaries;

  const recommendations: RecommendationPayload = {};
  if (recommendedItems.length > 0) recommendations.items = recommendedItems;
  if (recommendedLevels.length > 0) recommendations.levels = recommendedLevels;
  if (recommendedQuests.length > 0) recommendations.quests = recommendedQuests;
  if (recommendedDiaries.length > 0) {
    recommendations.achievement_diaries = recommendedDiaries;
  }

  return {
    requirements: hasRequirementContent(requirements) ? requirements : {},
    recommendations: hasRequirementContent(recommendations)
      ? recommendations
      : undefined,
  };
}

export function isItemEntry(entry: UnifiedEntry): entry is UnifiedItemEntry {
  return entry.kind === "item";
}

export function isSkillEntry(entry: UnifiedEntry): entry is UnifiedSkillEntry {
  return entry.kind === "skill";
}

export function isQuestEntry(entry: UnifiedEntry): entry is UnifiedQuestEntry {
  return entry.kind === "quest";
}

export function isAchievementDiaryEntry(
  entry: UnifiedEntry
): entry is UnifiedAchievementDiaryEntry {
  return entry.kind === "achievement_diary";
}
