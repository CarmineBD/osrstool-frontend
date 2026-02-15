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
  buildUnifiedEntries,
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
  splitUnifiedEntries,
} from "@/components/requirements-recommendations/requirementsRecommendations.utils";

type EntryUpdater = (entry: UnifiedEntry) => UnifiedEntry;

export interface UseRequirementsRecommendationsResult {
  query: string;
  setQuery: (value: string) => void;
  emptyMessage: string;
  itemSearchError: string | null;
  itemSearchLoadingMore: boolean;
  questIconUrl: string | undefined;
  achievementDiaryIconUrl: string | undefined;
  selectedEntryKeys: Set<string>;
  visibleSearchGroups: SearchOptionGroup[];
  itemEntries: UnifiedItemEntry[];
  questEntries: UnifiedQuestEntry[];
  achievementDiaryEntries: UnifiedAchievementDiaryEntry[];
  skillEntries: UnifiedSkillEntry[];
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
  const [query, setQuery] = useState("");
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
        const nextEntries = updater(previousEntries);
        onChange(splitUnifiedEntries(nextEntries));
        return nextEntries;
      });
    },
    [onChange]
  );

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
      searchItems(trimmedQuery, ITEM_SEARCH_LIMIT, 1, controller.signal)
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
              : "No se pudieron cargar los items."
          );
        });
    }, ITEM_SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

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

    searchItems(trimmedQuery, ITEM_SEARCH_LIMIT, nextPage, controller.signal)
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
          error instanceof Error ? error.message : "No se pudieron cargar los items."
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

  const selectedEntryKeys = useMemo(
    () => new Set(entries.map((entry) => entry.key)),
    [entries]
  );

  const visibleSearchGroups = useMemo<SearchOptionGroup[]>(
    () =>
      [
        { id: "quests", label: "Quests", options: questSearchOptions },
        {
          id: "achievement_diaries",
          label: "Achievement diaries",
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

  const emptyMessage = itemSearchLoading
    ? "Loading..."
    : trimmedQuery
      ? "Sin resultados"
      : "Escribe para buscar";

  const updateEntry = useCallback(
    (entryKey: string, updater: EntryUpdater) => {
      applyEntries((previousEntries) =>
        previousEntries.map((entry) =>
          entry.key === entryKey ? updater(entry) : entry
        )
      );
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
      if (selectedEntryKeys.has(option.entryKey)) {
        setQuery("");
        return;
      }

      if (option.kind === "item") {
        applyEntries((previousEntries) => [
          ...previousEntries,
          {
            kind: "item",
            key: option.entryKey,
            id: option.id,
            quantity: 1,
            reason: null,
            isRequired: true,
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
            key: option.entryKey,
            name: option.name,
            stage: 2,
            reason: null,
            isRequired: true,
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
            key: option.entryKey,
            name: option.name,
            tier: option.tier,
            stage: 2,
            reason: null,
            isRequired: true,
          },
        ]);
        setQuery("");
        return;
      }

      applyEntries((previousEntries) => [
        ...previousEntries,
        {
          kind: "skill",
          key: option.entryKey,
          skill: option.skill,
          level: 1,
          reason: null,
          isRequired: true,
        },
      ]);
      setQuery("");
    },
    [applyEntries, selectedEntryKeys]
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
    emptyMessage,
    itemSearchError,
    itemSearchLoadingMore,
    questIconUrl,
    achievementDiaryIconUrl,
    selectedEntryKeys,
    visibleSearchGroups,
    itemEntries,
    questEntries,
    achievementDiaryEntries,
    skillEntries,
    handleSearchListScroll,
    handleSelectOption,
    updateEntry,
    removeEntry,
    getItemName,
    getItemIcon,
  };
}
