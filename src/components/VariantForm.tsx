import { useEffect, useState } from "react";
import {
  EDITOR_ERROR_TEXT_CLASS,
  EDITOR_FIELD_LABEL_CLASS,
  EDITOR_META_TEXT_CLASS,
  EDITOR_NESTED_SURFACE_CLASS,
  EditorSubsection,
  InlineSwitchField,
} from "@/components/method-editor/MethodEditorPrimitives";
import { ItemIconField } from "@/components/ItemIconField";
import { DynamicCycleStepsField } from "@/components/DynamicCycleStepsField";
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
  DynamicVariantAction,
  QuestOption,
  SkillOption,
  Variant,
} from "@/lib/api";
import { VARIANT_ACTION_TYPE_OPTIONS } from "@/lib/api";
import {
  formatGameTickCount,
  formatGameTickSeconds,
  isWholeGameTick,
  secondsToGameTicks,
} from "@/lib/gameTicks";
import { cn } from "@/lib/utils";
import {
  clampDecimal,
  clampInteger,
  DESCRIPTION_MAX_LENGTH,
  INPUTS_MAX_COUNT,
  MAX_ACTIONS_PER_HOUR,
  MAX_ACTIONS_PER_HOUR_DECIMAL_PLACES,
  MAX_AFKINESS,
  MAX_CLICK_INTENSITY,
  MAX_XP_HOUR_SKILLS,
  hasAtMostDecimalPlaces,
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

function createEmptyDynamicAction(): DynamicVariantAction {
  return {
    name: "",
    rollIntervalTicks: 0,
    inputs: [],
    outputs: [],
    xpGained: [],
  };
}

function createEmptyCycleStep() {
  return {
    name: "",
    stepOrderPosition: 1,
    clicksMade: 0,
    isAfk: false,
    actionsMade: 0,
    durationTicks: 0,
  };
}

function normalizeSkillKey(value: string): string {
  return value.trim().toLowerCase();
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
  const [calculationMode, setCalculationMode] = useState<
    NonNullable<Variant["calculationMode"]>
  >(variant.calculationMode ?? "fixed");
  const [dynamicAction, setDynamicAction] = useState<DynamicVariantAction>(
    variant.dynamicAction ?? createEmptyDynamicAction(),
  );
  const [cycleSteps, setCycleSteps] = useState(
    variant.cycleSteps?.length ? variant.cycleSteps : [createEmptyCycleStep()],
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
    setCalculationMode(variant.calculationMode ?? "fixed");
    setDynamicAction(variant.dynamicAction ?? createEmptyDynamicAction());
    setCycleSteps(
      variant.cycleSteps?.length ? variant.cycleSteps : [createEmptyCycleStep()],
    );
  }, [variant]);

  const iconError =
    showValidationErrors && !iconId ? "Variant icon is required" : undefined;
  const actionsPerHourError =
    showValidationErrors &&
    (actionsPerHour === undefined ||
      actionsPerHour < 0 ||
      actionsPerHour > MAX_ACTIONS_PER_HOUR ||
      !hasAtMostDecimalPlaces(
        actionsPerHour,
        MAX_ACTIONS_PER_HOUR_DECIMAL_PLACES,
      ))
      ? `Actions/hr is required and must be between 0 and ${MAX_ACTIONS_PER_HOUR} with up to ${MAX_ACTIONS_PER_HOUR_DECIMAL_PLACES} decimals.`
      : undefined;
  const actionTypeError =
    calculationMode === "fixed" && showValidationErrors && !actionType
      ? "Action type is required."
      : undefined;
  const rollIntervalTicksError =
    dynamicAction.rollIntervalTicks > 0 &&
    !isWholeGameTick(dynamicAction.rollIntervalTicks)
      ? "Roll interval must be divisible by 0.6 seconds."
      : showValidationErrors &&
          (!isWholeGameTick(dynamicAction.rollIntervalTicks) ||
            dynamicAction.rollIntervalTicks <= 0)
        ? "Roll interval must be greater than 0 seconds."
        : undefined;
  const dynamicActionNameError =
    showValidationErrors && !dynamicAction.name.trim()
      ? "Action name is required."
      : undefined;

  const updateDynamicAction = (next: DynamicVariantAction) => {
    setDynamicAction(next);
    onChange?.({
      ...variant,
      calculationMode: "dynamic",
      dynamicAction: next,
      cycleSteps,
    });
  };

  const updateCycleSteps = (next: NonNullable<Variant["cycleSteps"]>) => {
    setCycleSteps(next);
    onChange?.({
      ...variant,
      calculationMode: "dynamic",
      dynamicAction,
      cycleSteps: next,
    });
  };

  const dynamicXpEntries = dynamicAction.xpGained.map((entry) => ({
    skill:
      entry.skill ??
      skillOptions.find((option) => option.id === entry.skillId)?.value ??
      String(entry.skillId),
    experience: entry.experience,
  }));

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
        contentClassName="grid gap-4 lg:grid-cols-[max-content_minmax(0,1.6fr)_minmax(0,8rem)_minmax(0,8rem)_minmax(0,10rem)]"
      >
        <ItemIconField
          label="Icon"
          value={iconId}
          source={variant.iconSource}
          onChange={(next) => {
            setIconId(next?.id);
            onChange?.({
              ...variant,
              icon_id: next?.id,
              iconSource: next?.source,
            });
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

        <div>
          <label className={EDITOR_FIELD_LABEL_CLASS}>Calculation mode</label>
          <Select
            value={calculationMode}
            onValueChange={(next) => {
              const nextMode = next as NonNullable<Variant["calculationMode"]>;
              setCalculationMode(nextMode);
              onChange?.({
                ...variant,
                calculationMode: nextMode,
                ...(nextMode === "dynamic"
                  ? {
                      dynamicAction,
                      cycleSteps,
                    }
                  : {}),
              });
            }}
          >
            <SelectTrigger className="h-10 w-full bg-background">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="dynamic">Dynamic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="lg:col-span-5">
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

      {calculationMode === "fixed" ? (
        <>
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
            inputMode="decimal"
            min={0}
            max={MAX_ACTIONS_PER_HOUR}
            step={0.01}
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
                  : clampDecimal(
                      event.target.valueAsNumber,
                      0,
                      MAX_ACTIONS_PER_HOUR,
                      MAX_ACTIONS_PER_HOUR_DECIMAL_PLACES,
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
        </>
      ) : (
        <>
          <EditorSubsection
            title="Action"
            description="Define the action completed during this cycle."
            contentClassName="space-y-6"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,10rem)] lg:items-start">
              <div>
                <label className={EDITOR_FIELD_LABEL_CLASS}>
                  Action name
                  <RequiredMark />
                </label>
                <Input
                  value={dynamicAction.name}
                  className={cn(
                    "bg-background",
                    dynamicActionNameError &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  onChange={(event) =>
                    updateDynamicAction({
                      ...dynamicAction,
                      name: normalizeBoundedText(
                        event.target.value,
                        VARIANT_LABEL_MAX_LENGTH,
                      ),
                    })
                  }
                />
                {dynamicActionNameError ? (
                  <p className={cn("mt-2", EDITOR_ERROR_TEXT_CLASS)}>
                    {dynamicActionNameError}
                  </p>
                ) : null}
              </div>

              <div>
                <label className={EDITOR_FIELD_LABEL_CLASS}>
                  Roll interval (seconds)
                  <RequiredMark />
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.6"
                  value={formatGameTickSeconds(dynamicAction.rollIntervalTicks)}
                  className={cn(
                    "bg-background",
                    rollIntervalTicksError &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  onChange={(event) =>
                    updateDynamicAction({
                      ...dynamicAction,
                      rollIntervalTicks:
                        event.target.value === ""
                          ? 0
                          : secondsToGameTicks(event.target.valueAsNumber) ?? 0,
                    })
                  }
                />
                {isWholeGameTick(dynamicAction.rollIntervalTicks) ? (
                  <p className={cn("mt-2", EDITOR_META_TEXT_CLASS)}>
                    {formatGameTickCount(dynamicAction.rollIntervalTicks)}
                  </p>
                ) : null}
                {rollIntervalTicksError ? (
                  <p className={cn("mt-1", EDITOR_ERROR_TEXT_CLASS)}>
                    {rollIntervalTicksError}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <IoItemsField
                label="Inputs"
                items={dynamicAction.inputs}
                maxItems={INPUTS_MAX_COUNT}
                showReason={false}
                onChange={(next) =>
                  updateDynamicAction({ ...dynamicAction, inputs: next })
                }
              />
              <IoItemsField
                label="Outputs"
                items={dynamicAction.outputs}
                maxItems={OUTPUTS_MAX_COUNT}
                showReason={false}
                onChange={(next) =>
                  updateDynamicAction({ ...dynamicAction, outputs: next })
                }
              />
            </div>

            <XpSkillsField
              label="XP received"
              skills={skillOptions}
              entries={dynamicXpEntries}
              maxEntries={MAX_XP_HOUR_SKILLS}
              placeholder="Search for a skill..."
              onChange={(next) => {
                const nextXpGained = next.flatMap((entry) => {
                  const skillKey = normalizeSkillKey(entry.skill);
                  const existing = dynamicAction.xpGained.find(
                    (value) => normalizeSkillKey(value.skill ?? "") === skillKey,
                  );
                  const option = skillOptions.find(
                    (value) =>
                      normalizeSkillKey(value.name) === skillKey ||
                      normalizeSkillKey(value.value) === skillKey,
                  );
                  const skillId = existing?.skillId ?? option?.id;
                  if (!skillId) return [];
                  return [
                    {
                      skillId,
                      skill: option?.value ?? existing?.skill ?? skillKey,
                      experience: entry.experience,
                    },
                  ];
                });
                updateDynamicAction({
                  ...dynamicAction,
                  xpGained: nextXpGained,
                });
              }}
            />
          </EditorSubsection>

          <EditorSubsection
            title="Cycle"
            description="Add the ordered steps that make up one complete cycle."
          >
            <DynamicCycleStepsField
              steps={cycleSteps}
              rollIntervalTicks={dynamicAction.rollIntervalTicks}
              onChange={updateCycleSteps}
              showValidationErrors={showValidationErrors}
            />
          </EditorSubsection>
        </>
      )}

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
