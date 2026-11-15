import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
} from "react";
import {
  fetchItems,
  searchItems,
  type IoItem,
  type Item,
} from "@/lib/api";
import { ItemIconField } from "@/components/ItemIconField";
import {
  Combobox,
  ComboboxInput,
} from "@/components/ui/combobox";
import {
  EDITOR_FIELD_LABEL_CLASS,
  EDITOR_META_TEXT_CLASS,
  EDITOR_TABLE_HEADER_CLASS,
  EDITOR_TABLE_SURFACE_CLASS,
  EmptySelectionState,
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
import { Switch } from "@/components/ui/switch";
import { IconGripVertical, IconPlus, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  clampDecimal,
  MAX_ITEM_QUANTITY,
  MAX_ITEM_QUANTITY_DECIMAL_PLACES,
  normalizeBoundedText,
  REASON_MAX_LENGTH,
} from "@/lib/validation";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";

const IO_TABLE_MIN_WIDTH_CLASS = "min-w-[380px]";
const IO_QUANTITY_COLUMN_CLASS = "w-[88px]";
const IO_REASON_COLUMN_CLASS = "w-[160px]";
const IO_ACTIONS_COLUMN_CLASS = "w-[72px]";

interface IoItemsFieldProps {
  label: string;
  items: IoItem[];
  onChange: (next: IoItem[]) => void;
  placeholder?: string;
  maxItems?: number;
  showReason?: boolean;
}

export function IoItemsField({
  label,
  items,
  onChange,
  placeholder,
  maxItems,
  showReason = true,
}: IoItemsFieldProps) {
  const [itemsMap, setItemsMap] = useState<Record<number, Item>>({});
  const [legacyQuery, setLegacyQuery] = useState("");
  const [showUntradeables, setShowUntradeables] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
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
    const trimmed = legacyQuery.trim();
    if (!trimmed) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchItems(trimmed, 10, 1, controller.signal, {
        showUntradeables,
      });
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [legacyQuery, showUntradeables]);

  const handleAddItem = (item: { id: number } | undefined) => {
    if (!item || items.some((entry) => entry.id === item.id)) return;
    if (maxItems !== undefined && items.length >= maxItems) return;
    onChange([
      {
        id: item.id,
        quantity: 1,
        ...(showReason ? { reason: null } : {}),
      },
      ...items,
    ]);
  };

  const handleRemoveItem = (id: number) => {
    onChange(items.filter((entry) => entry.id !== id));
  };

  const handleQuantityChange = (id: number, value: string) => {
    const nextQuantity = value === "" ? 0 : Number(value);
    if (!Number.isFinite(nextQuantity)) return;
    const normalizedQuantity =
      clampDecimal(
        nextQuantity,
        0,
        MAX_ITEM_QUANTITY,
        MAX_ITEM_QUANTITY_DECIMAL_PLACES,
      ) ?? 0;
    onChange(
      items.map((entry) =>
        entry.id === id
          ? { ...entry, quantity: normalizedQuantity }
          : entry
      )
    );
  };

  const handleReasonChange = (id: number, value: string) => {
    const nextValue = normalizeBoundedText(value, REASON_MAX_LENGTH);
    onChange(
      items.map((entry) =>
        entry.id === id ? { ...entry, reason: nextValue === "" ? null : nextValue } : entry
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
    itemsMap[id]?.name ?? `#${id}`;

  const emptySelectionMessage = "No items selected yet.";

  return (
    <div className="min-w-0">
      <div className="sr-only">
        <Combobox
          inputValue={legacyQuery}
          onInputValueChange={setLegacyQuery}
          filter={null}
        >
          <ComboboxInput
            placeholder={placeholder ?? "Search for an item..."}
          />
        </Combobox>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`${label} search options`}
            >
              <IconAdjustmentsHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
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
      <div className="flex items-center justify-between gap-4">
        <label className={EDITOR_FIELD_LABEL_CLASS}>{label}</label>
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
                <TableHead className={showReason ? "w-[36%]" : "w-[55%]"}>
                  Name
                </TableHead>
                <TableHead className={IO_QUANTITY_COLUMN_CLASS}>
                  Quantity
                </TableHead>
                {showReason ? (
                  <TableHead className={IO_REASON_COLUMN_CLASS}>Reason</TableHead>
                ) : null}
                <TableHead className={cn(IO_ACTIONS_COLUMN_CLASS, "text-right")}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((entry) => {
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
                    <TableCell className="align-middle">
                      <div className="flex min-w-0 items-center gap-2">
                        <ItemIconField
                          label={`Change ${getItemName(entry.id)}`}
                          value={entry.id}
                          itemOnly
                          hideLabel
                          onChange={(next) => {
                            if (
                              !next ||
                              next.id === entry.id ||
                              items.some((item) => item.id === next.id)
                            ) {
                              return;
                            }
                            onChange(
                              items.map((item) =>
                                item.id === entry.id
                                  ? { ...item, id: next.id }
                                  : item,
                              ),
                            );
                          }}
                        />
                        <span className="min-w-0 leading-5">
                          {getItemName(entry.id)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={MAX_ITEM_QUANTITY}
                        step="0.000001"
                        inputMode="decimal"
                        value={entry.quantity}
                        onChange={(e) =>
                          handleQuantityChange(entry.id, e.target.value)
                        }
                        className="w-20"
                      />
                    </TableCell>
                    {showReason ? (
                      <TableCell className="align-top">
                        <Textarea
                          placeholder="Optional"
                          maxLength={REASON_MAX_LENGTH}
                          value={entry.reason ?? ""}
                          onChange={(e) =>
                            handleReasonChange(entry.id, e.target.value)
                          }
                          className="min-h-[64px] resize-y"
                        />
                      </TableCell>
                    ) : null}
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
      <div className="mt-3 flex items-center justify-between gap-4">
        <ItemIconField
          label={`${label} item`}
          itemOnly
          hideLabel
          disabled={maxItems !== undefined && items.length >= maxItems}
          triggerContent={
            <>
              <IconPlus size={16} />
              Add item
            </>
          }
          onChange={handleAddItem}
        />
        {maxItems !== undefined ? (
          <p className={EDITOR_META_TEXT_CLASS}>
            {items.length}/{maxItems} items
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default IoItemsField;

