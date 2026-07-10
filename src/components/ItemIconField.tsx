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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { IconAdjustmentsHorizontal, IconX } from "@tabler/icons-react";

const SEARCH_LIMIT = 10;
const DEBOUNCE_MS = 200;
const SCROLL_BOTTOM_THRESHOLD_PX = 24;

function hasMoreItemPages(
  response: ItemSearchResponse,
  requestedPage: number,
  limit: number,
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

function isValidIconId(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

type SelectedItem = {
  id: number;
  name: string;
  iconUrl?: string;
};

interface ItemIconFieldProps {
  label: string;
  value?: number | null;
  onChange: (next: number | undefined) => void;
  placeholder?: string;
  error?: string;
  searchAriaLabel?: string;
  optionsAriaLabel?: string;
}

export function ItemIconField({
  label,
  value,
  onChange,
  placeholder,
  error,
  searchAriaLabel,
  optionsAriaLabel,
}: ItemIconFieldProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [showUntradeables, setShowUntradeables] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [searchCache, setSearchCache] = useState<
    Record<number, ItemSearchResult>
  >({});
  const requestIdRef = useRef(0);
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      loadMoreControllerRef.current?.abort();
    };
  }, []);

  const normalizedValue = isValidIconId(value) ? value : undefined;

  useEffect(() => {
    let active = true;
    if (!normalizedValue) {
      setSelectedItem(null);
      return;
    }

    fetchItems([normalizedValue])
      .then((data) => {
        if (!active) return;
        const item = data[normalizedValue];
        setSelectedItem(
          item
            ? {
                id: normalizedValue,
                name: item.name,
                iconUrl: item.iconUrl,
              }
            : null,
        );
      })
      .catch(() => {
        if (active) setSelectedItem(null);
      });

    return () => {
      active = false;
    };
  }, [normalizedValue]);

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
      setErrorMessage(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    setLoading(true);
    setLoadingMore(false);
    setCurrentPage(0);
    setHasMoreResults(false);
    setErrorMessage(null);
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
          setErrorMessage(null);
        })
        .catch((searchError) => {
          if (controller.signal.aborted) return;
          setLoading(false);
          setErrorMessage(
            searchError instanceof Error
              ? searchError.message
              : "No se pudieron cargar los items.",
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
    setErrorMessage(null);

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
      .catch((searchError) => {
        if (controller.signal.aborted) return;
        if (requestIdRef.current !== requestId) return;
        setLoadingMore(false);
        setErrorMessage(
          searchError instanceof Error
            ? searchError.message
            : "No se pudieron cargar los items.",
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
    [loadMoreResults],
  );

  const handleSelectItem = (item: ItemSearchResult | null) => {
    if (!item) return;
    setSelectedItem({
      id: item.id,
      name: item.name,
      iconUrl: item.iconUrl,
    });
    setSearchCache((prev) => ({ ...prev, [item.id]: item }));
    onChange(item.id);
    setQuery("");
  };

  const selectedPreview = useMemo(() => {
    if (!normalizedValue) return null;
    return (
      selectedItem ?? {
        id: normalizedValue,
        name: searchCache[normalizedValue]?.name ?? `#${normalizedValue}`,
        iconUrl: searchCache[normalizedValue]?.iconUrl,
      }
    );
  }, [normalizedValue, searchCache, selectedItem]);

  const emptyMessage = query.trim() ? "Sin resultados" : "Escribe para buscar";

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">{label}</label>

      <div className="flex items-start gap-2">
        <Combobox<ItemSearchResult>
          inputValue={query}
          onInputValueChange={(nextValue) => setQuery(nextValue)}
          onValueChange={(nextValue) => handleSelectItem(nextValue)}
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
            aria-label={searchAriaLabel ?? `${label} search`}
            placeholder={placeholder ?? "Buscar item para icono..."}
            showClear={query.trim().length > 0}
          />
          <ComboboxContent>
            <ComboboxList onScroll={handleResultsScroll}>
              {loading && results.length === 0
                ? Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`icon-search-skeleton-${index}`}
                      className="px-2 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-[30px] w-[30px]" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </div>
                  ))
                : results.map((item) => {
                    const isSelected = normalizedValue === item.id;
                    return (
                      <ComboboxItem
                        key={item.id}
                        value={item}
                        disabled={isSelected}
                      >
                        <div className="flex items-center gap-2">
                          {item.iconUrl ? (
                            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                              <img
                                src={item.iconUrl}
                                alt={item.name}
                                className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                              />
                            </div>
                          ) : null}
                          <span>{item.name}</span>
                          {isSelected ? (
                            <span className="text-xs text-muted-foreground">
                              Seleccionado
                            </span>
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
            {errorMessage ? (
              <div className="px-2 py-1 text-xs text-destructive">
                {errorMessage}
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
              aria-label={optionsAriaLabel ?? `${label} search options`}
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

      <div className="rounded-md border bg-muted/10 p-3">
        {selectedPreview ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {selectedPreview.iconUrl ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-background/80">
                  <img
                    src={selectedPreview.iconUrl}
                    alt={selectedPreview.name}
                    className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                  />
                </div>
              ) : null}
              <div>
                <p className="text-sm font-medium">{selectedPreview.name}</p>
                <p className="text-xs text-muted-foreground">
                  item id: {selectedPreview.id}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Clear ${label}`}
              onClick={() => onChange(undefined)}
            >
              <IconX size={16} />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No icon selected. Search an OSRS item and pick one.
          </p>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export default ItemIconField;
