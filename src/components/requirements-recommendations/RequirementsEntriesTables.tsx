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
  normalizeReason,
} from "@/components/requirements-recommendations/requirementsRecommendations.utils";

type EntryUpdater = (entry: UnifiedEntry) => UnifiedEntry;

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
  return (
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
                      <span>{formatAchievementDiaryLabel(entry.name, entry.tier)}</span>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
