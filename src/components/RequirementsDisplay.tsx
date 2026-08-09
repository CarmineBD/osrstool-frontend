import type { ReactNode } from "react";
import { OsrsItemsContainer } from "@/components/IoItemsDisplay";
import {
  EDITOR_NESTED_SURFACE_CLASS,
  SectionHeader,
} from "@/components/method-editor/MethodEditorPrimitives";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Item, Variant } from "@/lib/api";
import { cn, getUrlByType } from "@/lib/utils";

export function RequirementReasonBadge({
  reason,
  children,
}: {
  reason?: string;
  children: ReactNode;
}) {
  const reasonLabel = reason?.trim();

  if (!reasonLabel) {
    return children;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent sideOffset={6}>
        <span>{reasonLabel}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export function LevelsAndQuestBadges({
  requirement,
}: {
  requirement?: Variant["requirements"];
}) {
  return (
    <>
      {(requirement?.levels || []).map(({ skill, level, reason }) => (
        <RequirementReasonBadge key={skill} reason={reason}>
          <Badge size="md" variant="secondary">
            <img
              src={getUrlByType(skill) ?? ""}
              alt={`${skill.toLowerCase()}_icon`}
            />
            {level}
          </Badge>
        </RequirementReasonBadge>
      ))}
      {(requirement?.quests || []).map(({ name, stage, reason }) => (
        <RequirementReasonBadge key={name} reason={reason}>
          <Badge size="md" variant="secondary">
            <img src={getUrlByType("quests") ?? ""} alt="quests_icon" />
            {stage === 1 ? `${name} (started)` : name}
          </Badge>
        </RequirementReasonBadge>
      ))}
      {(requirement?.achievement_diaries || []).map(
        ({ name, tier, reason }) => (
          <RequirementReasonBadge key={`${name}_${tier}`} reason={reason}>
            <Badge size="md" variant="secondary">
              <img
                src={getUrlByType("achievement_diaries") ?? ""}
                alt="achievement_diaries_icon"
              />
              {`${name} ${tier}`}
            </Badge>
          </RequirementReasonBadge>
        ),
      )}
    </>
  );
}

export function hasGuidanceContent(
  requirement: Variant["requirements"] | undefined,
  items: Variant["inputs"],
) {
  return Boolean(
    requirement?.levels?.length ||
      requirement?.quests?.length ||
      requirement?.achievement_diaries?.length ||
      items.length,
  );
}

export function GuidanceColumn({
  title,
  requirement,
  items,
  itemsMap,
  isItemsLoading = false,
  tooltipKeyPrefix,
  showAdvancedDetails,
  onToggleAdvancedDetails,
}: {
  title: string;
  requirement?: Variant["requirements"];
  items: Variant["inputs"];
  itemsMap: Record<number, Item>;
  isItemsLoading?: boolean;
  tooltipKeyPrefix: string;
  showAdvancedDetails: boolean;
  onToggleAdvancedDetails: () => void;
}) {
  const hasProgression = Boolean(
    requirement?.levels?.length ||
      requirement?.quests?.length ||
      requirement?.achievement_diaries?.length,
  );
  const hasItems = items.length > 0;

  return (
    <section
      className={cn(EDITOR_NESTED_SURFACE_CLASS, "space-y-4 bg-card p-4")}
    >
      <SectionHeader title={title} level="h3" />
      {hasProgression ? (
        <div className="flex flex-wrap gap-2">
          <LevelsAndQuestBadges requirement={requirement} />
        </div>
      ) : null}

      {hasItems ? (
        <OsrsItemsContainer
          items={items}
          itemsMap={itemsMap}
          isLoading={isItemsLoading}
          tooltipKeyPrefix={tooltipKeyPrefix}
          showAdvancedDetails={showAdvancedDetails}
          onToggleAdvancedDetails={onToggleAdvancedDetails}
        />
      ) : null}
    </section>
  );
}
