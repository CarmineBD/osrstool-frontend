import { useMemo, useState } from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  MethodVariantTagDefinition,
  MethodVariantTagKey,
} from "@/lib/api";

type MethodTagOption = Omit<MethodVariantTagDefinition, "severity"> & {
  severity?: MethodVariantTagDefinition["severity"];
};

function getVariantTagToneClassName(severity: 1 | 2 | 3 | undefined) {
  switch (severity) {
    case 1:
      return "border-success/40 bg-success-soft text-success-foreground";
    case 2:
      return "border-warning/40 bg-warning-soft text-warning-foreground";
    case 3:
      return "border-danger/40 bg-danger-soft text-danger-foreground";
    default:
      return "border-surface-highlight-border bg-surface-highlight text-foreground";
  }
}

function getMethodTagSummary(option: MethodTagOption): string | undefined {
  const description = option.description?.trim();
  return description && description.length > 0 ? description : undefined;
}

function fallbackLabelFromKey(key: MethodVariantTagKey): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((part, index) =>
      index === 0
        ? part.charAt(0).toUpperCase() + part.slice(1)
        : part.toLowerCase(),
    )
    .join(" ");
}

interface MethodTagsFilterComboboxProps {
  options: MethodTagOption[];
  value: MethodVariantTagKey[];
  onValueChange: (value: MethodVariantTagKey[]) => void;
  disabled?: boolean;
}

export function MethodTagsFilterCombobox({
  options,
  value,
  onValueChange,
  disabled = false,
}: MethodTagsFilterComboboxProps) {
  const [query, setQuery] = useState("");
  const anchorRef = useComboboxAnchor();

  const selectedOptions = useMemo(() => {
    const optionsByKey = new Map(options.map((option) => [option.key, option]));
    return value.map(
      (key) =>
        optionsByKey.get(key) ?? {
          key,
          label: fallbackLabelFromKey(key),
          severity: undefined,
        },
    );
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) => {
      const summary = getMethodTagSummary(option)?.toLowerCase() ?? "";
      return (
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.key.toLowerCase().includes(normalizedQuery) ||
        summary.includes(normalizedQuery)
      );
    });
  }, [options, query]);

  return (
    <Combobox<MethodTagOption, true>
      multiple
      disabled={disabled}
      inputValue={query}
      onInputValueChange={setQuery}
      onValueChange={(nextValue) =>
        onValueChange(nextValue.map((option) => option.key))
      }
      value={selectedOptions}
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.key}
      isItemEqualToValue={(left, right) => left.key === right.key}
    >
      <ComboboxChips
        ref={anchorRef}
        className={cn(
          "min-h-10 w-full rounded-md",
          disabled ? "cursor-not-allowed opacity-60" : "",
        )}
      >
        {selectedOptions.map((option) => (
          <ComboboxChip key={option.key}>
            <Badge
              size="sm"
              variant="outline"
              className={cn(getVariantTagToneClassName(option.severity))}
            >
              {option.label}
            </Badge>
          </ComboboxChip>
        ))}
        <ComboboxChipsInput
          aria-label="Ignored tags"
          className="min-w-28"
          placeholder="Search tags"
        />
        <ComboboxTrigger className="ml-auto shrink-0 rounded-sm p-1 text-muted-foreground hover:text-foreground" />
      </ComboboxChips>

      <ComboboxContent anchor={anchorRef}>
        <ComboboxList>
          {filteredOptions.map((option) => {
            const summary = getMethodTagSummary(option);

            return (
              <ComboboxItem key={option.key} value={option}>
                <div className="flex min-w-0 items-center gap-2">
                  <Badge
                    size="sm"
                    variant="outline"
                    className={cn(getVariantTagToneClassName(option.severity))}
                  >
                    {option.label}
                  </Badge>
                  {summary ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={`${option.label} explanation`}
                          className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                          onClick={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.preventDefault()}
                        >
                          <IconInfoCircle className="size-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        sideOffset={6}
                        className="max-w-[280px] whitespace-normal text-left text-wrap"
                      >
                        <p className="m-0">{summary}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
              </ComboboxItem>
            );
          })}
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-center text-sm text-muted-foreground">
              No tags found.
            </div>
          ) : null}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
