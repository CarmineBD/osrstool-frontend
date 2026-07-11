import { useEffect, useState } from "react";
import { ItemIconField } from "@/components/ItemIconField";
import { IoItemsField } from "@/components/IoItemsField";
import { RequirementsRecommendationsField } from "@/components/RequirementsRecommendationsField";
import { XpSkillsField } from "@/components/XpSkillsField";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  AchievementDiaryOption,
  QuestOption,
  SkillOption,
  Variant,
} from "@/lib/api";
import { cn } from "@/lib/utils";

interface VariantFormProps {
  index: number;
  onRemove: () => void;
  variant: Variant;
  skillOptions: SkillOption[];
  questOptions: QuestOption[];
  achievementDiaryOptions: AchievementDiaryOption[];
  onChange?: (updated: Variant) => void;
  onDuplicate?: () => void;
  isLabelDuplicate?: boolean;
  showValidationErrors?: boolean;
}

function normalizeIconId(value: number | null | undefined): number | undefined {
  return Number.isInteger(value) && (value as number) > 0
    ? (value as number)
    : undefined;
}

function normalizeDigits(value: string, maxDigits: number): string {
  return value.replace(/\D/g, "").slice(0, maxDigits);
}

export function VariantForm({
  index,
  onRemove,
  variant,
  skillOptions,
  questOptions,
  achievementDiaryOptions,
  onChange,
  onDuplicate,
  isLabelDuplicate,
  showValidationErrors,
}: VariantFormProps) {
  const [label, setLabel] = useState<string>(variant.label);
  const [iconId, setIconId] = useState<number | undefined>(
    normalizeIconId(variant.icon_id),
  );
  const [description, setDescription] = useState<string>(
    variant.description ?? "",
  );
  const [members, setMembers] = useState<boolean>(variant.members ?? false);
  const [wilderness, setWilderness] = useState<boolean>(
    variant.wilderness ?? false,
  );
  const [afkiness, setAfkiness] = useState<number | undefined>(
    variant.afkiness,
  );
  const [clickIntensity, setClickIntensity] = useState<number | undefined>(
    variant.clickIntensity ?? variant.actionsPerHour,
  );
  const [xpHour, setXpHour] = useState<NonNullable<Variant["xpHour"]>>(
    variant.xpHour ?? [],
  );
  const [inputs, setInputs] = useState<Variant["inputs"]>(variant.inputs ?? []);
  const [outputs, setOutputs] = useState<Variant["outputs"]>(
    variant.outputs ?? [],
  );

  useEffect(() => {
    setLabel(variant.label);
    setIconId(normalizeIconId(variant.icon_id));
    setDescription(variant.description ?? "");
    setMembers(variant.members ?? false);
    setWilderness(variant.wilderness ?? false);
    setAfkiness(variant.afkiness);
    setClickIntensity(variant.clickIntensity ?? variant.actionsPerHour);
    setXpHour(variant.xpHour ?? []);
    setInputs(variant.inputs ?? []);
    setOutputs(variant.outputs ?? []);
  }, [variant]);

  const iconError =
    showValidationErrors && !iconId ? "Variant icon is required" : undefined;

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-background/75">
      <div className="space-y-4 p-4">
        <div className="flex flex-col gap-3 border-b border-border/60 pb-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Variant basics
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {onDuplicate ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={onDuplicate}
              >
                Duplicate variant
              </Button>
            ) : null}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Delete variant
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Are you sure you want to delete this variant?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                  <AlertDialogAction type="button" onClick={onRemove}>
                    Delete variant
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid gap-x-3 gap-y-4 lg:grid-cols-[max-content_minmax(0,1.6fr)_minmax(0,8rem)_minmax(0,8rem)]">
          <ItemIconField
            label="Icon"
            value={iconId}
            onChange={(next) => {
              setIconId(next);
              onChange?.({ ...variant, icon_id: next });
            }}
            error={iconError}
            required
            searchAriaLabel={`Variant ${index + 1} icon search`}
            optionsAriaLabel={`Variant ${index + 1} icon search options`}
          />

          <div>
            <label className="mb-2 block text-sm font-medium">Name</label>
            <Input
              value={label}
              className={cn(
                "bg-background/90",
                isLabelDuplicate && "border-red-500 focus-visible:ring-red-500",
              )}
              onChange={(event) => {
                const next = event.target.value;
                setLabel(next);
                onChange?.({ ...variant, label: next });
              }}
            />
            {isLabelDuplicate ? (
              <p className="mt-1 text-sm text-red-500">
                This name is already used by another variant.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Members</label>
            <div className="flex h-10 items-center gap-3">
              <Switch
                checked={members}
                onCheckedChange={(checked) => {
                  setMembers(checked);
                  onChange?.({ ...variant, members: checked });
                }}
              />
              <span className="text-sm font-medium">
                {members ? "Members-only" : "Free-to-play"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Wilderness</label>
            <div className="flex h-10 items-center gap-3">
              <Switch
                checked={wilderness}
                onCheckedChange={(checked) => {
                  setWilderness(checked);
                  onChange?.({ ...variant, wilderness: checked });
                }}
              />
              <span className="text-sm font-medium">{wilderness ? "Yes" : "No"}</span>
            </div>
          </div>

          <div className="lg:col-span-4">
            <label className="mb-2 block text-sm font-medium">
              Description
            </label>
            <Textarea
              placeholder="Describe this variant"
              className="min-h-[150px] bg-background/90"
              value={description}
              onChange={(event) => {
                const next = event.target.value;
                setDescription(next);
                onChange?.({ ...variant, description: next });
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-5 border-t border-border/60 px-4 pt-6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Metrics
        </p>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,7rem)_minmax(0,7rem)] lg:items-start">
          <XpSkillsField
            label="XP per hour"
            skills={skillOptions}
            entries={xpHour}
            placeholder="Search for a skill..."
            onChange={(next) => {
              setXpHour(next);
              onChange?.({ ...variant, xpHour: next });
            }}
          />

          <div>
            <label className="mb-2 block text-sm font-medium">AFK %</label>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={3}
              className="h-10 w-full max-w-[7rem] bg-background/90"
              value={afkiness !== undefined ? String(afkiness) : ""}
              onChange={(event) => {
                const nextValue = normalizeDigits(event.target.value, 3);
                const numericValue =
                  nextValue === "" ? undefined : Number(nextValue);
                setAfkiness(numericValue);
                onChange?.({ ...variant, afkiness: numericValue });
              }}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Clicks/hr</label>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={5}
              className="h-10 w-full max-w-[7rem] bg-background/90"
              value={clickIntensity !== undefined ? String(clickIntensity) : ""}
              onChange={(event) => {
                const nextValue = normalizeDigits(event.target.value, 5);
                const numericValue =
                  nextValue === "" ? undefined : Number(nextValue);
                setClickIntensity(numericValue);
                onChange?.({ ...variant, clickIntensity: numericValue });
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-5 border-t border-border/60 px-4 pt-6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Inputs & Outputs
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <IoItemsField
            label="Inputs"
            items={inputs}
            onChange={(next) => {
              setInputs(next);
              onChange?.({ ...variant, inputs: next });
            }}
          />
          <IoItemsField
            label="Outputs"
            items={outputs}
            onChange={(next) => {
              setOutputs(next);
              onChange?.({ ...variant, outputs: next });
            }}
          />
        </div>
      </div>

      <div className="space-y-5 border-t border-border/60 px-4 pt-6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Requirements & Recommendations
        </p>

        <RequirementsRecommendationsField
          searchLabel="Unified search"
          searchPlaceholder="Search items, skills, quests, or achievement diaries"
          requirements={variant.requirements}
          recommendations={variant.recommendations}
          skillOptions={skillOptions}
          questOptions={questOptions}
          achievementDiaryOptions={achievementDiaryOptions}
          onChange={({ requirements: nextRequirements, recommendations }) => {
            onChange?.({
              ...variant,
              requirements: nextRequirements,
              recommendations,
            });
          }}
        />
      </div>
    </div>
  );
}

export default VariantForm;
