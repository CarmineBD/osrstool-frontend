import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchItems,
  searchItems,
  type IoItem,
  type Item,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const SEARCH_LIMIT = 10;
const DEBOUNCE_MS = 200;

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
  const [error, setError] = useState<string | null>(null);
  const [itemsMap, setItemsMap] = useState<Record<number, Item>>({});
  const [searchCache, setSearchCache] = useState<
    Record<number, ItemSearchResult>
  >({});
  const requestIdRef = useRef(0);

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
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    setResults([]);

    const timeout = setTimeout(() => {
      searchItems(trimmed, SEARCH_LIMIT, 1, controller.signal)
        .then((response) => {
          if (requestIdRef.current !== requestId) return;
          setResults(response.items.slice(0, SEARCH_LIMIT));
          setSearchCache((prev) => {
            if (response.items.length === 0) return prev;
            const next = { ...prev };
            response.items.forEach((item) => {
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
              : "No se pudieron cargar los items."
          );
        });
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

  const handleAddItem = (item: ItemSearchResult | null) => {
    if (!item) return;
    const exists = items.some((entry) => entry.id === item.id);
    if (exists) {
      setQuery("");
      return;
    }
    onChange([...items, { id: item.id, quantity: 1, reason: null }]);
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

  const getItemName = (id: number) =>
    itemsMap[id]?.name ?? searchCache[id]?.name ?? `#${id}`;

  const getItemIcon = (id: number) =>
    itemsMap[id]?.iconUrl ?? searchCache[id]?.iconUrl;

  const emptyMessage = loading
    ? "Buscando..."
    : query.trim()
      ? "Sin resultados"
      : "Escribe para buscar";

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">{label}</label>
      <Combobox<ItemSearchResult>
        inputValue={query}
        onInputValueChange={(value) => setQuery(value)}
        onValueChange={(value) => handleAddItem(value)}
        filter={null}
        itemToStringLabel={(item) => item.name}
        itemToStringValue={(item) => item.id.toString()}
        isItemEqualToValue={(a, b) => a.id === b.id}
      >
        <ComboboxInput
          className="w-full"
          placeholder={placeholder ?? "Buscar item..."}
          showClear={query.trim().length > 0}
        />
        <ComboboxContent>
          <ComboboxList>
            {results.map((item) => {
              const isAdded = items.some((entry) => entry.id === item.id);
              return (
                <ComboboxItem key={item.id} value={item} disabled={isAdded}>
                  <div className="flex items-center gap-2">
                    {item.iconUrl ? (
                      <img
                        src={item.iconUrl}
                        alt={item.name}
                        className="h-5 w-5 object-contain"
                      />
                    ) : null}
                    <span>{item.name}</span>
                    {isAdded ? (
                      <span className="text-xs text-muted-foreground">
                        Agregado
                      </span>
                    ) : null}
                  </div>
                </ComboboxItem>
              );
            })}
          </ComboboxList>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          {error ? (
            <div className="px-2 py-1 text-xs text-destructive">{error}</div>
          ) : null}
        </ComboboxContent>
      </Combobox>

      <Table className="rounded-md border">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="w-[140px]">Quantity</TableHead>
            <TableHead className="w-[220px]">Reason</TableHead>
            <TableHead className="w-[80px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-muted-foreground text-sm"
              >
                No hay items agregados.
              </TableCell>
            </TableRow>
          ) : (
            items.map((entry) => {
              const iconUrl = getItemIcon(entry.id);
              return (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt={getItemName(entry.id)}
                          className="h-6 w-6 object-contain"
                        />
                      ) : null}
                      <span className={cn(!iconUrl && "pl-1")}>
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
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      placeholder="Opcional"
                      value={entry.reason ?? ""}
                      onChange={(e) =>
                        handleReasonChange(entry.id, e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove item"
                      onClick={() => handleRemoveItem(entry.id)}
                    >
                      <IconX size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default IoItemsField;

