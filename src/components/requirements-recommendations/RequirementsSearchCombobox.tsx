import { Fragment, type UIEvent } from "react";
import { getUrlByType } from "@/lib/utils";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
} from "@/components/ui/combobox";
import type {
  SearchOption,
  SearchOptionGroup,
} from "@/components/requirements-recommendations/requirementsRecommendations.types";

interface RequirementsSearchComboboxProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSelectOption: (value: SearchOption | null) => void;
  visibleSearchGroups: SearchOptionGroup[];
  selectedEntryKeys: Set<string>;
  emptyMessage: string;
  itemSearchError: string | null;
  itemSearchLoadingMore: boolean;
  onSearchListScroll: (event: UIEvent<HTMLElement>) => void;
  questIconUrl?: string;
  achievementDiaryIconUrl?: string;
}

export function RequirementsSearchCombobox({
  query,
  onQueryChange,
  onSelectOption,
  visibleSearchGroups,
  selectedEntryKeys,
  emptyMessage,
  itemSearchError,
  itemSearchLoadingMore,
  onSearchListScroll,
  questIconUrl,
  achievementDiaryIconUrl,
}: RequirementsSearchComboboxProps) {
  return (
    <Combobox<SearchOption>
      inputValue={query}
      onInputValueChange={onQueryChange}
      onValueChange={onSelectOption}
      filter={null}
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.key}
      isItemEqualToValue={(left, right) => {
        if (!left || !right) return false;
        return left.key === right.key;
      }}
    >
      <ComboboxInput
        className="w-full"
        placeholder="Buscar items, quests, achievement diaries o skills..."
        showClear={query.trim().length > 0}
      />
      <ComboboxContent>
        <ComboboxList onScroll={onSearchListScroll}>
          {visibleSearchGroups.map((group, groupIndex) => (
            <Fragment key={group.id}>
              {groupIndex > 0 ? <ComboboxSeparator /> : null}
              <ComboboxGroup>
                <ComboboxLabel>{group.label}</ComboboxLabel>
                {group.options.map((option) => {
                  const isAdded = selectedEntryKeys.has(option.entryKey);
                  return (
                    <ComboboxItem key={option.key} value={option} disabled={isAdded}>
                      <div className="flex items-center gap-2">
                        {option.kind === "item" && option.iconUrl ? (
                          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                            <img
                              src={option.iconUrl}
                              alt={option.label}
                              className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                            />
                          </div>
                        ) : null}
                        {option.kind === "skill" && getUrlByType(option.skill) ? (
                          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                            <img
                              src={getUrlByType(option.skill) ?? ""}
                              alt={`${option.skill}_icon`}
                              className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                            />
                          </div>
                        ) : null}
                        {option.kind === "quest" && questIconUrl ? (
                          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                            <img
                              src={questIconUrl}
                              alt="quests_icon"
                              className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                            />
                          </div>
                        ) : null}
                        {option.kind === "achievement_diary" &&
                        achievementDiaryIconUrl ? (
                          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                            <img
                              src={achievementDiaryIconUrl}
                              alt="achievement_diaries_icon"
                              className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                            />
                          </div>
                        ) : null}
                        <span>{option.label}</span>
                        {isAdded ? (
                          <span className="text-xs text-muted-foreground">Agregado</span>
                        ) : null}
                      </div>
                    </ComboboxItem>
                  );
                })}
              </ComboboxGroup>
            </Fragment>
          ))}
          {itemSearchLoadingMore ? (
            <div className="px-2 py-1 text-xs text-muted-foreground">Loading...</div>
          ) : null}
        </ComboboxList>
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        {itemSearchError ? (
          <div className="px-2 py-1 text-xs text-destructive">{itemSearchError}</div>
        ) : null}
      </ComboboxContent>
    </Combobox>
  );
}
