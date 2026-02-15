import { RequirementsEntriesTables } from "@/components/requirements-recommendations/RequirementsEntriesTables";
import { RequirementsSearchCombobox } from "@/components/requirements-recommendations/RequirementsSearchCombobox";
import type { RequirementsRecommendationsFieldProps } from "@/components/requirements-recommendations/requirementsRecommendations.types";
import { useRequirementsRecommendations } from "@/components/requirements-recommendations/useRequirementsRecommendations";

export function RequirementsRecommendationsField(
  props: RequirementsRecommendationsFieldProps
) {
  const state = useRequirementsRecommendations(props);

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">
        Requirements & Recommendations
      </label>

      <RequirementsSearchCombobox
        query={state.query}
        onQueryChange={state.setQuery}
        onSelectOption={state.handleSelectOption}
        visibleSearchGroups={state.visibleSearchGroups}
        selectedEntryKeys={state.selectedEntryKeys}
        emptyMessage={state.emptyMessage}
        itemSearchError={state.itemSearchError}
        itemSearchLoadingMore={state.itemSearchLoadingMore}
        onSearchListScroll={state.handleSearchListScroll}
        questIconUrl={state.questIconUrl}
        achievementDiaryIconUrl={state.achievementDiaryIconUrl}
      />

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
    </div>
  );
}

export default RequirementsRecommendationsField;
