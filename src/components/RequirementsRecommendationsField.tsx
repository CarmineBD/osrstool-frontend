import {
  Fragment,
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
  type AchievementDiaryOption,
  type Item,
  type ItemSearchResponse,
  type ItemSearchResult,
  type QuestOption,
  type SkillOption,
  type Variant,
} from "@/lib/api";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { IconX } from "@tabler/icons-react";

const ITEM_SEARCH_LIMIT = 5;
const LOCAL_SEARCH_LIMIT = 5;
const ITEM_SEARCH_DEBOUNCE_MS = 200;
const SCROLL_BOTTOM_THRESHOLD_PX = 24;

function hasMoreItemPages(
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

type StageRequirement = 1 | 2;
type RequirementPayload = Variant["requirements"];
type RecommendationPayload = Variant["recommendations"];
type DiaryTier = AchievementDiaryOption["tier"];

interface UnifiedEntryBase {
  key: string;
  reason: string | null;
  isRequired: boolean;
}

interface UnifiedItemEntry extends UnifiedEntryBase {
  kind: "item";
  id: number;
  quantity: number;
  name?: string;
  iconUrl?: string;
}

interface UnifiedSkillEntry extends UnifiedEntryBase {
  kind: "skill";
  skill: string;
  level: number;
}

interface UnifiedQuestEntry extends UnifiedEntryBase {
  kind: "quest";
  name: string;
  stage: StageRequirement;
}

interface UnifiedAchievementDiaryEntry extends UnifiedEntryBase {
  kind: "achievement_diary";
  name: string;
  tier?: DiaryTier;
  stage: StageRequirement;
}

type UnifiedEntry =
  | UnifiedItemEntry
  | UnifiedSkillEntry
  | UnifiedQuestEntry
  | UnifiedAchievementDiaryEntry;

type SearchOption =
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

interface RequirementsRecommendationsFieldProps {
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

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeReason(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toPayloadReason(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeStage(value: unknown): StageRequirement {
  return Number(value) === 1 ? 1 : 2;
}

function normalizeTier(value: unknown): DiaryTier {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : trimmed;
  }
  return undefined;
}

function itemEntryKey(id: number): string {
  return `item:${id}`;
}

function skillEntryKey(skill: string): string {
  return `skill:${normalizeText(skill)}`;
}

function questEntryKey(name: string): string {
  return `quest:${normalizeText(name)}`;
}

function achievementDiaryEntryKey(name: string, tier?: DiaryTier): string {
  const tierKey = tier === undefined ? "" : `::${normalizeText(String(tier))}`;
  return `achievement_diary:${normalizeText(name)}${tierKey}`;
}

function formatAchievementDiaryLabel(name: string, tier?: DiaryTier): string {
  return tier === undefined ? name : `${name} - ${String(tier)}`;
}

function formatRequiredLabel(isRequired: boolean): string {
  return isRequired ? "Required" : "Recommended";
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

function hasRequirementContent(value: RequirementPayload | undefined): boolean {
  if (!value) return false;
  return (
    (value.items?.length ?? 0) > 0 ||
    (value.levels?.length ?? 0) > 0 ||
    (value.quests?.length ?? 0) > 0 ||
    (value.achievement_diaries?.length ?? 0) > 0
  );
}

function mergeUnifiedEntry(map: Map<string, UnifiedEntry>, entry: UnifiedEntry) {
  const existing = map.get(entry.key);
  if (!existing) {
    map.set(entry.key, entry);
    return;
  }
  if (!existing.isRequired && entry.isRequired) {
    existing.isRequired = true;
  }
  if (!existing.reason && entry.reason) {
    existing.reason = entry.reason;
  }
}

function buildUnifiedEntries(
  requirements: RequirementPayload,
  recommendations?: RecommendationPayload
): UnifiedEntry[] {
  const map = new Map<string, UnifiedEntry>();

  const ingest = (source: RequirementPayload | undefined, isRequired: boolean) => {
    if (!source) return;

    for (const item of source.items ?? []) {
      const id = Number(item.id);
      if (!Number.isFinite(id)) continue;
      const quantity = Number(item.quantity);
      mergeUnifiedEntry(map, {
        kind: "item",
        key: itemEntryKey(id),
        id,
        quantity: Number.isFinite(quantity) ? Math.max(0, quantity) : 1,
        reason: normalizeReason(item.reason),
        isRequired,
      });
    }

    for (const level of source.levels ?? []) {
      const skill = level.skill?.trim();
      if (!skill) continue;
      const parsedLevel = Number(level.level);
      mergeUnifiedEntry(map, {
        kind: "skill",
        key: skillEntryKey(skill),
        skill,
        level: Number.isFinite(parsedLevel) ? Math.max(0, parsedLevel) : 1,
        reason: normalizeReason(level.reason),
        isRequired,
      });
    }

    for (const quest of source.quests ?? []) {
      const name = quest.name?.trim();
      if (!name) continue;
      mergeUnifiedEntry(map, {
        kind: "quest",
        key: questEntryKey(name),
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
      mergeUnifiedEntry(map, {
        kind: "achievement_diary",
        key: achievementDiaryEntryKey(name, tier),
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

  const kindOrder: Record<UnifiedEntry["kind"], number> = {
    item: 0,
    quest: 1,
    achievement_diary: 2,
    skill: 3,
  };

  return Array.from(map.values()).sort((a, b) => {
    const byKind = kindOrder[a.kind] - kindOrder[b.kind];
    if (byKind !== 0) return byKind;
    return getEntryLabel(a).localeCompare(getEntryLabel(b));
  });
}

function splitUnifiedEntries(entries: UnifiedEntry[]): {
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
      ? { items: requiredItems, levels: requiredLevels, quests: requiredQuests, diaries: requiredDiaries }
      : {
          items: recommendedItems,
          levels: recommendedLevels,
          quests: recommendedQuests,
          diaries: recommendedDiaries,
        };

    if (entry.kind === "item") {
      target.items.push({
        id: entry.id,
        quantity: Math.max(0, Number(entry.quantity) || 0),
        ...(reason ? { reason } : {}),
      });
      continue;
    }
    if (entry.kind === "skill") {
      target.levels.push({
        skill: entry.skill,
        level: Math.max(0, Number(entry.level) || 0),
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

function isItemEntry(entry: UnifiedEntry): entry is UnifiedItemEntry {
  return entry.kind === "item";
}
function isSkillEntry(entry: UnifiedEntry): entry is UnifiedSkillEntry {
  return entry.kind === "skill";
}
function isQuestEntry(entry: UnifiedEntry): entry is UnifiedQuestEntry {
  return entry.kind === "quest";
}
function isAchievementDiaryEntry(
  entry: UnifiedEntry
): entry is UnifiedAchievementDiaryEntry {
  return entry.kind === "achievement_diary";
}

export function RequirementsRecommendationsField({
  requirements,
  recommendations,
  skillOptions,
  questOptions,
  achievementDiaryOptions,
  onChange,
}: RequirementsRecommendationsFieldProps) {
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
    () => JSON.stringify({ requirements: requirements ?? {}, recommendations: recommendations ?? {} }),
    [requirements, recommendations]
  );

  useEffect(() => {
    setEntries(buildUnifiedEntries(requirements, recommendations));
  }, [sourceSignature, requirements, recommendations]);

  const applyEntries = (updater: (prev: UnifiedEntry[]) => UnifiedEntry[]) => {
    setEntries((prev) => {
      const next = updater(prev);
      onChange(splitUnifiedEntries(next));
      return next;
    });
  };

  const selectedItemIdsKey = useMemo(
    () =>
      Array.from(
        new Set(entries.filter(isItemEntry).map((entry) => Number(entry.id) || 0))
      ).join(","),
    [entries]
  );

  useEffect(() => {
    let active = true;
    const ids = selectedItemIdsKey
      ? selectedItemIdsKey
          .split(",")
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
      : [];
    if (ids.length === 0) {
      setItemsMap({});
      return;
    }

    fetchItems(ids)
      .then((data) => {
        if (active) setItemsMap(data ?? {});
      })
      .catch(() => {
        if (active) setItemsMap({});
      });

    return () => {
      active = false;
    };
  }, [selectedItemIdsKey]);

  useEffect(() => {
    const trimmed = query.trim();
    itemSearchLoadControllerRef.current?.abort();
    itemSearchLoadControllerRef.current = null;

    if (!trimmed) {
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
      searchItems(trimmed, ITEM_SEARCH_LIMIT, 1, controller.signal)
        .then((response) => {
          if (itemSearchRequestIdRef.current !== requestId) return;
          const nextItems = response.items.slice(0, ITEM_SEARCH_LIMIT);
          const resolvedPage = response.page ?? 1;
          setItemSearchResults(nextItems);
          setItemSearchPage(resolvedPage);
          setItemSearchHasMore(hasMoreItemPages(response, 1, ITEM_SEARCH_LIMIT));
          setItemSearchCache((prev) => {
            if (nextItems.length === 0) return prev;
            const next = { ...prev };
            nextItems.forEach((item) => {
              next[item.id] = item;
            });
            return next;
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
    const trimmed = query.trim();
    if (
      !trimmed ||
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

    searchItems(trimmed, ITEM_SEARCH_LIMIT, nextPage, controller.signal)
      .then((response) => {
        if (itemSearchRequestIdRef.current !== requestId) return;
        const nextItems = response.items.slice(0, ITEM_SEARCH_LIMIT);
        const resolvedPage = response.page ?? nextPage;

        setItemSearchResults((prev) => {
          if (nextItems.length === 0) return prev;
          const seen = new Set(prev.map((item) => item.id));
          const merged = [...prev];
          nextItems.forEach((item) => {
            if (seen.has(item.id)) return;
            merged.push(item);
            seen.add(item.id);
          });
          return merged;
        });
        setItemSearchPage(resolvedPage);
        setItemSearchHasMore(
          hasMoreItemPages(response, nextPage, ITEM_SEARCH_LIMIT)
        );
        setItemSearchCache((prev) => {
          if (nextItems.length === 0) return prev;
          const next = { ...prev };
          nextItems.forEach((item) => {
            next[item.id] = item;
          });
          return next;
        });
        setItemSearchLoadingMore(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (itemSearchRequestIdRef.current !== requestId) return;
        console.error("Item search failed", error);
        setItemSearchLoadingMore(false);
        setItemSearchError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los items."
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
    const unique = new Map<string, string>();
    for (const option of skillOptions) {
      const name = option.name?.trim();
      if (!name) continue;
      const key = normalizeText(name);
      if (!unique.has(key)) unique.set(key, name);
    }
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [skillOptions]);

  const normalizedQuestOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const option of questOptions) {
      const name = option.name?.trim();
      if (!name) continue;
      const key = normalizeText(name);
      if (!unique.has(key)) unique.set(key, name);
    }
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [questOptions]);

  const normalizedAchievementDiaryOptions = useMemo(() => {
    const unique = new Map<string, { name: string; tier?: DiaryTier }>();
    for (const option of achievementDiaryOptions) {
      const name = option.name?.trim();
      if (!name) continue;
      const tier = normalizeTier(option.tier);
      const key = achievementDiaryEntryKey(name, tier);
      if (!unique.has(key)) unique.set(key, { name, tier });
    }
    return Array.from(unique.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) =>
        formatAchievementDiaryLabel(a.name, a.tier).localeCompare(
          formatAchievementDiaryLabel(b.name, b.tier)
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
  }, [trimmedQuery, normalizedAchievementDiaryOptions]);

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
  }, [trimmedQuery, normalizedSkillOptions]);

  const selectedEntryKeys = useMemo(
    () => new Set(entries.map((entry) => entry.key)),
    [entries]
  );

  const visibleSearchGroups = useMemo(
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

  const updateEntry = (
    entryKey: string,
    updater: (entry: UnifiedEntry) => UnifiedEntry
  ) => {
    applyEntries((prev) =>
      prev.map((entry) => (entry.key === entryKey ? updater(entry) : entry))
    );
  };

  const removeEntry = (entryKey: string) => {
    applyEntries((prev) => prev.filter((entry) => entry.key !== entryKey));
  };

  const addSearchOption = (option: SearchOption | null) => {
    if (!option) return;
    if (selectedEntryKeys.has(option.entryKey)) {
      setQuery("");
      return;
    }

    if (option.kind === "item") {
      applyEntries((prev) => [
        ...prev,
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
      applyEntries((prev) => [
        ...prev,
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
      applyEntries((prev) => [
        ...prev,
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
    applyEntries((prev) => [
      ...prev,
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
  };

  const itemEntries = useMemo(() => entries.filter(isItemEntry), [entries]);
  const questEntries = useMemo(() => entries.filter(isQuestEntry), [entries]);
  const achievementDiaryEntries = useMemo(
    () => entries.filter(isAchievementDiaryEntry),
    [entries]
  );
  const skillEntries = useMemo(() => entries.filter(isSkillEntry), [entries]);

  const questIconUrl = getUrlByType("quests") ?? undefined;
  const achievementDiaryIconUrl =
    getUrlByType("achievement_diaries") ?? undefined;

  const getItemName = (entry: UnifiedItemEntry): string =>
    itemsMap[entry.id]?.name ??
    itemSearchCache[entry.id]?.name ??
    entry.name ??
    `#${entry.id}`;

  const getItemIcon = (entry: UnifiedItemEntry): string | undefined =>
    itemsMap[entry.id]?.iconUrl ??
    itemSearchCache[entry.id]?.iconUrl ??
    entry.iconUrl;

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">
        Requirements & Recommendations
      </label>
      <Combobox<SearchOption>
        inputValue={query}
        onInputValueChange={(value) => setQuery(value)}
        onValueChange={(value) => addSearchOption(value)}
        filter={null}
        itemToStringLabel={(item) => item.label}
        itemToStringValue={(item) => item.key}
        isItemEqualToValue={(a, b) => {
          if (!a || !b) return false;
          return a.key === b.key;
        }}
      >
        <ComboboxInput
          className="w-full"
          placeholder="Buscar items, quests, achievement diaries o skills..."
          showClear={query.trim().length > 0}
        />
        <ComboboxContent>
          <ComboboxList onScroll={handleSearchListScroll}>
            {visibleSearchGroups.map((group, index) => (
              <Fragment key={group.id}>
                {index > 0 ? <ComboboxSeparator /> : null}
                <ComboboxGroup>
                  <ComboboxLabel>{group.label}</ComboboxLabel>
                  {group.options.map((option) => {
                    const isAdded = selectedEntryKeys.has(option.entryKey);
                    return (
                      <ComboboxItem
                        key={option.key}
                        value={option}
                        disabled={isAdded}
                      >
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
                          {option.kind === "skill" &&
                          getUrlByType(option.skill) ? (
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
                            <span className="text-xs text-muted-foreground">
                              Agregado
                            </span>
                          ) : null}
                        </div>
                      </ComboboxItem>
                    );
                  })}
                </ComboboxGroup>
              </Fragment>
            ))}
            {itemSearchLoadingMore ? (
              <div className="px-2 py-1 text-xs text-muted-foreground">
                Loading...
              </div>
            ) : null}
          </ComboboxList>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          {itemSearchError ? (
            <div className="px-2 py-1 text-xs text-destructive">
              {itemSearchError}
            </div>
          ) : null}
        </ComboboxContent>
      </Combobox>

      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Items</h4>
          <Table className="rounded-md border">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[140px]">Quantity</TableHead>
                <TableHead className="w-[260px]">Reason</TableHead>
                <TableHead className="w-[140px]">Is required</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    No hay items agregados.
                  </TableCell>
                </TableRow>
              ) : (
                itemEntries.map((entry) => (
                  <TableRow key={entry.key}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getItemIcon(entry) ? (
                          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                            <img
                              src={getItemIcon(entry)}
                              alt={getItemName(entry)}
                              className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                            />
                          </div>
                        ) : null}
                        <span>{getItemName(entry)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={entry.quantity}
                        onChange={(event) => {
                          const value = event.target.value;
                          const parsed = value === "" ? 0 : Number(value);
                          if (!Number.isFinite(parsed)) return;
                          updateEntry(entry.key, (current) =>
                            current.kind === "item"
                              ? { ...current, quantity: Math.max(0, parsed) }
                              : current
                          );
                        }}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Opcional"
                        value={entry.reason ?? ""}
                        onChange={(event) =>
                          updateEntry(entry.key, (current) => ({
                            ...current,
                            reason: normalizeReason(event.target.value),
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={entry.isRequired}
                          onCheckedChange={(checked) =>
                            updateEntry(entry.key, (current) => ({
                              ...current,
                              isRequired: checked,
                            }))
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {formatRequiredLabel(entry.isRequired)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove item requirement"
                        onClick={() => removeEntry(entry.key)}
                      >
                        <IconX size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Quests</h4>
          <Table className="rounded-md border">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[160px]">Completed</TableHead>
                <TableHead className="w-[260px]">Reason</TableHead>
                <TableHead className="w-[140px]">Is required</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    No hay quests agregadas.
                  </TableCell>
                </TableRow>
              ) : (
                questEntries.map((entry) => (
                  <TableRow key={entry.key}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {questIconUrl ? (
                          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                            <img
                              src={questIconUrl}
                              alt="quests_icon"
                              className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                            />
                          </div>
                        ) : null}
                        <span>{entry.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={entry.stage === 2}
                          onCheckedChange={(checked) =>
                            updateEntry(entry.key, (current) =>
                              current.kind === "quest"
                                ? { ...current, stage: checked ? 2 : 1 }
                                : current
                            )
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {entry.stage === 2 ? "Completed" : "Started"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Opcional"
                        value={entry.reason ?? ""}
                        onChange={(event) =>
                          updateEntry(entry.key, (current) => ({
                            ...current,
                            reason: normalizeReason(event.target.value),
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={entry.isRequired}
                          onCheckedChange={(checked) =>
                            updateEntry(entry.key, (current) => ({
                              ...current,
                              isRequired: checked,
                            }))
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {formatRequiredLabel(entry.isRequired)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove quest requirement"
                        onClick={() => removeEntry(entry.key)}
                      >
                        <IconX size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Achievement Diaries</h4>
          <Table className="rounded-md border">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[160px]">Completed</TableHead>
                <TableHead className="w-[260px]">Reason</TableHead>
                <TableHead className="w-[140px]">Is required</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {achievementDiaryEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    No hay achievement diaries agregadas.
                  </TableCell>
                </TableRow>
              ) : (
                achievementDiaryEntries.map((entry) => (
                  <TableRow key={entry.key}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {achievementDiaryIconUrl ? (
                          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                            <img
                              src={achievementDiaryIconUrl}
                              alt="achievement_diaries_icon"
                              className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                            />
                          </div>
                        ) : null}
                        <span>
                          {formatAchievementDiaryLabel(entry.name, entry.tier)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={entry.stage === 2}
                          onCheckedChange={(checked) =>
                            updateEntry(entry.key, (current) =>
                              current.kind === "achievement_diary"
                                ? { ...current, stage: checked ? 2 : 1 }
                                : current
                            )
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {entry.stage === 2 ? "Completed" : "Started"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Opcional"
                        value={entry.reason ?? ""}
                        onChange={(event) =>
                          updateEntry(entry.key, (current) => ({
                            ...current,
                            reason: normalizeReason(event.target.value),
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={entry.isRequired}
                          onCheckedChange={(checked) =>
                            updateEntry(entry.key, (current) => ({
                              ...current,
                              isRequired: checked,
                            }))
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {formatRequiredLabel(entry.isRequired)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove achievement diary requirement"
                        onClick={() => removeEntry(entry.key)}
                      >
                        <IconX size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Skills</h4>
          <Table className="rounded-md border">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[140px]">Level</TableHead>
                <TableHead className="w-[260px]">Reason</TableHead>
                <TableHead className="w-[140px]">Is required</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skillEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    No hay skills agregadas.
                  </TableCell>
                </TableRow>
              ) : (
                skillEntries.map((entry) => (
                  <TableRow key={entry.key}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getUrlByType(entry.skill) ? (
                          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                            <img
                              src={getUrlByType(entry.skill) ?? ""}
                              alt={`${entry.skill}_icon`}
                              className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                            />
                          </div>
                        ) : null}
                        <span>{entry.skill}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={entry.level}
                        onChange={(event) => {
                          const value = event.target.value;
                          const parsed = value === "" ? 0 : Number(value);
                          if (!Number.isFinite(parsed)) return;
                          updateEntry(entry.key, (current) =>
                            current.kind === "skill"
                              ? { ...current, level: Math.max(0, parsed) }
                              : current
                          );
                        }}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Opcional"
                        value={entry.reason ?? ""}
                        onChange={(event) =>
                          updateEntry(entry.key, (current) => ({
                            ...current,
                            reason: normalizeReason(event.target.value),
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={entry.isRequired}
                          onCheckedChange={(checked) =>
                            updateEntry(entry.key, (current) => ({
                              ...current,
                              isRequired: checked,
                            }))
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {formatRequiredLabel(entry.isRequired)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove skill requirement"
                        onClick={() => removeEntry(entry.key)}
                      >
                        <IconX size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default RequirementsRecommendationsField;
