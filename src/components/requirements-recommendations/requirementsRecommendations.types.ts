import type {
  AchievementDiaryOption,
  QuestOption,
  SkillOption,
  Variant,
} from "@/lib/api";

export type StageRequirement = 1 | 2;
export type RequirementPayload = Variant["requirements"];
export type RecommendationPayload = Variant["recommendations"];
export type DiaryTier = AchievementDiaryOption["tier"];

interface UnifiedEntryBase {
  key: string;
  reason: string | null;
  isRequired: boolean;
}

export interface UnifiedItemEntry extends UnifiedEntryBase {
  kind: "item";
  id: number;
  quantity: number;
  name?: string;
  iconUrl?: string;
}

export interface UnifiedSkillEntry extends UnifiedEntryBase {
  kind: "skill";
  skill: string;
  level: number;
}

export interface UnifiedQuestEntry extends UnifiedEntryBase {
  kind: "quest";
  name: string;
  stage: StageRequirement;
}

export interface UnifiedAchievementDiaryEntry extends UnifiedEntryBase {
  kind: "achievement_diary";
  name: string;
  tier?: DiaryTier;
  stage: StageRequirement;
}

export type UnifiedEntry =
  | UnifiedItemEntry
  | UnifiedSkillEntry
  | UnifiedQuestEntry
  | UnifiedAchievementDiaryEntry;

export type SearchOption =
  | {
      kind: "item";
      key: string;
      label: string;
      entryKey: string;
      id: number;
      iconUrl?: string;
    }
  | {
      kind: "quest";
      key: string;
      label: string;
      entryKey: string;
      name: string;
    }
  | {
      kind: "achievement_diary";
      key: string;
      label: string;
      entryKey: string;
      name: string;
      tier?: DiaryTier;
    }
  | {
      kind: "skill";
      key: string;
      label: string;
      entryKey: string;
      skill: string;
    };

export interface SearchOptionGroup {
  id: string;
  label: string;
  options: SearchOption[];
}

export interface RequirementsRecommendationsFieldProps {
  requirements: RequirementPayload;
  recommendations?: RecommendationPayload;
  skillOptions: SkillOption[];
  questOptions: QuestOption[];
  achievementDiaryOptions: AchievementDiaryOption[];
  onChange: (next: {
    requirements: RequirementPayload;
    recommendations?: RecommendationPayload;
  }) => void;
}
