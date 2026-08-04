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
import { RequiredMark } from "@/components/RequiredMark";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  AchievementDiaryOption,
  QuestOption,
  SkillOption,
  Variant,
} from "@/lib/api";
import { VARIANT_ACTION_TYPE_OPTIONS } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  clampInteger,
  DESCRIPTION_MAX_LENGTH,
  INPUTS_MAX_COUNT,
  MAX_ACTIONS_PER_HOUR,
  MAX_AFKINESS,
  MAX_CLICK_INTENSITY,
  MAX_XP_HOUR_SKILLS,
  normalizeBoundedText,
  normalizeDigitInput,
  OUTPUTS_MAX_COUNT,
  VARIANT_LABEL_MAX_LENGTH,
} from "@/lib/validation";

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
    variant.clickIntensity,
  );
  const [actionsPerHour, setActionsPerHour] = useState<number | undefined>(
    variant.actionsPerHour,
  );
  const [actionType, setActionType] = useState<Variant["actionType"]>(
    variant.actionType,
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
    setClickIntensity(variant.clickIntensity);
    setActionsPerHour(variant.actionsPerHour);
    setActionType(variant.actionType);
    setXpHour(variant.xpHour ?? []);
    setInputs(variant.inputs ?? []);
    setOutputs(variant.outputs ?? []);
  }, [variant]);

  const iconError =
    showValidationErrors && !iconId ? "Variant icon is required" : undefined;
  const actionsPerHourError =
    showValidationErrors &&
    (actionsPerHour === undefined ||
      !Number.isInteger(actionsPerHour) ||
      actionsPerHour < 0 ||
      actionsPerHour > MAX_ACTIONS_PER_HOUR)
      ? `Actions/hr is required and must be between 0 and ${MAX_ACTIONS_PER_HOUR}.`
      : undefined;
  const actionTypeError =
    showValidationErrors && !actionType ? "Action type is required." : undefined;

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
            maxLength={VARIANT_LABEL_MAX_LENGTH}
            className={cn(
              "bg-background",
              isLabelDuplicate &&
                "border-destructive focus-visible:ring-destructive",
            )}
            onChange={(event) => {
              const next = normalizeBoundedText(
                event.target.value,
                VARIANT_LABEL_MAX_LENGTH,
              );
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
            maxLength={DESCRIPTION_MAX_LENGTH}
            value={description}
            onChange={(event) => {
              const next = normalizeBoundedText(
                event.target.value,
                DESCRIPTION_MAX_LENGTH,
              );
              setDescription(next);
              onChange?.({ ...variant, description: next });
            }}
          />
        </div>
      </EditorSubsection>

      <EditorSubsection
        title="Metrics"
        contentClassName="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,7rem)_minmax(0,7rem)_minmax(0,8rem)_minmax(0,9rem)] lg:items-start"
      >
        <XpSkillsField
          label="XP per hour"
          skills={skillOptions}
          entries={xpHour}
          maxEntries={MAX_XP_HOUR_SKILLS}
          placeholder="Search for a skill..."
          onChange={(next) => {
            setXpHour(next);
            onChange?.({ ...variant, xpHour: next });
          }}
        />

        <div>
          <label className={EDITOR_FIELD_LABEL_CLASS}>% AFK</label>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={3}
            className="h-10 w-full max-w-[7rem] bg-background"
            value={afkiness !== undefined ? String(afkiness) : ""}
            onChange={(event) => {
              const nextValue = normalizeDigitInput(event.target.value, 3);
              const numericValue = clampInteger(
                nextValue === "" ? undefined : Number(nextValue),
                0,
                MAX_AFKINESS,
              );
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
              const nextValue = normalizeDigitInput(event.target.value, 5);
              const numericValue = clampInteger(
                nextValue === "" ? undefined : Number(nextValue),
                0,
                MAX_CLICK_INTENSITY,
              );
              setClickIntensity(numericValue);
              onChange?.({ ...variant, clickIntensity: numericValue });
            }}
          />
        </div>

        <div>
          <label className={EDITOR_FIELD_LABEL_CLASS}>
            Actions/hr
            <RequiredMark />
          </label>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_ACTIONS_PER_HOUR}
            step={1}
            className={cn(
              "h-10 w-full max-w-[8rem] bg-background",
              actionsPerHourError &&
                "border-destructive focus-visible:ring-destructive",
            )}
            value={actionsPerHour !== undefined ? String(actionsPerHour) : ""}
            onChange={(event) => {
              const numericValue =
                event.target.value === ""
                  ? undefined
                  : clampInteger(
                      event.target.valueAsNumber,
                      0,
                      MAX_ACTIONS_PER_HOUR,
                    );
              setActionsPerHour(numericValue);
              onChange?.({ ...variant, actionsPerHour: numericValue });
            }}
          />
          {actionsPerHourError ? (
            <p className={cn("mt-2", EDITOR_ERROR_TEXT_CLASS)}>
              {actionsPerHourError}
            </p>
          ) : null}
        </div>

        <div>
          <label className={EDITOR_FIELD_LABEL_CLASS}>
            Action type
            <RequiredMark />
          </label>
          <Select
            value={actionType}
            onValueChange={(next) => {
              const normalizedValue = next as Variant["actionType"];
              setActionType(normalizedValue);
              onChange?.({ ...variant, actionType: normalizedValue });
            }}
          >
            <SelectTrigger
              className={cn(
                "h-10 w-full min-w-0 bg-background",
                actionTypeError &&
                  "border-destructive focus-visible:ring-destructive",
              )}
              aria-invalid={Boolean(actionTypeError)}
            >
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {VARIANT_ACTION_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {actionTypeError ? (
            <p className={cn("mt-2", EDITOR_ERROR_TEXT_CLASS)}>
              {actionTypeError}
            </p>
          ) : null}
        </div>
      </EditorSubsection>

      <EditorSubsection
        title="Inputs & outputs"
        contentClassName="grid gap-6 md:grid-cols-2"
      >
        <IoItemsField
          label="Inputs"
          items={inputs}
          maxItems={INPUTS_MAX_COUNT}
          onChange={(next) => {
            setInputs(next);
            onChange?.({ ...variant, inputs: next });
          }}
        />
        <IoItemsField
          label="Outputs"
          items={outputs}
          maxItems={OUTPUTS_MAX_COUNT}
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
