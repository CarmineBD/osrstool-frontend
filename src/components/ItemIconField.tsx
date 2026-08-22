import { useEffect, useId, useMemo, useState } from "react";
import { IconAdjustmentsHorizontal, IconPhoto } from "@tabler/icons-react";
import {
  EDITOR_BODY_TEXT_CLASS,
  EDITOR_ERROR_TEXT_CLASS,
  EDITOR_FIELD_LABEL_CLASS,
  EDITOR_META_TEXT_CLASS,
  PixelArtIcon,
} from "@/components/method-editor/MethodEditorPrimitives";
import {
  fetchIconRecords,
  getIconReferenceKey,
  searchIcons,
  type IconRecord,
  type IconSearchType,
  type IconSource,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RequiredMark } from "@/components/RequiredMark";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  normalizeBoundedText,
  SEARCH_QUERY_MAX_LENGTH,
} from "@/lib/validation";

const ICON_TYPES: IconSearchType[] = [
  "all",
  "items",
  "interface",
  "spell",
  "prayer",
  "skill",
  "other",
];
const isValidIconId = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

interface ItemIconFieldProps {
  label: string;
  value?: number | null;
  source?: IconSource;
  onChange: (next: { id: number; source: IconSource } | undefined) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  searchAriaLabel?: string;
  optionsAriaLabel?: string;
}

export function ItemIconField({
  label,
  value,
  source = "item",
  onChange,
  placeholder,
  error,
  required = false,
  searchAriaLabel,
  optionsAriaLabel,
}: ItemIconFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IconRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUntradeables, setShowUntradeables] = useState(false);
  const [iconType, setIconType] = useState<IconSearchType>("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<IconRecord | null>(null);
  const [cache, setCache] = useState<Record<string, IconRecord>>({});
  const listboxId = useId();
  const normalizedValue = isValidIconId(value) ? value : undefined;
  const canShowUntradeables = iconType === "all" || iconType === "items";

  useEffect(() => {
    if (!canShowUntradeables) setShowUntradeables(false);
  }, [canShowUntradeables]);
  useEffect(() => {
    let active = true;
    if (!normalizedValue) {
      setSelectedIcon(null);
      return;
    }
    fetchIconRecords([{ id: normalizedValue, source }])
      .then((records) => {
        if (active)
          setSelectedIcon(
            records[getIconReferenceKey({ id: normalizedValue, source })] ??
              null,
          );
      })
      .catch(() => active && setSelectedIcon(null));
    return () => {
      active = false;
    };
  }, [normalizedValue, source]);
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setErrorMessage(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setErrorMessage(null);
      searchIcons(trimmed, iconType, showUntradeables, controller.signal)
        .then((icons) => {
          if (controller.signal.aborted) return;
          setResults(icons);
          setCache((previous) => ({
            ...previous,
            ...Object.fromEntries(
              icons.map((icon) => [
                getIconReferenceKey({ id: icon.id, source: icon.source }),
                icon,
              ]),
            ),
          }));
        })
        .catch((searchError) => {
          if (!controller.signal.aborted)
            setErrorMessage(
              searchError instanceof Error
                ? searchError.message
                : "Unable to load icons.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [iconType, query, showUntradeables]);
  const selectedPreview = useMemo(
    () =>
      normalizedValue
        ? (selectedIcon ??
          cache[getIconReferenceKey({ id: normalizedValue, source })] ??
          null)
        : null,
    [cache, normalizedValue, selectedIcon, source],
  );
  const triggerLabel = searchAriaLabel ?? `${label} search`;
  return (
    <div className="self-start">
      <label className={EDITOR_FIELD_LABEL_CLASS}>
        {label}
        {required ? <RequiredMark /> : null}
      </label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) setQuery(selectedPreview?.name ?? "");
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-10 w-10 shrink-0 rounded-md border-border/70 bg-background p-0",
              error && "border-destructive",
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
              aria-label={triggerLabel}
              aria-expanded={open}
              aria-controls={listboxId}
              placeholder={placeholder ?? "Search for an icon..."}
              value={query}
              maxLength={SEARCH_QUERY_MAX_LENGTH}
              autoFocus
              onChange={(event) =>
                setQuery(
                  normalizeBoundedText(
                    event.target.value,
                    SEARCH_QUERY_MAX_LENGTH,
                  ),
                )
              }
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
                <DropdownMenuRadioGroup
                  value={iconType}
                  onValueChange={(next) => setIconType(next as IconSearchType)}
                >
                  {ICON_TYPES.map((type) => (
                    <DropdownMenuRadioItem key={type} value={type}>
                      {type === "items"
                        ? "Items"
                        : type[0].toUpperCase() + type.slice(1)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <div className="flex items-center justify-between gap-3 px-2 py-1.5">
                  <span className="text-sm">Untradeable items</span>
                  <Switch
                    checked={showUntradeables}
                    onCheckedChange={setShowUntradeables}
                    aria-label="Untradeable items"
                    disabled={!canShowUntradeables}
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div
            id={listboxId}
            role="listbox"
            className="mt-3 max-h-72 space-y-1 overflow-y-auto"
          >
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5"
                  >
                    <Skeleton className="h-[30px] w-[30px]" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))
              : results.map((icon) => {
                  const selected =
                    normalizedValue === icon.id && source === icon.source;
                  return (
                    <button
                      key={getIconReferenceKey({
                        id: icon.id,
                        source: icon.source,
                      })}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                        selected ? "bg-accent" : "hover:bg-accent/70",
                      )}
                      onClick={() => {
                        setSelectedIcon(icon);
                        onChange({ id: icon.id, source: icon.source });
                        setQuery("");
                        setOpen(false);
                      }}
                      disabled={selected}
                    >
                      <PixelArtIcon src={icon.iconUrl} alt={icon.name} />
                      <span className="flex-1">{icon.name}</span>
                      {selected ? (
                        <span className={EDITOR_META_TEXT_CLASS}>Selected</span>
                      ) : null}
                    </button>
                  );
                })}
            {!loading && results.length === 0 ? (
              <p className={cn("py-4 text-center", EDITOR_BODY_TEXT_CLASS)}>
                {query.trim() ? "No results found" : "Type to search"}
              </p>
            ) : null}
          </div>
          {errorMessage ? (
            <div className={cn("mt-2", EDITOR_ERROR_TEXT_CLASS)}>
              {errorMessage}
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
      {error ? (
        <p className={cn("mt-2", EDITOR_ERROR_TEXT_CLASS)}>{error}</p>
      ) : null}
    </div>
  );
}

export default ItemIconField;
