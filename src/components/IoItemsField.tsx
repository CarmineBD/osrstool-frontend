import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type UIEvent,
} from "react";
import {
  fetchItems,
  searchItems,
  type IoItem,
  type Item,
  type ItemSearchResponse,
  type ItemSearchResult,
} from "@/lib/api";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  EDITOR_ERROR_TEXT_CLASS,
  EDITOR_FIELD_LABEL_CLASS,
  EDITOR_META_TEXT_CLASS,
  EDITOR_TABLE_HEADER_CLASS,
  EDITOR_TABLE_SURFACE_CLASS,
  EmptySelectionState,
  PixelArtIcon,
} from "@/components/method-editor/MethodEditorPrimitives";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  IconAdjustmentsHorizontal,
  IconGripVertical,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const SEARCH_LIMIT = 10;
const DEBOUNCE_MS = 200;
const SCROLL_BOTTOM_THRESHOLD_PX = 24;
const IO_TABLE_MIN_WIDTH_CLASS = "min-w-[380px]";
const IO_NAME_COLUMN_CLASS = "w-[36%]";
const IO_QUANTITY_COLUMN_CLASS = "w-[88px]";
const IO_REASON_COLUMN_CLASS = "w-[160px]";
const IO_ACTIONS_COLUMN_CLASS = "w-[72px]";

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

interface IoItemsFieldProps {
  label: string;
  items: IoItem[];
  onChange: (next: IoItem[]) => void;
  placeholder?: string;
}

export function IoItemsField({
  label,
  items,
  onChange,
  placeholder,
}: IoItemsFieldProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUntradeables, setShowUntradeables] = useState(false);
  const [itemsMap, setItemsMap] = useState<Record<number, Item>>({});
  const [searchCache, setSearchCache] = useState<
    Record<number, ItemSearchResult>
  >({});
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const requestIdRef = useRef(0);
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      loadMoreControllerRef.current?.abort();
    };
  }, []);

  const idsKey = useMemo(
    () => Array.from(new Set(items.map((item) => item.id))).join(","),
    [items]
  );

  useEffect(() => {
    let active = true;
    const ids = idsKey
      ? idsKey
          .split(",")
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value))
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
  }, [idsKey]);

  useEffect(() => {
    const trimmed = query.trim();
    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = null;

    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setLoadingMore(false);
      setCurrentPage(0);
      setHasMoreResults(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    setLoading(true);
    setLoadingMore(false);
    setCurrentPage(0);
    setHasMoreResults(false);
    setError(null);
    setResults([]);

    const timeout = setTimeout(() => {
      searchItems(trimmed, SEARCH_LIMIT, 1, controller.signal, {
        showUntradeables,
      })
        .then((response) => {
          if (requestIdRef.current !== requestId) return;
          const nextItems = response.items.slice(0, SEARCH_LIMIT);
          const resolvedPage = response.page ?? 1;
          setResults(nextItems);
          setCurrentPage(resolvedPage);
          setHasMoreResults(hasMoreItemPages(response, 1, SEARCH_LIMIT));
          setSearchCache((prev) => {
            if (nextItems.length === 0) return prev;
            const next = { ...prev };
            nextItems.forEach((item) => {
              next[item.id] = item;
            });
            return next;
          });
          setLoading(false);
          setError(null);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          console.error("Item search failed", err);
          setLoading(false);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load items."
          );
        });
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query, showUntradeables]);

  const loadMoreResults = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed || loading || loadingMore || !hasMoreResults) return;

    const requestId = ++requestIdRef.current;
    const nextPage = Math.max(1, currentPage + 1);
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;

    setLoadingMore(true);
    setError(null);

    searchItems(trimmed, SEARCH_LIMIT, nextPage, controller.signal, {
      showUntradeables,
    })
      .then((response) => {
        if (requestIdRef.current !== requestId) return;
        const nextItems = response.items.slice(0, SEARCH_LIMIT);
        const resolvedPage = response.page ?? nextPage;

        setResults((prev) => {
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
        setCurrentPage(resolvedPage);
        setHasMoreResults(hasMoreItemPages(response, nextPage, SEARCH_LIMIT));
        setSearchCache((prev) => {
          if (nextItems.length === 0) return prev;
          const next = { ...prev };
          nextItems.forEach((item) => {
            next[item.id] = item;
          });
          return next;
        });
        setLoadingMore(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (requestIdRef.current !== requestId) return;
        console.error("Item search failed", err);
        setLoadingMore(false);
        setError(
          err instanceof Error ? err.message : "Unable to load items."
        );
      })
      .finally(() => {
        if (loadMoreControllerRef.current === controller) {
          loadMoreControllerRef.current = null;
        }
      });
  }, [
    currentPage,
    hasMoreResults,
    loading,
    loadingMore,
    query,
    showUntradeables,
  ]);

  const handleResultsScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      const element = event.currentTarget;
      const distanceToBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      if (distanceToBottom > SCROLL_BOTTOM_THRESHOLD_PX) return;
      loadMoreResults();
    },
    [loadMoreResults]
  );

  const handleAddItem = (item: ItemSearchResult | null) => {
    if (!item) return;
    const exists = items.some((entry) => entry.id === item.id);
    if (exists) {
      setQuery("");
      return;
    }
    onChange([{ id: item.id, quantity: 1, reason: null }, ...items]);
    setQuery("");
  };

  const handleRemoveItem = (id: number) => {
    onChange(items.filter((entry) => entry.id !== id));
  };

  const handleQuantityChange = (id: number, value: string) => {
    const nextQuantity = value === "" ? 0 : Number(value);
    if (!Number.isFinite(nextQuantity)) return;
    onChange(
      items.map((entry) =>
        entry.id === id
          ? { ...entry, quantity: Math.max(0, nextQuantity) }
          : entry
      )
    );
  };

  const handleReasonChange = (id: number, value: string) => {
    const nextValue = value === "" ? null : value;
    onChange(
      items.map((entry) =>
        entry.id === id ? { ...entry, reason: nextValue } : entry
      )
    );
  };

  const handleDragStart = (event: DragEvent, id: number) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id.toString());
    const row = event.currentTarget.closest("tr");
    if (row instanceof HTMLElement) {
      const rect = row.getBoundingClientRect();
      const offsetX = Math.max(0, event.clientX - rect.left);
      const offsetY = Math.max(0, event.clientY - rect.top);
      event.dataTransfer.setDragImage(row, offsetX, offsetY);
    }
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragOver = (event: DragEvent, id: number) => {
    if (draggingId === null || draggingId === id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverId !== id) setDragOverId(id);
  };

  const handleDrop = (event: DragEvent, id: number) => {
    event.preventDefault();
    const data = event.dataTransfer.getData("text/plain");
    const sourceId = Number(data);
    if (!Number.isFinite(sourceId) || sourceId === id) {
      setDragOverId(null);
      return;
    }
    const fromIndex = items.findIndex((entry) => entry.id === sourceId);
    const toIndex = items.findIndex((entry) => entry.id === id);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      setDragOverId(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next);
    setDragOverId(null);
  };

  const getItemName = (id: number) =>
    itemsMap[id]?.name ?? searchCache[id]?.name ?? `#${id}`;

  const getItemIcon = (id: number) =>
    itemsMap[id]?.iconUrl ?? searchCache[id]?.iconUrl;

  const emptyMessage = query.trim() ? "No results found" : "Type to search";
  const emptySelectionMessage = "No items selected yet.";

  return (
    <div>
      <label className={EDITOR_FIELD_LABEL_CLASS}>{label}</label>
      <div className="flex items-start gap-2">
        <Combobox<ItemSearchResult>
          inputValue={query}
          onInputValueChange={(value) => setQuery(value)}
          onValueChange={(value) => handleAddItem(value)}
          filter={null}
          itemToStringLabel={(item) => item.name}
          itemToStringValue={(item) => item.id.toString()}
          isItemEqualToValue={(a, b) => {
            if (!a || !b) return false;
            return a.id === b.id;
          }}
        >
          <ComboboxInput
            className="w-full"
            placeholder={placeholder ?? "Search for an item..."}
            showClear={query.trim().length > 0}
          />
          <ComboboxContent>
            <ComboboxList onScroll={handleResultsScroll}>
              {loading && results.length === 0
                ? Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`item-search-skeleton-${index}`}
                      className="px-2 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-[30px] w-[30px]" />
                        <Skeleton className="h-4 w-44" />
                      </div>
                    </div>
                  ))
                : results.map((item) => {
                    const isAdded = items.some((entry) => entry.id === item.id);
                    return (
                      <ComboboxItem key={item.id} value={item} disabled={isAdded}>
                        <div className="flex items-center gap-2">
                          <PixelArtIcon src={item.iconUrl} alt={item.name} />
                          <span>{item.name}</span>
                          {isAdded ? (
                            <span className={EDITOR_META_TEXT_CLASS}>Added</span>
                          ) : null}
                        </div>
                      </ComboboxItem>
                    );
                  })}
              {loadingMore ? (
                <div className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-[30px] w-[30px]" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </div>
              ) : null}
            </ComboboxList>
            <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
            {error ? (
              <div className={cn("px-2 py-1", EDITOR_ERROR_TEXT_CLASS)}>
                {error}
              </div>
            ) : null}
          </ComboboxContent>
        </Combobox>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`${label} search options`}
              className="shrink-0"
            >
              <IconAdjustmentsHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="flex items-center justify-between gap-3 px-2 py-1.5">
              <span className="text-sm">Show untradeables</span>
              <Switch
                checked={showUntradeables}
                onCheckedChange={setShowUntradeables}
                aria-label="Show untradeables"
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4">
        {items.length === 0 ? (
          <EmptySelectionState description={emptySelectionMessage} />
        ) : (
          <Table
            className={cn(EDITOR_TABLE_SURFACE_CLASS, IO_TABLE_MIN_WIDTH_CLASS)}
          >
            <TableHeader className={EDITOR_TABLE_HEADER_CLASS}>
              <TableRow className="hover:bg-transparent">
                <TableHead className={IO_NAME_COLUMN_CLASS}>Name</TableHead>
                <TableHead className={IO_QUANTITY_COLUMN_CLASS}>
                  Quantity
                </TableHead>
                <TableHead className={IO_REASON_COLUMN_CLASS}>Reason</TableHead>
                <TableHead className={cn(IO_ACTIONS_COLUMN_CLASS, "text-right")}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((entry) => {
                const iconUrl = getItemIcon(entry.id);
                return (
                  <TableRow
                    key={entry.id}
                    onDragOver={(event) => handleDragOver(event, entry.id)}
                    onDrop={(event) => handleDrop(event, entry.id)}
                    className={cn(
                      dragOverId === entry.id &&
                        "outline outline-1 outline-primary/40"
                    )}
                  >
                    <TableCell className="align-top">
                      <div className="flex min-w-0 items-start gap-2">
                        <PixelArtIcon src={iconUrl} alt={getItemName(entry.id)} />
                        <span className={cn("leading-5", !iconUrl && "pl-1")}>
                          {getItemName(entry.id)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={entry.quantity}
                        onChange={(e) =>
                          handleQuantityChange(entry.id, e.target.value)
                        }
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Textarea
                        placeholder="Optional"
                        value={entry.reason ?? ""}
                        onChange={(e) =>
                          handleReasonChange(entry.id, e.target.value)
                        }
                        className="min-h-[64px] resize-y"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove item"
                          onClick={() => handleRemoveItem(entry.id)}
                        >
                          <IconX size={16} />
                        </Button>
                        <button
                          type="button"
                          aria-label="Reorder item"
                          className={cn(
                            "cursor-grab rounded-md p-2 text-muted-foreground transition hover:text-foreground",
                            draggingId === entry.id && "cursor-grabbing"
                          )}
                          draggable
                          onDragStart={(event) => handleDragStart(event, entry.id)}
                          onDragEnd={handleDragEnd}
                        >
                          <IconGripVertical size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

export default IoItemsField;

