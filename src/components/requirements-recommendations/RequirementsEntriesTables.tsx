import { useEffect, useRef, useState } from "react";
import { IconX } from "@tabler/icons-react";
import { getUrlByType } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  UnifiedAchievementDiaryEntry,
  UnifiedEntry,
  UnifiedItemEntry,
  UnifiedQuestEntry,
  UnifiedSkillEntry,
} from "@/components/requirements-recommendations/requirementsRecommendations.types";
import {
  formatAchievementDiaryLabel,
  formatRequiredLabel,
  sanitizeReasonInput,
} from "@/components/requirements-recommendations/requirementsRecommendations.utils";

type EntryUpdater = (entry: UnifiedEntry) => UnifiedEntry;
const TABLE_HEADER_CLASS_NAME =
  "bg-slate-100/90 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200";
const NAME_COLUMN_CLASS_NAME = "w-[24%]";
const REASON_COLUMN_CLASS_NAME = "w-[36%]";

interface RequirementsEntriesTablesProps {
  itemEntries: UnifiedItemEntry[];
  questEntries: UnifiedQuestEntry[];
  achievementDiaryEntries: UnifiedAchievementDiaryEntry[];
  skillEntries: UnifiedSkillEntry[];
  questIconUrl?: string;
  achievementDiaryIconUrl?: string;
  getItemName: (entry: UnifiedItemEntry) => string;
  getItemIcon: (entry: UnifiedItemEntry) => string | undefined;
  updateEntry: (entryKey: string, updater: EntryUpdater) => void;
  removeEntry: (entryKey: string) => void;
}

function TruncatedTitleText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateOverflow = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth);
    };

    updateOverflow();

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(updateOverflow);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateOverflow);
    return () => window.removeEventListener("resize", updateOverflow);
  }, [text]);

  return (
    <span ref={ref} className="truncate" title={isTruncated ? text : undefined}>
      {text}
    </span>
  );
}

function RequiredToggle({
  isRequired,
  onCheckedChange,
}: {
  isRequired: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={isRequired} onCheckedChange={onCheckedChange} />
      <span className="text-xs text-muted-foreground">
        {formatRequiredLabel(isRequired)}
      </span>
    </div>
  );
}

export function RequirementsEntriesTables({
  itemEntries,
  questEntries,
  achievementDiaryEntries,
  skillEntries,
  questIconUrl,
  achievementDiaryIconUrl,
  getItemName,
  getItemIcon,
  updateEntry,
  removeEntry,
}: RequirementsEntriesTablesProps) {
  const hasEntries =
    itemEntries.length > 0 ||
    questEntries.length > 0 ||
    achievementDiaryEntries.length > 0 ||
    skillEntries.length > 0;

  if (!hasEntries) {
    return null;
  }

  const sections = [
    {
      key: "items",
      visible: itemEntries.length > 0,
      content: (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Items</h4>
          <Table className="table-fixed rounded-md border">
            <TableHeader className={TABLE_HEADER_CLASS_NAME}>
              <TableRow className="hover:bg-transparent">
                <TableHead className={NAME_COLUMN_CLASS_NAME}>Name</TableHead>
                <TableHead className="w-[140px]">Quantity</TableHead>
                <TableHead className={REASON_COLUMN_CLASS_NAME}>Reason</TableHead>
                <TableHead className="w-[140px]">Requirement type</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemEntries.map((entry) => (
                <TableRow key={entry.key}>
                  <TableCell className="align-top">
                    <div className="flex min-w-0 items-center gap-2">
                      {getItemIcon(entry) ? (
                        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                          <img
                            src={getItemIcon(entry)}
                            alt={getItemName(entry)}
                            className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                          />
                        </div>
                      ) : null}
                      <TruncatedTitleText text={getItemName(entry)} />
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
                  <TableCell className="align-top">
                    <Input
                      type="text"
                      placeholder="Optional"
                      value={entry.reason ?? ""}
                      onChange={(event) =>
                        updateEntry(entry.key, (current) => ({
                          ...current,
                          reason: sanitizeReasonInput(event.target.value),
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <RequiredToggle
                      isRequired={entry.isRequired}
                      onCheckedChange={(checked) =>
                        updateEntry(entry.key, (current) => ({
                          ...current,
                          isRequired: checked,
                        }))
                      }
                    />
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
              ))}
            </TableBody>
          </Table>
        </div>
      ),
    },
    {
      key: "quests",
      visible: questEntries.length > 0,
      content: (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Quests</h4>
          <Table className="table-fixed rounded-md border">
            <TableHeader className={TABLE_HEADER_CLASS_NAME}>
              <TableRow className="hover:bg-transparent">
                <TableHead className={NAME_COLUMN_CLASS_NAME}>Name</TableHead>
                <TableHead className="w-[160px]">Completed</TableHead>
                <TableHead className={REASON_COLUMN_CLASS_NAME}>Reason</TableHead>
                <TableHead className="w-[140px]">Requirement type</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questEntries.map((entry) => (
                <TableRow key={entry.key}>
                  <TableCell className="align-top">
                    <div className="flex min-w-0 items-center gap-2">
                      {questIconUrl ? (
                        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                          <img
                            src={questIconUrl}
                            alt="quests_icon"
                            className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                          />
                        </div>
                      ) : null}
                      <TruncatedTitleText text={entry.name} />
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
                  <TableCell className="align-top">
                    <Input
                      type="text"
                      placeholder="Optional"
                      value={entry.reason ?? ""}
                      onChange={(event) =>
                        updateEntry(entry.key, (current) => ({
                          ...current,
                          reason: sanitizeReasonInput(event.target.value),
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <RequiredToggle
                      isRequired={entry.isRequired}
                      onCheckedChange={(checked) =>
                        updateEntry(entry.key, (current) => ({
                          ...current,
                          isRequired: checked,
                        }))
                      }
                    />
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
              ))}
            </TableBody>
          </Table>
        </div>
      ),
    },
    {
      key: "achievement-diaries",
      visible: achievementDiaryEntries.length > 0,
      content: (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Achievement diaries</h4>
          <Table className="table-fixed rounded-md border">
            <TableHeader className={TABLE_HEADER_CLASS_NAME}>
              <TableRow className="hover:bg-transparent">
                <TableHead className={NAME_COLUMN_CLASS_NAME}>Name</TableHead>
                <TableHead className="w-[160px]">Completed</TableHead>
                <TableHead className={REASON_COLUMN_CLASS_NAME}>Reason</TableHead>
                <TableHead className="w-[140px]">Requirement type</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {achievementDiaryEntries.map((entry) => (
                <TableRow key={entry.key}>
                  <TableCell className="align-top">
                    <div className="flex min-w-0 items-center gap-2">
                      {achievementDiaryIconUrl ? (
                        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                          <img
                            src={achievementDiaryIconUrl}
                            alt="achievement_diaries_icon"
                            className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                          />
                        </div>
                      ) : null}
                      <TruncatedTitleText
                        text={formatAchievementDiaryLabel(entry.name, entry.tier)}
                      />
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
                  <TableCell className="align-top">
                    <Input
                      type="text"
                      placeholder="Optional"
                      value={entry.reason ?? ""}
                      onChange={(event) =>
                        updateEntry(entry.key, (current) => ({
                          ...current,
                          reason: sanitizeReasonInput(event.target.value),
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <RequiredToggle
                      isRequired={entry.isRequired}
                      onCheckedChange={(checked) =>
                        updateEntry(entry.key, (current) => ({
                          ...current,
                          isRequired: checked,
                        }))
                      }
                    />
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
              ))}
            </TableBody>
          </Table>
        </div>
      ),
    },
    {
      key: "skills",
      visible: skillEntries.length > 0,
      content: (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Skills</h4>
          <Table className="table-fixed rounded-md border">
            <TableHeader className={TABLE_HEADER_CLASS_NAME}>
              <TableRow className="hover:bg-transparent">
                <TableHead className={NAME_COLUMN_CLASS_NAME}>Name</TableHead>
                <TableHead className="w-[140px]">Level</TableHead>
                <TableHead className={REASON_COLUMN_CLASS_NAME}>Reason</TableHead>
                <TableHead className="w-[140px]">Requirement type</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skillEntries.map((entry) => (
                <TableRow key={entry.key}>
                  <TableCell className="align-top">
                    <div className="flex min-w-0 items-center gap-2">
                      {getUrlByType(entry.skill) ? (
                        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                          <img
                            src={getUrlByType(entry.skill) ?? ""}
                            alt={`${entry.skill}_icon`}
                            className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
                          />
                        </div>
                      ) : null}
                      <TruncatedTitleText text={entry.skill} />
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
                  <TableCell className="align-top">
                    <Input
                      type="text"
                      placeholder="Optional"
                      value={entry.reason ?? ""}
                      onChange={(event) =>
                        updateEntry(entry.key, (current) => ({
                          ...current,
                          reason: sanitizeReasonInput(event.target.value),
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <RequiredToggle
                      isRequired={entry.isRequired}
                      onCheckedChange={(checked) =>
                        updateEntry(entry.key, (current) => ({
                          ...current,
                          isRequired: checked,
                        }))
                      }
                    />
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
              ))}
            </TableBody>
          </Table>
        </div>
      ),
    },
  ].filter((section) => section.visible);

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.key}>{section.content}</div>
      ))}
    </div>
  );
}
