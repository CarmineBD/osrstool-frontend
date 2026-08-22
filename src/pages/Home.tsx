import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
} from "react";
import { MethodsList } from "../features/methods/MethodsList";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUsername } from "@/contexts/UsernameContext";
import { useAuth } from "@/auth/AuthProvider";
import { CircleHelp, Filter, GripVertical, Search, Table2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UsernameFetchNotice } from "@/components/UsernameFetchNotice";
import {
  DEFAULT_IGNORED_METHOD_TAGS,
  fetchMethodTags,
  type MethodsFilters,
} from "@/lib/api";
import { getUrlByType } from "@/lib/utils";
import { fetchMe } from "@/lib/me";
import { QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";
import { useSeo } from "@/hooks/useSeo";
import { OSRS_SKILLS, formatSkillName } from "@/lib/skills";
import {
  getDefaultMethodsTableFieldsState,
  getLegacyMethodsTableColumnStorageKey,
  getMethodsTableColumns,
  getMethodsTableColumnStorageKey,
  getMethodsTableColumnStorageKeys,
  REQUIRED_METHODS_TABLE_COLUMN_ID,
  sanitizeMethodsTableFieldsState,
  type MethodsTableColumnId,
} from "@/features/methods/tableColumns";
import { MethodTagsFilterCombobox } from "@/features/methods/MethodTagsFilterCombobox";
import {
  MAX_CLICK_INTENSITY,
  normalizeBoundedText,
  SEARCH_QUERY_MAX_LENGTH,
} from "@/lib/validation";

type SeoConfig = {
  title: string;
  description: string;
  path: string;
  keywords?: string;
};

export type Props = {
  lockedSkill?: string;
  pageTitle?: string;
  seo?: SeoConfig;
};
type SortConfig = {
  sortBy?: MethodsFilters["sortBy"];
  order?: MethodsFilters["order"];
};

const DEFAULT_SORT_CONFIG: SortConfig = {
  sortBy: "highProfit",
  order: "desc",
};

const SKILL_OPTIONS = ["combat", ...OSRS_SKILLS] as const;
const METHOD_SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_SEO: SeoConfig = {
  title: "All Methods | RSMethods",
  description:
    "Browse every OSRS method with real data and filter by category, risk, AFK level, and skills.",
  path: "/allMethods",
  keywords: "all methods osrs, osrs moneymaking list, rsmethods methods",
};

export function Home({ lockedSkill, pageTitle, seo }: Props) {
  const normalizedLockedSkill = lockedSkill?.trim().toLowerCase();
  const hasLockedSkill = !!normalizedLockedSkill;
  const showAllMethodsIntro = !hasLockedSkill && !pageTitle;
  const lockedSkillLabel = normalizedLockedSkill
    ? formatSkillName(normalizedLockedSkill)
    : "";
  const seoConfig = seo ?? DEFAULT_SEO;

  useSeo(seoConfig);

  const { username } = useUsername();
  const normalizedUsername = username.trim();
  const hasUsername = normalizedUsername.length > 0;
  const { session, user } = useAuth();
  const [methodInput, setMethodInput] = useState<string>("");
  const [debouncedMethodInput, setDebouncedMethodInput] = useState<string>("");
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
  const [isUsernameDataEnabled, setIsUsernameDataEnabled] =
    useState<boolean>(true);

  const [category, setCategory] = useState<string>("");
  const [clickIntensity, setClickIntensity] = useState<number>(MAX_CLICK_INTENSITY);
  const [appliedClickIntensity, setAppliedClickIntensity] =
    useState<number>(MAX_CLICK_INTENSITY);
  const [afkiness, setAfkiness] = useState<number>(0);
  const [appliedAfkiness, setAppliedAfkiness] = useState<number>(0);
  const [riskLevel] = useState<string>("");
  const [givesExperience, setGivesExperience] = useState<boolean | undefined>(
    undefined,
  );
  const [skill, setSkill] = useState<string>(normalizedLockedSkill ?? "");
  const [showProfitables, setShowProfitables] = useState<boolean | undefined>(
    undefined,
  );
  const [showOnlyFreeToPlay, setShowOnlyFreeToPlay] = useState(false);
  const [ignoredTags, setIgnoredTags] = useState(DEFAULT_IGNORED_METHOD_TAGS);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>(DEFAULT_SORT_CONFIG);
  const previousUserIdRef = useRef<string | null>(null);
  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: !!session,
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });
  const isSuperAdmin = meData?.data?.role === "super_admin";
  const { data: methodTagOptions = [] } = useQuery({
    queryKey: ["method-tags"],
    queryFn: fetchMethodTags,
    enabled: isFiltersOpen,
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });
  const tableColumns = useMemo(
    () => getMethodsTableColumns(hasLockedSkill),
    [hasLockedSkill],
  );
  const defaultTableFieldsState = useMemo(
    () => getDefaultMethodsTableFieldsState(hasLockedSkill),
    [hasLockedSkill],
  );
  const defaultOrderedColumnIds = defaultTableFieldsState.orderedColumnIds;
  const defaultVisibleColumnIds = defaultTableFieldsState.visibleColumnIds;
  const [orderedColumnIds, setOrderedColumnIds] = useState<MethodsTableColumnId[]>(
    defaultOrderedColumnIds,
  );
  const [visibleColumnIds, setVisibleColumnIds] = useState<MethodsTableColumnId[]>(
    defaultVisibleColumnIds,
  );
  const [hasLoadedTableFields, setHasLoadedTableFields] = useState(false);
  const [draggedColumnId, setDraggedColumnId] =
    useState<MethodsTableColumnId | null>(null);
  const [dragOverColumnId, setDragOverColumnId] =
    useState<MethodsTableColumnId | null>(null);
  const [isTableFieldsOpen, setIsTableFieldsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  const dragPointerOffsetRef = useRef({ x: 18, y: 18 });
  const currentUserId = user?.id ?? null;
  const tableFieldsStorageKey = currentUserId
    ? getMethodsTableColumnStorageKey(currentUserId, hasLockedSkill)
    : null;
  const legacyTableFieldsStorageKey = currentUserId
    ? getLegacyMethodsTableColumnStorageKey(currentUserId, hasLockedSkill)
    : null;
  const orderedTableColumns = useMemo(() => {
    const columnsById = new Map(tableColumns.map((column) => [column.id, column]));
    return orderedColumnIds
      .map((columnId) => columnsById.get(columnId))
      .filter((column): column is (typeof tableColumns)[number] => !!column);
  }, [orderedColumnIds, tableColumns]);

  useEffect(() => {
    if (!normalizedLockedSkill) return;

    setSkill(normalizedLockedSkill);
  }, [normalizedLockedSkill]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedMethodInput(methodInput);
    }, METHOD_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [methodInput]);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    if (previousUserId && previousUserId !== currentUserId) {
      for (const storageKey of getMethodsTableColumnStorageKeys(previousUserId)) {
        window.sessionStorage.removeItem(storageKey);
      }
    }
    previousUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    setHasLoadedTableFields(false);
    setDraggedColumnId(null);
    setDragOverColumnId(null);
    setIsResetConfirmOpen(false);

    if (!tableFieldsStorageKey) {
      setOrderedColumnIds(defaultTableFieldsState.orderedColumnIds);
      setVisibleColumnIds(defaultTableFieldsState.visibleColumnIds);
      setHasLoadedTableFields(true);
      return;
    }

    const storedValue =
      window.sessionStorage.getItem(tableFieldsStorageKey) ??
      (legacyTableFieldsStorageKey
        ? window.sessionStorage.getItem(legacyTableFieldsStorageKey)
        : null);
    if (!storedValue) {
      setOrderedColumnIds(defaultTableFieldsState.orderedColumnIds);
      setVisibleColumnIds(defaultTableFieldsState.visibleColumnIds);
      setHasLoadedTableFields(true);
      return;
    }

    try {
      const parsedValue = JSON.parse(storedValue);
      const sanitizedValue = sanitizeMethodsTableFieldsState(
        parsedValue,
        hasLockedSkill,
      );
      setOrderedColumnIds(sanitizedValue.orderedColumnIds);
      setVisibleColumnIds(sanitizedValue.visibleColumnIds);
    } catch {
      setOrderedColumnIds(defaultTableFieldsState.orderedColumnIds);
      setVisibleColumnIds(defaultTableFieldsState.visibleColumnIds);
    }

    setHasLoadedTableFields(true);
  }, [
    defaultTableFieldsState,
    hasLockedSkill,
    legacyTableFieldsStorageKey,
    tableFieldsStorageKey,
  ]);

  useEffect(() => {
    if (!tableFieldsStorageKey || !hasLoadedTableFields) return;

    window.sessionStorage.setItem(
      tableFieldsStorageKey,
      JSON.stringify({
        orderedColumnIds,
        visibleColumnIds,
      }),
    );
    if (legacyTableFieldsStorageKey) {
      window.sessionStorage.removeItem(legacyTableFieldsStorageKey);
    }
  }, [
    hasLoadedTableFields,
    legacyTableFieldsStorageKey,
    orderedColumnIds,
    tableFieldsStorageKey,
    visibleColumnIds,
  ]);

  const clearDragPreview = () => {
    if (!dragPreviewRef.current) return;
    dragPreviewRef.current.remove();
    dragPreviewRef.current = null;
  };

  useEffect(() => clearDragPreview, []);

  const parseInteger = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed)) return undefined;
    return parsed;
  };

  const handleSortChange = (
    sortBy?: MethodsFilters["sortBy"],
    order?: MethodsFilters["order"],
  ) => {
    setSortConfig({ sortBy, order });
  };

  const parsedRiskLevel = useMemo(() => {
    const parsed = parseInteger(riskLevel);
    if (parsed === undefined) return undefined;
    return Math.max(1, Math.min(100, parsed));
  }, [riskLevel]);

  const methodName = useMemo(
    () => debouncedMethodInput.trim(),
    [debouncedMethodInput],
  );
  const effectiveUsername =
    hasUsername && isUsernameDataEnabled ? normalizedUsername : "";

  const appliedFilterCount = useMemo(() => {
    let count = 0;
    if (category) count += 1;
    if (appliedClickIntensity < MAX_CLICK_INTENSITY) count += 1;
    if (appliedAfkiness > 0) count += 1;
    if (parsedRiskLevel !== undefined) count += 1;
    if (!hasLockedSkill && skill) count += 1;
    if (givesExperience !== undefined) count += 1;
    if (showProfitables !== undefined) count += 1;
    if (showOnlyFreeToPlay) count += 1;
    if (ignoredTags.length > 0) count += 1;
    if (isSuperAdmin && enabled !== true) count += 1;
    return count;
  }, [
    category,
    appliedClickIntensity,
    appliedAfkiness,
    parsedRiskLevel,
    hasLockedSkill,
    skill,
    givesExperience,
    showProfitables,
    showOnlyFreeToPlay,
    ignoredTags,
    isSuperAdmin,
    enabled,
  ]);

  const appliedFilters = useMemo<MethodsFilters>(
    () => ({
      category: category ? (category as MethodsFilters["category"]) : undefined,
      clickIntensity:
        appliedClickIntensity >= MAX_CLICK_INTENSITY
          ? undefined
          : appliedClickIntensity,
      afkiness: appliedAfkiness <= 0 ? undefined : appliedAfkiness,
      riskLevel: parsedRiskLevel,
      showOnlyFreeToPlay,
      givesExperience,
      // Keep the public default explicit. Previously this changed from undefined
      // to true when /users/me finished, triggering an identical second search.
      enabled,
      skill: normalizedLockedSkill ?? (skill || undefined),
      variants: normalizedLockedSkill ? "all" : undefined,
      showProfitables,
      ignoredTags: ignoredTags.length > 0 ? ignoredTags : undefined,
      sortBy: sortConfig.sortBy,
      order: sortConfig.order,
    }),
    [
      category,
      appliedClickIntensity,
      appliedAfkiness,
      parsedRiskLevel,
      showOnlyFreeToPlay,
      givesExperience,
      isSuperAdmin,
      enabled,
      normalizedLockedSkill,
      skill,
      showProfitables,
      ignoredTags,
      sortConfig.sortBy,
      sortConfig.order,
    ],
  );

  const handleVisibleColumnChange = (
    columnId: MethodsTableColumnId,
    checked: boolean,
  ) => {
    if (columnId === REQUIRED_METHODS_TABLE_COLUMN_ID && !checked) {
      return;
    }

    setVisibleColumnIds((current) => {
      if (checked) {
        if (current.includes(columnId)) return current;
        return tableColumns
          .map((column) => column.id)
          .filter((id) => id === columnId || current.includes(id));
      }

      return current.filter((id) => id !== columnId);
    });
  };

  const handleColumnReorder = (
    draggedId: MethodsTableColumnId,
    targetId: MethodsTableColumnId,
  ) => {
    if (draggedId === targetId) return;

    setOrderedColumnIds((current) => {
      const draggedIndex = current.indexOf(draggedId);
      const targetIndex = current.indexOf(targetId);

      if (draggedIndex < 0 || targetIndex < 0) return current;

      const next = [...current];
      next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, draggedId);
      return next;
    });
  };

  const handleResetTableFields = () => {
    setOrderedColumnIds(defaultTableFieldsState.orderedColumnIds);
    setVisibleColumnIds(defaultTableFieldsState.visibleColumnIds);
    setDraggedColumnId(null);
    setDragOverColumnId(null);
    setIsResetConfirmOpen(false);
    clearDragPreview();
  };

  const handleTableFieldsOpenChange = (open: boolean) => {
    setIsTableFieldsOpen(open);

    if (!open) {
      setIsResetConfirmOpen(false);
      setDraggedColumnId(null);
      setDragOverColumnId(null);
      clearDragPreview();
    }
  };

  const handleDragPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
  ) => {
    const draggableItem = event.currentTarget.closest("[data-table-field-item='true']");
    if (!(draggableItem instanceof HTMLElement)) return;

    const bounds = draggableItem.getBoundingClientRect();
    dragPointerOffsetRef.current = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  };

  const handleDragStart = (
    event: DragEvent<HTMLButtonElement>,
    columnId: MethodsTableColumnId,
  ) => {
    const draggableItem = event.currentTarget.closest("[data-table-field-item='true']");
    if (!(draggableItem instanceof HTMLElement)) return;

    clearDragPreview();

    const bounds = draggableItem.getBoundingClientRect();
    const preview = draggableItem.cloneNode(true);
    if (!(preview instanceof HTMLDivElement)) return;

    preview.style.position = "fixed";
    preview.style.top = "0";
    preview.style.left = "0";
    preview.style.width = `${Math.round(bounds.width)}px`;
    preview.style.pointerEvents = "none";
    preview.style.zIndex = "9999";
    preview.style.transform = "translate(-9999px, -9999px)";
    preview.style.boxShadow =
      "0 18px 40px color-mix(in oklab, var(--foreground) 14%, transparent), 0 6px 16px color-mix(in oklab, var(--foreground) 10%, transparent)";
    preview.style.borderColor =
      "color-mix(in oklab, var(--border) 82%, var(--background) 18%)";
    preview.style.background = "var(--background)";
    preview.style.opacity = "0.98";
    preview.setAttribute("aria-hidden", "true");

    document.body.appendChild(preview);
    dragPreviewRef.current = preview;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", columnId);
      event.dataTransfer.setDragImage(
        preview,
        dragPointerOffsetRef.current.x,
        dragPointerOffsetRef.current.y,
      );
    }

    setDraggedColumnId(columnId);
    setDragOverColumnId(columnId);
  };

  const handleDragEnd = () => {
    setDraggedColumnId(null);
    setDragOverColumnId(null);
    clearDragPreview();
  };

  const getTableFieldItemColumnId = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return null;

    const item = target.closest("[data-table-field-item='true']");
    if (!(item instanceof HTMLElement)) return null;

    const columnId = item.dataset.columnId;
    return (columnId as MethodsTableColumnId | undefined) ?? null;
  };

  const handleTableFieldsListDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!draggedColumnId) return;

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    const targetColumnId = getTableFieldItemColumnId(event.target);
    if (targetColumnId && dragOverColumnId !== targetColumnId) {
      setDragOverColumnId(targetColumnId);
    }
  };

  const handleTableFieldsListDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!draggedColumnId) return;

    const targetColumnId =
      getTableFieldItemColumnId(event.target) ?? dragOverColumnId;

    if (targetColumnId) {
      handleColumnReorder(draggedColumnId, targetColumnId);
    }

    setDragOverColumnId(null);
    setDraggedColumnId(null);
    clearDragPreview();
  };

  const isDefaultTableFieldsState = useMemo(() => {
    if (orderedColumnIds.length !== defaultOrderedColumnIds.length) return false;
    if (visibleColumnIds.length !== defaultVisibleColumnIds.length) return false;

    const hasDefaultOrder = defaultOrderedColumnIds.every(
      (columnId, index) => orderedColumnIds[index] === columnId,
    );

    if (!hasDefaultOrder) return false;

    return defaultVisibleColumnIds.every(
      (columnId, index) => visibleColumnIds[index] === columnId,
    );
  }, [
    defaultOrderedColumnIds,
    defaultVisibleColumnIds,
    orderedColumnIds,
    visibleColumnIds,
  ]);

  return (
    <div className="min-h-screen bg-surface-page">
      <div className="container mx-auto p-8 space-y-6">
        {!hasUsername ? (
          <UsernameFetchNotice state="info" className="sticky top-20 z-20" />
        ) : null}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold leading-9 tracking-tight">
              {pageTitle ?? "All Methods"}
            </h1>
            {showAllMethodsIntro ? (
              <p className="max-w-3xl text-sm leading-5 text-muted-foreground">
                Browse every currently available in-game method with live data.
                When a method has variants, this list shows the one with the
                best GP/hr result.
              </p>
            ) : null}
          </div>
          {isSuperAdmin && (
            <Button asChild>
              <Link to="/moneyMakingMethod/new">Add new method</Link>
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3 max-w-4xl">
          <div className="space-y-1">
            <div className="flex flex-col gap-2 flex-row sm:items-center">
              <div className="relative sm:basis-0 flex-1">
                <Input
                  type="text"
                  placeholder="Search by method name"
                  value={methodInput}
                  maxLength={SEARCH_QUERY_MAX_LENGTH}
                  onChange={(e) =>
                    setMethodInput(
                      normalizeBoundedText(
                        e.target.value,
                        SEARCH_QUERY_MAX_LENGTH,
                      ),
                    )
                  }
                  className="pr-9"
                />
                <Search
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <div className="flex items-center gap-2">
                <Popover
                  open={isTableFieldsOpen}
                  onOpenChange={handleTableFieldsOpenChange}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          aria-label="Table Fields"
                        >
                          <Table2 />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>Table Fields</TooltipContent>
                  </Tooltip>
                  <PopoverContent
                    align="end"
                    className="w-64 rounded-lg p-4"
                    sideOffset={8}
                  >
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold leading-5">
                            Table Fields
                          </p>
                          <p className="text-sm leading-5 text-muted-foreground">
                            Select visible columns and drag to reorder them.
                          </p>
                        </div>
                      </div>
                      <div
                        className="space-y-3"
                        role="list"
                        aria-label="Table fields"
                        onDragOver={handleTableFieldsListDragOver}
                        onDrop={handleTableFieldsListDrop}
                      >
                        {orderedTableColumns.map((column) => {
                          const isChecked = visibleColumnIds.includes(column.id);
                          const isRequiredColumn =
                            column.id === REQUIRED_METHODS_TABLE_COLUMN_ID;
                          const fieldCheckboxId = `table-field-${column.id}`;

                          return (
                            <div
                              key={column.id}
                              role="listitem"
                              aria-label={column.label}
                              data-table-field-item="true"
                              data-column-id={column.id}
                              className={`flex items-start gap-3 rounded-md border border-border/60 px-3 py-2 transition-colors ${
                                dragOverColumnId === column.id
                                  ? "bg-accent/40"
                                  : "bg-background"
                              } ${
                                draggedColumnId === column.id
                                  ? "opacity-60"
                                  : ""
                              }`}
                              onDragOver={(event) => {
                                if (!draggedColumnId) return;
                                event.preventDefault();
                                if (event.dataTransfer) {
                                  event.dataTransfer.dropEffect = "move";
                                }
                                if (dragOverColumnId !== column.id) {
                                  setDragOverColumnId(column.id);
                                }
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                if (!draggedColumnId) return;
                                handleColumnReorder(draggedColumnId, column.id);
                                setDragOverColumnId(null);
                                setDraggedColumnId(null);
                                clearDragPreview();
                              }}
                            >
                              <button
                                type="button"
                                draggable
                                aria-label={`Reorder ${column.label}`}
                                className="mt-0.5 shrink-0 cursor-grab rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
                                onPointerDown={handleDragPointerDown}
                                onDragStart={(event) =>
                                  handleDragStart(event, column.id)
                                }
                                onDragEnd={handleDragEnd}
                              >
                                <GripVertical className="h-4 w-4" />
                              </button>
                              <label
                                htmlFor={fieldCheckboxId}
                                className="flex items-start gap-3"
                              >
                                <input
                                  id={fieldCheckboxId}
                                  type="checkbox"
                                  className="mt-0.5 size-4 cursor-pointer accent-primary"
                                  checked={isChecked}
                                  disabled={isRequiredColumn}
                                  onChange={(event) =>
                                    handleVisibleColumnChange(
                                      column.id,
                                      event.currentTarget.checked,
                                    )
                                  }
                                />
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="block text-sm font-medium leading-5">
                                      {column.label}
                                    </span>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span
                                          className="inline-flex text-muted-foreground"
                                          aria-label={`${column.label} info`}
                                        >
                                          <CircleHelp className="h-3.5 w-3.5" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="right"
                                        sideOffset={6}
                                        className="max-w-56 text-left"
                                      >
                                        {column.description}
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  {isRequiredColumn ? (
                                    <p className="text-xs font-medium leading-4 text-muted-foreground">
                                      This column is always visible.
                                    </p>
                                  ) : null}
                                </div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-center pt-1">
                        <Popover
                          open={isResetConfirmOpen}
                          onOpenChange={setIsResetConfirmOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto text-xs"
                              disabled={isDefaultTableFieldsState}
                            >
                              Reset to default
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="center"
                            className="w-64 rounded-lg p-4"
                            side="top"
                            sideOffset={8}
                          >
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold leading-5">
                                  Reset table fields?
                                </p>
                                <p className="text-sm leading-5 text-muted-foreground">
                                  This will restore the default column order and visibility.
                                </p>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIsResetConfirmOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={handleResetTableFields}
                                >
                                  Confirm
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="relative shrink-0"
                  aria-expanded={isFiltersOpen}
                  aria-label={isFiltersOpen ? "Hide filters" : "Show filters"}
                  onClick={() => setIsFiltersOpen((previous) => !previous)}
                >
                  <Filter />
                  {appliedFilterCount > 0 ? (
                    <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                      {appliedFilterCount}
                    </span>
                  ) : null}
                </Button>
              </div>
            </div>
          </div>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
              isFiltersOpen
                ? "grid-rows-[1fr] opacity-100"
                : "pointer-events-none grid-rows-[0fr] opacity-0"
            }`}
            aria-hidden={!isFiltersOpen}
          >
            <div className="overflow-hidden">
              <div className="space-y-3 pt-1">
                <div className=" flex items-center justify-center gap-5 ">
                  <Separator className="bg-border/80 w-100" />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Filters
                  </p>
                  <Separator className="bg-border/80 w-100" />
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-3">
                  <div className="space-y-5">
                    <Field className="mx-auto grid gap-2 w-full">
                      <FieldLabel>Category</FieldLabel>
                      <Select
                        value={category}
                        onValueChange={(value) =>
                          setCategory(value === "__none__" ? "" : value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="__none__"
                            className="text-muted-foreground"
                          >
                            None
                          </SelectItem>
                          <SelectItem value="combat">Combat</SelectItem>
                          <SelectItem value="collecting">Collecting</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="skilling">Skilling</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field className="mx-auto grid gap-2 w-full">
                      <FieldLabel>Skill</FieldLabel>
                      <Select
                        disabled={lockedSkillLabel ? true : false}
                        value={
                          lockedSkillLabel
                            ? lockedSkillLabel.toLowerCase()
                            : skill
                        }
                        onValueChange={(value) =>
                          setSkill(value === "__none__" ? "" : value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Skill" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="__none__"
                            className="text-muted-foreground"
                          >
                            None
                          </SelectItem>
                          {SKILL_OPTIONS.map((skillOption) => {
                            const iconUrl = getUrlByType(skillOption);
                            return (
                              <SelectItem key={skillOption} value={skillOption}>
                                <span className="flex items-center gap-2">
                                  {iconUrl ? (
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                                      <img
                                        src={iconUrl}
                                        alt={`${skillOption}_icon`}
                                        className="max-h-full max-w-full object-contain"
                                        loading="lazy"
                                      />
                                    </span>
                                  ) : null}
                                  <span>{skillOption}</span>
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {hasLockedSkill ? (
                        <FieldDescription>
                          Skill locked: {lockedSkillLabel}
                        </FieldDescription>
                      ) : null}
                    </Field>

                    <Field className="mx-auto grid gap-2 w-full">
                      <div className="flex items-center justify-between gap-2">
                        <FieldLabel>Ignored tags</FieldLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto px-2 py-1 text-xs"
                          disabled={ignoredTags.length === 0}
                          onClick={() => setIgnoredTags([])}
                        >
                          Clear
                        </Button>
                      </div>
                      <MethodTagsFilterCombobox
                        options={methodTagOptions}
                        value={ignoredTags}
                        onValueChange={setIgnoredTags}
                      />
                      <FieldDescription>
                        Hide methods containing any selected tag.
                      </FieldDescription>
                    </Field>

                  </div>

                  <div className="space-y-5">
                    <Field className="mx-auto grid gap-2 w-full">
                      <div className="flex items-center justify-between gap-2">
                        <FieldLabel>Click intensity</FieldLabel>
                      </div>
                      <Slider
                        min={0}
                        max={MAX_CLICK_INTENSITY}
                        step={200}
                        value={[clickIntensity]}
                        onValueChange={(value) =>
                          setClickIntensity(value[0] ?? MAX_CLICK_INTENSITY)
                        }
                        onValueCommit={(value) => {
                          const nextValue = value[0] ?? MAX_CLICK_INTENSITY;
                          setClickIntensity(nextValue);
                          setAppliedClickIntensity(nextValue);
                        }}
                      />
                      <FieldDescription>
                        {clickIntensity >= MAX_CLICK_INTENSITY
                          ? "Unlimited"
                          : clickIntensity + " clicks per hour"}
                      </FieldDescription>
                    </Field>
                    <Field className="mx-auto grid gap-2 w-full">
                      <div className="flex items-center justify-between gap-2">
                        <FieldLabel>% AFK</FieldLabel>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        fillSide="end"
                        value={[afkiness]}
                        onValueChange={(value) => setAfkiness(value[0] ?? 0)}
                        onValueCommit={(value) => {
                          const nextValue = value[0] ?? 0;
                          setAfkiness(nextValue);
                          setAppliedAfkiness(nextValue);
                        }}
                      />
                      <FieldDescription>
                        {afkiness === 0 ? "No minimum" : `${afkiness}% or more`}
                      </FieldDescription>
                    </Field>
                  </div>

                  <div className="space-y-3">
                    <Field
                      className="flex items-center gap-2"
                      data-disabled={!hasUsername}
                    >
                      <FieldLabel>Use username data</FieldLabel>
                      <div>
                        <Switch
                          aria-label="Use username data"
                          checked={hasUsername && isUsernameDataEnabled}
                          disabled={!hasUsername}
                          onCheckedChange={setIsUsernameDataEnabled}
                        />
                        <FieldDescription>
                          {!hasUsername
                            ? "Enter your username to enable stat-based method filtering."
                            : isUsernameDataEnabled
                              ? "Filter methods by your fetched stats."
                              : "Ignore fetched username data and show all methods."}
                        </FieldDescription>
                      </div>
                    </Field>
                    <div className="flex items-center gap-2">
                      <Field className="flex items-center gap-2">
                        <FieldLabel>Profitable only</FieldLabel>
                        <div>
                          <Switch
                            checked={showProfitables ?? false}
                            onCheckedChange={(checked) =>
                              setShowProfitables(checked ? true : undefined)
                            }
                          />
                          <FieldDescription>
                            {showProfitables
                              ? "Show only profitable methods"
                              : "Include unprofitable methods"}
                          </FieldDescription>
                        </div>
                      </Field>
                    </div>
                    <Field className="flex items-center gap-2">
                      <FieldLabel>Gives experience</FieldLabel>
                      <div>
                        <Switch
                          checked={givesExperience ?? false}
                          onCheckedChange={(checked) =>
                            setGivesExperience(checked ? true : undefined)
                          }
                        />
                        <FieldDescription>
                          {givesExperience
                            ? "Show only methods that give experience"
                            : "Show all"}
                        </FieldDescription>
                      </div>
                    </Field>
                    <Field className="flex items-center gap-2">
                      <FieldLabel>F2P only</FieldLabel>
                        <div>
                          <Switch
                            aria-label="F2P only"
                            checked={showOnlyFreeToPlay}
                            onCheckedChange={setShowOnlyFreeToPlay}
                          />
                        <FieldDescription>
                          {showOnlyFreeToPlay
                            ? "Show only free-to-play methods"
                            : "Include members methods"}
                        </FieldDescription>
                      </div>
                    </Field>
                  </div>

                  {isSuperAdmin && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => setEnabled(checked)}
                      />
                      <span className="text-sm">Enabled methods</span>
                    </div>
                  )}
                </div>
                <Separator className="bg-border/80" />
              </div>
            </div>
          </div>
        </div>
        <MethodsList
          username={effectiveUsername}
          name={methodName}
          filters={appliedFilters}
          isSkillTable={hasLockedSkill}
          highlightSkill={normalizedLockedSkill}
          orderedColumnIds={orderedColumnIds}
          visibleColumnIds={visibleColumnIds}
          sortBy={sortConfig.sortBy}
          order={sortConfig.order}
          onSortChange={handleSortChange}
        />
      </div>
    </div>
  );
}
