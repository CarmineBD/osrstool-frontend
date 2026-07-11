import { RequirementsEntriesTables } from "@/components/requirements-recommendations/RequirementsEntriesTables";
import { RequirementsSearchCombobox } from "@/components/requirements-recommendations/RequirementsSearchCombobox";
import type { RequirementsRecommendationsFieldProps } from "@/components/requirements-recommendations/requirementsRecommendations.types";
import { useRequirementsRecommendations } from "@/components/requirements-recommendations/useRequirementsRecommendations";

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
    <div className="space-y-4">
      {label ? <label className="block text-sm font-medium">{label}</label> : null}

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
      ) : null}
    </div>
  );
}

export default RequirementsRecommendationsField;
