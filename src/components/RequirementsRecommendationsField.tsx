import {
  EDITOR_FIELD_LABEL_CLASS,
  EDITOR_META_TEXT_CLASS,
  EmptySelectionState,
} from "@/components/method-editor/MethodEditorPrimitives";
import { RequirementsEntriesTables } from "@/components/requirements-recommendations/RequirementsEntriesTables";
import { RequirementsSearchCombobox } from "@/components/requirements-recommendations/RequirementsSearchCombobox";
import type { RequirementsRecommendationsFieldProps } from "@/components/requirements-recommendations/requirementsRecommendations.types";
import { useRequirementsRecommendations } from "@/components/requirements-recommendations/useRequirementsRecommendations";
import { REQUIREMENT_ENTRIES_MAX_COUNT } from "@/lib/validation";

export function RequirementsRecommendationsField(
  props: RequirementsRecommendationsFieldProps
) {
  const state = useRequirementsRecommendations(props);
  const {
    label,
    searchLabel = "Unified search",
    searchPlaceholder = "Search items, skills, quests, or achievement diaries",
  } = props;
  const hasSelectedEntries =
    state.itemEntries.length > 0 ||
    state.questEntries.length > 0 ||
    state.achievementDiaryEntries.length > 0 ||
    state.skillEntries.length > 0;

  return (
    <div>
      {label ? <label className={EDITOR_FIELD_LABEL_CLASS}>{label}</label> : null}

      <RequirementsSearchCombobox
        label={searchLabel}
        placeholder={searchPlaceholder}
        query={state.query}
        onQueryChange={state.setQuery}
        onSelectOption={state.handleSelectOption}
        showUntradeables={state.showUntradeables}
        onShowUntradeablesChange={state.setShowUntradeables}
        visibleSearchGroups={state.visibleSearchGroups}
        entrySelectionState={state.entrySelectionState}
        emptyMessage={state.emptyMessage}
        itemSearchError={state.itemSearchError}
        itemSearchLoading={state.itemSearchLoading}
        itemSearchLoadingMore={state.itemSearchLoadingMore}
        onSearchListScroll={state.handleSearchListScroll}
        questIconUrl={state.questIconUrl}
        achievementDiaryIconUrl={state.achievementDiaryIconUrl}
      />

      <p className={`${EDITOR_META_TEXT_CLASS} mt-2`}>
        Requirements: {state.requiredEntryCount}/{REQUIREMENT_ENTRIES_MAX_COUNT}.
        Recommendations: {state.recommendedEntryCount}/
        {REQUIREMENT_ENTRIES_MAX_COUNT}.
      </p>

      <div className="mt-4">
        {hasSelectedEntries ? (
          <RequirementsEntriesTables
            itemEntries={state.itemEntries}
            questEntries={state.questEntries}
            achievementDiaryEntries={state.achievementDiaryEntries}
            skillEntries={state.skillEntries}
            questIconUrl={state.questIconUrl}
            achievementDiaryIconUrl={state.achievementDiaryIconUrl}
            getItemName={state.getItemName}
            getItemIcon={state.getItemIcon}
            updateEntry={state.updateEntry}
            removeEntry={state.removeEntry}
          />
        ) : (
          <EmptySelectionState description="No requirements or recommendations selected yet." />
        )}
      </div>
    </div>
  );
}

export default RequirementsRecommendationsField;
