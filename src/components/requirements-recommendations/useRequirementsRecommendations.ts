import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent,
} from "react";
import {
  fetchItems,
  searchItems,
  type Item,
  type ItemSearchResult,
} from "@/lib/api";
import { getUrlByType } from "@/lib/utils";
import type {
  DiaryTier,
  EntrySelectionState,
  RequirementsRecommendationsFieldProps,
  SearchOption,
  SearchOptionGroup,
  UnifiedAchievementDiaryEntry,
  UnifiedEntry,
  UnifiedItemEntry,
  UnifiedQuestEntry,
  UnifiedSkillEntry,
} from "@/components/requirements-recommendations/requirementsRecommendations.types";
import {
  achievementDiaryEntryKey,
  buildUnifiedEntryKey,
  buildUnifiedEntries,
  getSkillLevelBounds,
  formatAchievementDiaryLabel,
  hasMoreItemPages,
  isAchievementDiaryEntry,
  isItemEntry,
  isQuestEntry,
  isSkillEntry,
  itemEntryKey,
  ITEM_SEARCH_DEBOUNCE_MS,
  ITEM_SEARCH_LIMIT,
  LOCAL_SEARCH_LIMIT,
  normalizeText,
  normalizeTier,
  questEntryKey,
  SCROLL_BOTTOM_THRESHOLD_PX,
  skillEntryKey,
  sortUnifiedEntries,
  supportsDualRequirementEntries,
  splitUnifiedEntries,
} from "@/components/requirements-recommendations/requirementsRecommendations.utils";
import {
  normalizeBoundedText,
  REQUIREMENT_ENTRIES_MAX_COUNT,
  SEARCH_QUERY_MAX_LENGTH,
} from "@/lib/validation";

type EntryUpdater = (entry: UnifiedEntry) => UnifiedEntry;

export interface UseRequirementsRecommendationsResult {
  query: string;
  setQuery: (value: string) => void;
  showUntradeables: boolean;
  setShowUntradeables: (value: boolean) => void;
  emptyMessage: string;
  itemSearchError: string | null;
  itemSearchLoading: boolean;
  itemSearchLoadingMore: boolean;
  questIconUrl: string | undefined;
  achievementDiaryIconUrl: string | undefined;
  entrySelectionState: Map<string, EntrySelectionState>;
  visibleSearchGroups: SearchOptionGroup[];
  itemEntries: UnifiedItemEntry[];
  questEntries: UnifiedQuestEntry[];
  achievementDiaryEntries: UnifiedAchievementDiaryEntry[];
  skillEntries: UnifiedSkillEntry[];
  requiredEntryCount: number;
  recommendedEntryCount: number;
  handleSearchListScroll: (event: UIEvent<HTMLElement>) => void;
  handleSelectOption: (option: SearchOption | null) => void;
  updateEntry: (entryKey: string, updater: EntryUpdater) => void;
  removeEntry: (entryKey: string) => void;
  getItemName: (entry: UnifiedItemEntry) => string;
  getItemIcon: (entry: UnifiedItemEntry) => string | undefined;
}

export function useRequirementsRecommendations({
  requirements,
  recommendations,
  skillOptions,
  questOptions,
  achievementDiaryOptions,
  onChange,
}: RequirementsRecommendationsFieldProps): UseRequirementsRecommendationsResult {
  const [query, setQueryState] = useState("");
  const [showUntradeables, setShowUntradeables] = useState(false);
  const [entries, setEntries] = useState<UnifiedEntry[]>(() =>
    buildUnifiedEntries(requirements, recommendations)
  );
  const [itemSearchResults, setItemSearchResults] = useState<ItemSearchResult[]>(
    []
  );
  const [itemSearchCache, setItemSearchCache] = useState<
    Record<number, ItemSearchResult>
  >({});
  const [itemsMap, setItemsMap] = useState<Record<number, Item>>({});
  const [itemSearchLoading, setItemSearchLoading] = useState(false);
  const [itemSearchLoadingMore, setItemSearchLoadingMore] = useState(false);
  const [itemSearchPage, setItemSearchPage] = useState(0);
  const [itemSearchHasMore, setItemSearchHasMore] = useState(false);
  const [itemSearchError, setItemSearchError] = useState<string | null>(null);
  const itemSearchRequestIdRef = useRef(0);
  const itemSearchLoadControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      itemSearchLoadControllerRef.current?.abort();
    };
  }, []);

  const sourceSignature = useMemo(
    () =>
      JSON.stringify({
        requirements: requirements ?? {},
        recommendations: recommendations ?? {},
      }),
    [requirements, recommendations]
  );

  useEffect(() => {
    setEntries(buildUnifiedEntries(requirements, recommendations));
  }, [sourceSignature, requirements, recommendations]);

  const applyEntries = useCallback(
    (updater: (previousEntries: UnifiedEntry[]) => UnifiedEntry[]) => {
      setEntries((previousEntries) => {
        const nextEntries = sortUnifiedEntries(updater(previousEntries));
        onChange(splitUnifiedEntries(nextEntries));
        return nextEntries;
      });
    },
    [onChange]
  );

  const setQuery = useCallback((value: string) => {
    setQueryState(normalizeBoundedText(value, SEARCH_QUERY_MAX_LENGTH));
  }, []);

  const selectedItemIdsKey = useMemo(
    () =>
      Array.from(
        new Set(entries.filter(isItemEntry).map((entry) => Number(entry.id) || 0))
      ).join(","),
    [entries]
  );

  useEffect(() => {
    let active = true;
    const selectedIds = selectedItemIdsKey
      ? selectedItemIdsKey
          .split(",")
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
      : [];

    if (selectedIds.length === 0) {
      setItemsMap({});
      return;
    }

    fetchItems(selectedIds)
      .then((data) => {
        if (active) {
          setItemsMap(data ?? {});
        }
      })
      .catch(() => {
        if (active) {
          setItemsMap({});
        }
      });

    return () => {
      active = false;
    };
  }, [selectedItemIdsKey]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    itemSearchLoadControllerRef.current?.abort();
    itemSearchLoadControllerRef.current = null;

    if (!trimmedQuery) {
      setItemSearchResults([]);
      setItemSearchLoading(false);
      setItemSearchLoadingMore(false);
      setItemSearchPage(0);
      setItemSearchHasMore(false);
      setItemSearchError(null);
      return;
    }

    const requestId = ++itemSearchRequestIdRef.current;
    const controller = new AbortController();
    setItemSearchLoading(true);
    setItemSearchLoadingMore(false);
    setItemSearchPage(0);
    setItemSearchHasMore(false);
    setItemSearchError(null);
    setItemSearchResults([]);

    const timeout = setTimeout(() => {
      searchItems(trimmedQuery, ITEM_SEARCH_LIMIT, 1, controller.signal, {
        showUntradeables,
      })
        .then((response) => {
          if (itemSearchRequestIdRef.current !== requestId) return;
          const nextItems = response.items.slice(0, ITEM_SEARCH_LIMIT);
          const resolvedPage = response.page ?? 1;
          setItemSearchResults(nextItems);
          setItemSearchPage(resolvedPage);
          setItemSearchHasMore(hasMoreItemPages(response, 1, ITEM_SEARCH_LIMIT));
          setItemSearchCache((previousCache) => {
            if (nextItems.length === 0) return previousCache;
            const nextCache = { ...previousCache };
            nextItems.forEach((item) => {
              nextCache[item.id] = item;
            });
            return nextCache;
          });
          setItemSearchLoading(false);
          setItemSearchError(null);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          console.error("Item search failed", error);
          setItemSearchLoading(false);
          setItemSearchError(
            error instanceof Error
              ? error.message
              : "Unable to load items."
          );
        });
    }, ITEM_SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query, showUntradeables]);

  const loadMoreItemSearchResults = useCallback(() => {
    const trimmedQuery = query.trim();
    if (
      !trimmedQuery ||
      itemSearchLoading ||
      itemSearchLoadingMore ||
      !itemSearchHasMore
    ) {
      return;
    }

    const requestId = ++itemSearchRequestIdRef.current;
    const nextPage = Math.max(1, itemSearchPage + 1);
    const controller = new AbortController();
    itemSearchLoadControllerRef.current = controller;
    setItemSearchLoadingMore(true);
    setItemSearchError(null);

    searchItems(trimmedQuery, ITEM_SEARCH_LIMIT, nextPage, controller.signal, {
      showUntradeables,
    })
      .then((response) => {
        if (itemSearchRequestIdRef.current !== requestId) return;
        const nextItems = response.items.slice(0, ITEM_SEARCH_LIMIT);
        const resolvedPage = response.page ?? nextPage;

        setItemSearchResults((previousItems) => {
          if (nextItems.length === 0) return previousItems;
          const seen = new Set(previousItems.map((item) => item.id));
          const merged = [...previousItems];
          nextItems.forEach((item) => {
            if (seen.has(item.id)) return;
            merged.push(item);
            seen.add(item.id);
          });
          return merged;
        });
        setItemSearchPage(resolvedPage);
        setItemSearchHasMore(hasMoreItemPages(response, nextPage, ITEM_SEARCH_LIMIT));
        setItemSearchCache((previousCache) => {
          if (nextItems.length === 0) return previousCache;
          const nextCache = { ...previousCache };
          nextItems.forEach((item) => {
            nextCache[item.id] = item;
          });
          return nextCache;
        });
        setItemSearchLoadingMore(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (itemSearchRequestIdRef.current !== requestId) return;
        console.error("Item search failed", error);
        setItemSearchLoadingMore(false);
        setItemSearchError(
          error instanceof Error ? error.message : "Unable to load items."
        );
      })
      .finally(() => {
        if (itemSearchLoadControllerRef.current === controller) {
          itemSearchLoadControllerRef.current = null;
        }
      });
  }, [
    itemSearchHasMore,
    itemSearchLoading,
    itemSearchLoadingMore,
    itemSearchPage,
    query,
    showUntradeables,
  ]);

  const handleSearchListScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      const element = event.currentTarget;
      const distanceToBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      if (distanceToBottom > SCROLL_BOTTOM_THRESHOLD_PX) return;
      loadMoreItemSearchResults();
    },
    [loadMoreItemSearchResults]
  );

  const trimmedQuery = query.trim().toLowerCase();

  const normalizedSkillOptions = useMemo(() => {
    const uniqueSkillNames = new Map<string, string>();
    for (const option of skillOptions) {
      const name = option.name?.trim();
      if (!name) continue;
      const key = normalizeText(name);
      if (!uniqueSkillNames.has(key)) {
        uniqueSkillNames.set(key, name);
      }
    }
    return Array.from(uniqueSkillNames.values()).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [skillOptions]);

  const normalizedQuestOptions = useMemo(() => {
    const uniqueQuestNames = new Map<string, string>();
    for (const option of questOptions) {
      const name = option.name?.trim();
      if (!name) continue;
      const key = normalizeText(name);
      if (!uniqueQuestNames.has(key)) {
        uniqueQuestNames.set(key, name);
      }
    }
    return Array.from(uniqueQuestNames.values()).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [questOptions]);

  const normalizedAchievementDiaryOptions = useMemo(() => {
    const uniqueAchievementDiaries = new Map<
      string,
      { name: string; tier?: DiaryTier }
    >();
    for (const option of achievementDiaryOptions) {
      const name = option.name?.trim();
      if (!name) continue;
      const tier = normalizeTier(option.tier);
      const key = achievementDiaryEntryKey(name, tier);
      if (!uniqueAchievementDiaries.has(key)) {
        uniqueAchievementDiaries.set(key, { name, tier });
      }
    }
    return Array.from(uniqueAchievementDiaries.entries())
      .map(([key, value]) => ({ key, name: value.name, tier: value.tier }))
      .sort((left, right) =>
        formatAchievementDiaryLabel(left.name, left.tier).localeCompare(
          formatAchievementDiaryLabel(right.name, right.tier)
        )
      );
  }, [achievementDiaryOptions]);

  const itemSearchOptions = useMemo<SearchOption[]>(
    () =>
      itemSearchResults.map((item) => ({
        kind: "item",
        key: `search:${itemEntryKey(item.id)}`,
        label: item.name,
        entryKey: itemEntryKey(item.id),
        id: item.id,
        iconUrl: item.iconUrl,
      })),
    [itemSearchResults]
  );

  const questSearchOptions = useMemo<SearchOption[]>(() => {
    if (!trimmedQuery) return [];
    return normalizedQuestOptions
      .filter((name) => name.toLowerCase().includes(trimmedQuery))
      .slice(0, LOCAL_SEARCH_LIMIT)
      .map((name) => ({
        kind: "quest",
        key: `search:${questEntryKey(name)}`,
        label: name,
        entryKey: questEntryKey(name),
        name,
      }));
  }, [trimmedQuery, normalizedQuestOptions]);

  const achievementDiarySearchOptions = useMemo<SearchOption[]>(() => {
    if (!trimmedQuery) return [];
    return normalizedAchievementDiaryOptions
      .filter((option) =>
        formatAchievementDiaryLabel(option.name, option.tier)
          .toLowerCase()
          .includes(trimmedQuery)
      )
      .slice(0, LOCAL_SEARCH_LIMIT)
      .map((option) => ({
        kind: "achievement_diary",
        key: `search:${option.key}`,
        label: formatAchievementDiaryLabel(option.name, option.tier),
        entryKey: option.key,
        name: option.name,
        tier: option.tier,
      }));
  }, [normalizedAchievementDiaryOptions, trimmedQuery]);

  const skillSearchOptions = useMemo<SearchOption[]>(() => {
    if (!trimmedQuery) return [];
    return normalizedSkillOptions
      .filter((name) => name.toLowerCase().includes(trimmedQuery))
      .slice(0, LOCAL_SEARCH_LIMIT)
      .map((name) => ({
        kind: "skill",
        key: `search:${skillEntryKey(name)}`,
        label: name,
        entryKey: skillEntryKey(name),
        skill: name,
      }));
  }, [normalizedSkillOptions, trimmedQuery]);

  const entrySelectionState = useMemo(
    () =>
      entries.reduce((map, entry) => {
        const current = map.get(entry.baseKey) ?? {
          count: 0,
          hasRequired: false,
          hasRecommended: false,
        };
        current.count += 1;
        if (entry.isRequired) {
          current.hasRequired = true;
        } else {
          current.hasRecommended = true;
        }
        map.set(entry.baseKey, current);
        return map;
      }, new Map<string, EntrySelectionState>()),
    [entries]
  );

  const requiredEntryCount = useMemo(
    () => entries.filter((entry) => entry.isRequired).length,
    [entries],
  );

  const recommendedEntryCount = useMemo(
    () => entries.filter((entry) => !entry.isRequired).length,
    [entries],
  );

  const visibleSearchGroups = useMemo<SearchOptionGroup[]>(
    () =>
      [
        { id: "quests", label: "Quests", options: questSearchOptions },
        {
          id: "achievement_diaries",
          label: "Achievement Diaries",
          options: achievementDiarySearchOptions,
        },
        { id: "skills", label: "Skills", options: skillSearchOptions },
        { id: "items", label: "Items", options: itemSearchOptions },
      ].filter((group) => group.options.length > 0),
    [
      achievementDiarySearchOptions,
      itemSearchOptions,
      questSearchOptions,
      skillSearchOptions,
    ]
  );

  useEffect(() => {
    const hasOnlyItemOptions =
      itemSearchOptions.length > 0 &&
      questSearchOptions.length === 0 &&
      achievementDiarySearchOptions.length === 0 &&
      skillSearchOptions.length === 0;

    if (
      !trimmedQuery ||
      itemSearchLoading ||
      itemSearchLoadingMore ||
      !itemSearchHasMore ||
      !hasOnlyItemOptions ||
      itemSearchOptions.length > ITEM_SEARCH_LIMIT
    ) {
      return;
    }

    loadMoreItemSearchResults();
  }, [
    achievementDiarySearchOptions.length,
    itemSearchHasMore,
    itemSearchLoading,
    itemSearchLoadingMore,
    itemSearchOptions.length,
    loadMoreItemSearchResults,
    questSearchOptions.length,
    skillSearchOptions.length,
    trimmedQuery,
  ]);

  const emptyMessage = trimmedQuery ? "No results found" : "Type to search";

  const updateEntry = useCallback(
    (entryKey: string, updater: EntryUpdater) => {
      applyEntries((previousEntries) => {
        const targetIndex = previousEntries.findIndex(
          (entry) => entry.key === entryKey
        );
        if (targetIndex === -1) return previousEntries;

        const currentEntry = previousEntries[targetIndex];
        const nextEntries = [...previousEntries];
        const updatedEntry = updater(currentEntry);
        const normalizedUpdatedEntry = {
          ...updatedEntry,
          baseKey: currentEntry.baseKey,
          key: buildUnifiedEntryKey(
            updatedEntry.kind,
            currentEntry.baseKey,
            updatedEntry.isRequired
          ),
        };

        const conflictingIndex = supportsDualRequirementEntries(updatedEntry.kind)
          ? nextEntries.findIndex(
              (entry, index) =>
                index !== targetIndex &&
                entry.baseKey === normalizedUpdatedEntry.baseKey &&
                entry.isRequired === normalizedUpdatedEntry.isRequired
            )
          : -1;

        if (
          currentEntry.isRequired !== normalizedUpdatedEntry.isRequired &&
          conflictingIndex === -1
        ) {
          const targetCount = normalizedUpdatedEntry.isRequired
            ? previousEntries.filter((entry) => entry.isRequired).length
            : previousEntries.filter((entry) => !entry.isRequired).length;

          if (targetCount >= REQUIREMENT_ENTRIES_MAX_COUNT) {
            return previousEntries;
          }
        }

        if (conflictingIndex !== -1) {
          const conflictingEntry = nextEntries[conflictingIndex];
          nextEntries[conflictingIndex] = {
            ...conflictingEntry,
            isRequired: !normalizedUpdatedEntry.isRequired,
            key: buildUnifiedEntryKey(
              conflictingEntry.kind,
              conflictingEntry.baseKey,
              !normalizedUpdatedEntry.isRequired
            ),
          };
        }

        nextEntries[targetIndex] = normalizedUpdatedEntry;
        return nextEntries;
      });
    },
    [applyEntries]
  );

  const removeEntry = useCallback(
    (entryKey: string) => {
      applyEntries((previousEntries) =>
        previousEntries.filter((entry) => entry.key !== entryKey)
      );
    },
    [applyEntries]
  );

  const handleSelectOption = useCallback(
    (option: SearchOption | null) => {
      if (!option) return;
      const selectionState = entrySelectionState.get(option.entryKey);
      const supportsDualEntries = option.kind === "skill";
      if (
        (supportsDualEntries &&
          (selectionState?.count === 2 ||
            (selectionState?.hasRequired && selectionState?.hasRecommended))) ||
        (!supportsDualEntries && selectionState?.count)
      ) {
        setQuery("");
        return;
      }
      const isRequired = supportsDualEntries ? !selectionState?.hasRequired : true;
      const targetCount = isRequired ? requiredEntryCount : recommendedEntryCount;
      if (targetCount >= REQUIREMENT_ENTRIES_MAX_COUNT) {
        setQuery("");
        return;
      }
      const key = buildUnifiedEntryKey(option.kind, option.entryKey, isRequired);

      if (option.kind === "item") {
        applyEntries((previousEntries) => [
          ...previousEntries,
          {
            kind: "item",
            key,
            baseKey: option.entryKey,
            id: option.id,
            quantity: 1,
            reason: null,
            isRequired,
            name: option.label,
            iconUrl: option.iconUrl,
          },
        ]);
        setQuery("");
        return;
      }

      if (option.kind === "quest") {
        applyEntries((previousEntries) => [
          ...previousEntries,
          {
            kind: "quest",
            key,
            baseKey: option.entryKey,
            name: option.name,
            stage: 2,
            reason: null,
            isRequired,
          },
        ]);
        setQuery("");
        return;
      }

      if (option.kind === "achievement_diary") {
        applyEntries((previousEntries) => [
          ...previousEntries,
          {
            kind: "achievement_diary",
            key,
            baseKey: option.entryKey,
            name: option.name,
            tier: option.tier,
            stage: 2,
            reason: null,
            isRequired,
          },
        ]);
        setQuery("");
        return;
      }

      applyEntries((previousEntries) => [
        ...previousEntries,
          {
            kind: "skill",
            key,
            baseKey: option.entryKey,
            skill: option.skill,
            level: getSkillLevelBounds(option.skill).min,
            reason: null,
            isRequired,
          },
      ]);
      setQuery("");
    },
    [
      applyEntries,
      entrySelectionState,
      recommendedEntryCount,
      requiredEntryCount,
      setQuery,
    ]
  );

  const itemEntries = useMemo(() => entries.filter(isItemEntry), [entries]);
  const questEntries = useMemo(() => entries.filter(isQuestEntry), [entries]);
  const achievementDiaryEntries = useMemo(
    () => entries.filter(isAchievementDiaryEntry),
    [entries]
  );
  const skillEntries = useMemo(() => entries.filter(isSkillEntry), [entries]);

  const questIconUrl = getUrlByType("quests") ?? undefined;
  const achievementDiaryIconUrl = getUrlByType("achievement_diaries") ?? undefined;

  const getItemName = useCallback(
    (entry: UnifiedItemEntry): string =>
      itemsMap[entry.id]?.name ??
      itemSearchCache[entry.id]?.name ??
      entry.name ??
      `#${entry.id}`,
    [itemSearchCache, itemsMap]
  );

  const getItemIcon = useCallback(
    (entry: UnifiedItemEntry): string | undefined =>
      itemsMap[entry.id]?.iconUrl ??
      itemSearchCache[entry.id]?.iconUrl ??
      entry.iconUrl,
    [itemSearchCache, itemsMap]
  );

  return {
    query,
    setQuery,
    showUntradeables,
    setShowUntradeables,
    emptyMessage,
    itemSearchError,
    itemSearchLoading,
    itemSearchLoadingMore,
    questIconUrl,
    achievementDiaryIconUrl,
    entrySelectionState,
    visibleSearchGroups,
    itemEntries,
    questEntries,
    achievementDiaryEntries,
    skillEntries,
    requiredEntryCount,
    recommendedEntryCount,
    handleSearchListScroll,
    handleSelectOption,
    updateEntry,
    removeEntry,
    getItemName,
    getItemIcon,
  };
}
