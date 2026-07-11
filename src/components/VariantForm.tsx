import { useEffect, useState } from "react";
import {
  EDITOR_ERROR_TEXT_CLASS,
  EDITOR_FIELD_LABEL_CLASS,
  EDITOR_NESTED_SURFACE_CLASS,
  EditorSubsection,
  InlineSwitchField,
} from "@/components/method-editor/MethodEditorPrimitives";
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
    <div className={cn("overflow-hidden", EDITOR_NESTED_SURFACE_CLASS)}>
      <EditorSubsection
        title="Basics"
        bordered={false}
        actions={
          <>
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
          </>
        }
        contentClassName="grid gap-4 lg:grid-cols-[max-content_minmax(0,1.6fr)_minmax(0,8rem)_minmax(0,8rem)]"
      >
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
          <label className={EDITOR_FIELD_LABEL_CLASS}>Name</label>
          <Input
            value={label}
            className={cn(
              "bg-background",
              isLabelDuplicate && "border-red-500 focus-visible:ring-red-500",
            )}
            onChange={(event) => {
              const next = event.target.value;
              setLabel(next);
              onChange?.({ ...variant, label: next });
            }}
          />
          {isLabelDuplicate ? (
            <p className={cn("mt-2", EDITOR_ERROR_TEXT_CLASS)}>
              This name is already used by another variant.
            </p>
          ) : null}
        </div>

        <InlineSwitchField
          label="Members"
          checked={members}
          stateLabel={members ? "Members-only" : "Free-to-play"}
          onCheckedChange={(checked) => {
            setMembers(checked);
            onChange?.({ ...variant, members: checked });
          }}
        />

        <InlineSwitchField
          label="Wilderness"
          checked={wilderness}
          stateLabel={wilderness ? "Yes" : "No"}
          onCheckedChange={(checked) => {
            setWilderness(checked);
            onChange?.({ ...variant, wilderness: checked });
          }}
        />

        <div className="lg:col-span-4">
          <label className={EDITOR_FIELD_LABEL_CLASS}>Description</label>
          <Textarea
            placeholder="Describe this variant"
            className="min-h-[150px] bg-background"
            value={description}
            onChange={(event) => {
              const next = event.target.value;
              setDescription(next);
              onChange?.({ ...variant, description: next });
            }}
          />
        </div>
      </EditorSubsection>

      <EditorSubsection
        title="Metrics"
        contentClassName="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,7rem)_minmax(0,7rem)] lg:items-start"
      >
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
          <label className={EDITOR_FIELD_LABEL_CLASS}>AFK %</label>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={3}
            className="h-10 w-full max-w-[7rem] bg-background"
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
          <label className={EDITOR_FIELD_LABEL_CLASS}>Clicks/hr</label>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={5}
            className="h-10 w-full max-w-[7rem] bg-background"
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
      </EditorSubsection>

      <EditorSubsection
        title="Inputs & outputs"
        contentClassName="grid gap-6 md:grid-cols-2"
      >
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
      </EditorSubsection>

      <EditorSubsection title="Requirements & recommendations">
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
      </EditorSubsection>
    </div>
  );
}

export default VariantForm;
