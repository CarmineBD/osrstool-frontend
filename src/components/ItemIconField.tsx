import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type UIEvent,
} from "react";
import { IconAdjustmentsHorizontal, IconPhoto } from "@tabler/icons-react";
import {
  EDITOR_ERROR_TEXT_CLASS,
  EDITOR_FIELD_LABEL_CLASS,
  EDITOR_BODY_TEXT_CLASS,
  EDITOR_META_TEXT_CLASS,
  PixelArtIcon,
} from "@/components/method-editor/MethodEditorPrimitives";
import {
  fetchItems,
  searchItems,
  type ItemSearchResponse,
  type ItemSearchResult,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RequiredMark } from "@/components/RequiredMark";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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
  required?: boolean;
  searchAriaLabel?: string;
  optionsAriaLabel?: string;
}

export function ItemIconField({
  label,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  searchAriaLabel,
  optionsAriaLabel,
}: ItemIconFieldProps) {
  const [open, setOpen] = useState(false);
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
  const listboxId = useId();

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
              : "Unable to load items.",
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
            : "Unable to load items.",
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

  const handleSelectItem = (item: ItemSearchResult) => {
    setSelectedItem({
      id: item.id,
      name: item.name,
      iconUrl: item.iconUrl,
    });
    setSearchCache((prev) => ({ ...prev, [item.id]: item }));
    onChange(item.id);
    setQuery("");
    setOpen(false);
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

  const emptyMessage = query.trim() ? "No results found" : "Type to search";
  const triggerLabel = searchAriaLabel ?? `${label} search`;
  const hasError = Boolean(error);
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setQuery(selectedPreview?.name ?? "");
      }
      setOpen(nextOpen);
    },
    [selectedPreview],
  );

  return (
    <div className="self-start">
      <label className={EDITOR_FIELD_LABEL_CLASS}>
        {label}
        {required ? <RequiredMark /> : null}
      </label>

      <input
        aria-label={triggerLabel}
        className="sr-only"
        role="combobox"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-10 w-10 shrink-0 rounded-md border-border/70 bg-background p-0",
              hasError && "border-destructive focus-visible:ring-destructive/30",
            )}
            aria-label={`Open ${label}`}
          >
            {selectedPreview?.iconUrl ? (
              <PixelArtIcon
                src={selectedPreview.iconUrl}
                alt={selectedPreview.name}
              />
            ) : (
              <IconPhoto size={16} className="text-muted-foreground" />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[360px] rounded-lg border-border/70 p-3"
        >
          <div className="flex items-center gap-2">
            <Input
              role="combobox"
              aria-label={`${triggerLabel} panel`}
              aria-expanded={open}
              aria-controls={listboxId}
              placeholder={placeholder ?? "Search for an item icon..."}
              value={query}
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
            />

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

          <div
            id={listboxId}
            role="listbox"
            className="mt-3 max-h-72 space-y-1 overflow-y-auto"
            onScroll={handleResultsScroll}
          >
            {loading && results.length === 0
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`icon-search-skeleton-${index}`}
                    className="rounded-md px-2 py-1.5"
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
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        isSelected
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/70",
                      )}
                      onClick={() => handleSelectItem(item)}
                      disabled={isSelected}
                    >
                      <PixelArtIcon src={item.iconUrl} alt={item.name} />
                      <span className="flex-1">{item.name}</span>
                      {isSelected ? (
                        <span className={EDITOR_META_TEXT_CLASS}>Selected</span>
                      ) : null}
                    </button>
                  );
                })}

            {!loading && results.length === 0 ? (
              <p className={cn("py-4 text-center", EDITOR_BODY_TEXT_CLASS)}>
                {emptyMessage}
              </p>
            ) : null}

            {loadingMore ? (
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-[30px] w-[30px]" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
            ) : null}
          </div>

          {errorMessage ? (
            <div className={cn("mt-2", EDITOR_ERROR_TEXT_CLASS)}>
              {errorMessage}
            </div>
          ) : null}
        </PopoverContent>
      </Popover>

      {error ? <p className={cn("mt-2", EDITOR_ERROR_TEXT_CLASS)}>{error}</p> : null}
    </div>
  );
}

export default ItemIconField;
