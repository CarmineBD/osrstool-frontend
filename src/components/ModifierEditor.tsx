import { useEffect, useMemo, useState } from "react";
import { IconChartLine, IconPlus, IconTrash } from "@tabler/icons-react";
import {
  EDITOR_BODY_TEXT_CLASS,
  EDITOR_META_TEXT_CLASS,
  EDITOR_SUBSECTION_TITLE_CLASS,
  EDITOR_TABLE_HEADER_CLASS,
  EDITOR_TABLE_SURFACE_CLASS,
  EmptySelectionState,
  PixelArtIcon,
} from "@/components/method-editor/MethodEditorPrimitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type {
  DynamicCycleStep,
  ModifierCurve,
  ModifierOperation,
  SkillOption,
  VariantModifier,
  VariantModifierEffect,
} from "@/lib/api";
import {
  formatGameTickCount,
  formatGameTickSeconds,
  isWholeGameTick,
  secondsToGameTicks,
} from "@/lib/gameTicks";
import { cn, getUrlByType } from "@/lib/utils";
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type EditorTarget = "actions" | `cycle_steps:${number}`;
type EditorField = NonNullable<VariantModifierEffect["target_property"]>;

const EMPTY_VALUE = "__none__";
const MAX_SKILL_CURVE_LEVEL = 100;

type CurvePoint = ModifierCurve["points"][number];
type ChartPoint = CurvePoint & { userDefined: boolean };

function getChartPoints(points: CurvePoint[]): ChartPoint[] {
  if (points.length < 2) return points.map((point) => ({ ...point, userDefined: true }));
  const sorted = [...points].sort((left, right) => left.input - right.input);
  const chartPoints: ChartPoint[] = [];
  for (let level = sorted[0].input; level <= sorted[sorted.length - 1].input; level += 1) {
    const exactPoint = sorted.find((point) => point.input === level);
    if (exactPoint) {
      chartPoints.push({ ...exactPoint, userDefined: true });
      continue;
    }
    const upperIndex = sorted.findIndex((point) => point.input > level);
    const upper = sorted[upperIndex];
    const lower = sorted[upperIndex - 1];
    const ratio = (level - lower.input) / (upper.input - lower.input);
    chartPoints.push({
      input: level,
      output: lower.output + (upper.output - lower.output) * ratio,
      userDefined: false,
    });
  }
  return chartPoints;
}

function getAxisTicks(points: ChartPoint[]): number[] {
  if (points.length === 0) return [];
  const minimum = points[0].input;
  const maximum = points[points.length - 1].input;
  const count = Math.min(10, maximum - minimum + 1);
  if (count <= 1) return [minimum];
  return Array.from({ length: count }, (_, index) =>
    Math.round(minimum + ((maximum - minimum) * index) / (count - 1)),
  ).filter((tick, index, ticks) => ticks.indexOf(tick) === index);
}

function CurveTooltip({
  active,
  payload,
  successChance,
  tickField,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartPoint }>;
  successChance: boolean;
  tickField: boolean;
}) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  const formattedValue = successChance
    ? `Rate: ${(point.output * 100).toFixed(2)}%`
    : tickField
      ? `Value: ${formatGameTickSeconds(point.output)} seconds`
      : `Value: ${point.output}`;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      <p className="font-medium">Skill level: {point.input}</p>
      <p className="mt-1 text-muted-foreground">{formattedValue}</p>
    </div>
  );
}

function getDefaultCurve(field: EditorField): ModifierCurve {
  const isSuccessChance = field === "baseSuccessChance";
  return {
    interpolation: "linear",
    points: [
      { input: 1, output: isSuccessChance ? 0.01 : 0 },
      { input: MAX_SKILL_CURVE_LEVEL, output: isSuccessChance ? 0.99 : 1 },
    ],
  };
}

function getTarget(effect: VariantModifierEffect, steps: DynamicCycleStep[]): EditorTarget {
  if (effect.target_type === "actions") return "actions";
  const stepIndex = steps.findIndex(
    (step) => (step.targetId ?? step.id) === effect.target_id,
  );
  return stepIndex >= 0 ? `cycle_steps:${stepIndex}` : "actions";
}

function getFields(target: EditorTarget): Array<{ value: EditorField; label: string }> {
  if (target === "actions") {
    return [
      { value: "baseSuccessChance", label: "Success chance" },
      { value: "rollIntervalTicks", label: "Roll interval ticks" },
    ];
  }
  return [
    { value: "durationTicks", label: "Duration ticks" },
    { value: "clicksMade", label: "Clicks made" },
    { value: "isAfk", label: "Is AFK" },
    { value: "actionsMade", label: "Actions made" },
  ];
}

function getDefaultEffect(actionId: string): VariantModifierEffect {
  return {
    target_type: "actions",
    target_id: actionId,
    target_property: "baseSuccessChance",
    operation: "set",
    value_type: "constant",
    value: 0.5,
  };
}

function getEffectTargetData(
  target: EditorTarget,
  actionId: string,
  steps: DynamicCycleStep[],
): Pick<VariantModifierEffect, "target_type" | "target_id"> {
  if (target === "actions") return { target_type: "actions", target_id: actionId };
  const step = steps[Number(target.split(":")[1])];
  return {
    target_type: "cycle_steps",
    target_id: step?.targetId ?? step?.id ?? "",
  };
}

function isTickField(field: EditorField): boolean {
  return field === "durationTicks" || field === "rollIntervalTicks";
}

function isSuccessChanceField(field: EditorField): boolean {
  return field === "baseSuccessChance";
}

function getConstantDisplayValue(effect: VariantModifierEffect): string {
  if (typeof effect.value !== "number") return "";
  if (isTickField(effect.target_property)) return formatGameTickSeconds(effect.value);
  if (isSuccessChanceField(effect.target_property)) {
    return String(
      effect.operation === "multiply" ? effect.value : effect.value * 100,
    );
  }
  return String(effect.value);
}

function normalizeCurve(
  value: VariantModifierEffect["value"],
  field: EditorField,
): ModifierCurve {
  if (
    typeof value === "object" &&
    value !== null &&
    "points" in value &&
    Array.isArray(value.points) &&
    value.points.length >= 2
  ) {
    return value as ModifierCurve;
  }
  return getDefaultCurve(field);
}

interface CurveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: ModifierCurve;
  successChance: boolean;
  tickField: boolean;
  onSave: (value: ModifierCurve) => void;
}

function CurveDialog({
  open,
  onOpenChange,
  value,
  successChance,
  tickField,
  onSave,
}: CurveDialogProps) {
  const [points, setPoints] = useState(value.points);
  const chartPoints = useMemo(() => getChartPoints(points), [points]);
  const xAxisTicks = useMemo(() => getAxisTicks(chartPoints), [chartPoints]);

  useEffect(() => {
    if (open) setPoints(value.points);
  }, [open, value]);

  const setPoint = (index: number, key: "input" | "output", nextValue: string) => {
    const parsed = Number(nextValue);
    setPoints((current) =>
      current.map((point, pointIndex) =>
        pointIndex === index
          ? { ...point, [key]: Number.isFinite(parsed) ? parsed : 0 }
          : point,
      ),
    );
  };

  const isValid =
    points.length >= 2 &&
    points.length <= 99 &&
    points.every(
      (point, index) =>
        Number.isFinite(point.input) &&
        Number.isFinite(point.output) &&
        (index === 0 || point.input > points[index - 1].input),
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[580px]">
        <DialogHeader>
          <DialogTitle>Modifier curve</DialogTitle>
          <DialogDescription>
            Add between 2 and 99 ordered points. Values between points are resolved linearly.
          </DialogDescription>
        </DialogHeader>
        <div className="mx-auto h-[300px] w-[500px] max-w-full rounded-lg border border-border/70 bg-muted/20 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartPoints} margin={{ top: 8, right: 12, left: 4, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="input"
                type="number"
                domain={["dataMin", "dataMax"]}
                ticks={xAxisTicks}
                allowDecimals={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              >
                <Label
                  value="Level"
                  position="insideBottom"
                  offset={-16}
                  fill="var(--muted-foreground)"
                />
              </XAxis>
              <YAxis
                dataKey="output"
                type="number"
                domain={successChance ? [0, 1] : ["auto", "auto"]}
                allowDecimals={false}
                tickFormatter={(tick: number) =>
                  successChance ? `${Math.round(tick * 100)}%` : String(tick)
                }
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              >
                <Label
                  value="Rate"
                  angle={-90}
                  position="insideLeft"
                  fill="var(--muted-foreground)"
                />
              </YAxis>
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                content={
                  <CurveTooltip
                    successChance={successChance}
                    tickField={tickField}
                  />
                }
              />
              <Line
                type="linear"
                dataKey="output"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={(dotProps) => {
                  const point = dotProps.payload as ChartPoint;
                  return (
                    <circle
                      cx={dotProps.cx}
                      cy={dotProps.cy}
                      r={point.userDefined ? 4 : 2}
                      fill={point.userDefined ? "var(--primary)" : "var(--muted-foreground)"}
                      stroke="var(--background)"
                      strokeWidth={point.userDefined ? 2 : 1}
                    />
                  );
                }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mx-auto max-h-60 w-[500px] max-w-full overflow-y-auto rounded-lg border border-border/70">
          <Table>
            <TableHeader className={EDITOR_TABLE_HEADER_CLASS}>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>
                  {successChance
                    ? "Success chance (%)"
                    : tickField
                      ? "Seconds"
                      : "Value"}
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map((point, index) => (
                <TableRow key={`${index}-${point.input}`}>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-24"
                      min={1}
                      max={MAX_SKILL_CURVE_LEVEL}
                      value={point.input}
                      onChange={(event) => setPoint(index, "input", event.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-36"
                      min={successChance ? 0.01 : undefined}
                      max={successChance ? 100 : undefined}
                      step={tickField ? "0.6" : "0.01"}
                      value={
                        successChance
                          ? point.output * 100
                          : tickField
                            ? formatGameTickSeconds(point.output)
                            : point.output
                      }
                      onChange={(event) => {
                        const parsed = Number(event.target.value);
                        setPoint(
                          index,
                          "output",
                          String(
                            successChance
                              ? parsed / 100
                              : tickField
                                ? (secondsToGameTicks(parsed) ?? 0)
                                : parsed,
                          ),
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={points.length <= 2}
                      aria-label={`Delete curve point ${index + 1}`}
                      onClick={() => setPoints((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <IconTrash size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-start gap-4">
          {tickField ? (
            <p className={cn("order-last", EDITOR_META_TEXT_CLASS)}>
              Seconds must be divisible by 0.6.
            </p>
          ) : (
            <span className="order-last" />
          )}
          <Button
            type="button"
            variant="outline"
            className="order-first"
            disabled={
              points.length >= 99 ||
              (points[points.length - 1]?.input ?? MAX_SKILL_CURVE_LEVEL) >=
                MAX_SKILL_CURVE_LEVEL
            }
            onClick={() =>
              setPoints((current) => {
                const lastPoint = current[current.length - 1];
                return [
                  ...current,
                  {
                    input: Math.min(
                      (lastPoint?.input ?? 0) + 1,
                      MAX_SKILL_CURVE_LEVEL,
                    ),
                    output: lastPoint?.output ?? 0,
                  },
                ];
              })
            }
          >
            <IconPlus size={16} />
            Add point
          </Button>
        </div>
        {!isValid ? (
          <p className="text-[13px] font-medium leading-[18px] text-destructive">
            Points must be finite and use strictly increasing levels.
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!isValid}
            onClick={() => {
              onSave({ interpolation: "linear", points });
              onOpenChange(false);
            }}
          >
            Save curve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ModifierEditorProps {
  modifiers: VariantModifier[];
  actionId?: string;
  steps: DynamicCycleStep[];
  skillOptions: SkillOption[];
  onChange: (modifiers: VariantModifier[]) => void;
}

function getModifierTypeLabel(type: VariantModifier["type"]): string {
  if (type === "skill_level") return "Skill";
  if (type === "location") return "Location";
  return "Equipment";
}

export function ModifierEditor({
  modifiers,
  actionId,
  steps,
  skillOptions,
  onChange,
}: ModifierEditorProps) {
  const [curveEditor, setCurveEditor] = useState<{
    modifierIndex: number;
    effectIndex: number;
  } | null>(null);
  const [openModifiers, setOpenModifiers] = useState<string[]>([]);
  const [activeModifierType, setActiveModifierType] = useState<VariantModifier["type"]>(
    "location",
  );
  const hasTargets =
    Boolean(actionId) && steps.every((step) => Boolean(step.targetId ?? step.id));
  const targetOptions = useMemo(
    () => [
      { value: "actions" as const, label: "Action" },
      ...steps.map((_, index) => ({
        value: `cycle_steps:${index}` as const,
        label: `Cycle step #${index + 1}`,
      })),
    ],
    [steps],
  );
  const visibleModifiers = useMemo(
    () =>
      modifiers
        .map((modifier, modifierIndex) => ({ modifier, modifierIndex }))
        .filter(({ modifier }) => modifier.type === activeModifierType),
    [activeModifierType, modifiers],
  );
  const updateModifier = (
    modifierIndex: number,
    updater: (modifier: VariantModifier) => VariantModifier,
  ) => {
    onChange(
      modifiers.map((modifier, index) =>
        index === modifierIndex ? updater(modifier) : modifier,
      ),
    );
  };

  const updateEffect = (
    modifierIndex: number,
    effectIndex: number,
    updater: (effect: VariantModifierEffect) => VariantModifierEffect,
  ) => {
    updateModifier(modifierIndex, (modifier) => ({
      ...modifier,
      effects: modifier.effects.map((effect, index) =>
        index === effectIndex ? updater(effect) : effect,
      ),
    }));
  };

  const activeCurve = curveEditor
    ? modifiers[curveEditor.modifierIndex]?.effects[curveEditor.effectIndex]
    : undefined;

  const createEffect = (modifier: VariantModifier): VariantModifierEffect => {
    const effect = getDefaultEffect(actionId ?? "");
    if (modifier.type !== "skill_level") return effect;
    return {
      ...effect,
      value_type: "curve",
      value: getDefaultCurve(effect.target_property),
    };
  };

  const addModifier = (type: VariantModifier["type"]) => {
    const nextIndex = modifiers.length;
    setOpenModifiers((current) => [...current, `modifier-${nextIndex}`]);
    onChange([...modifiers, { name: "", type, effects: [] }]);
  };

  return (
    <div className="space-y-4">
      <Tabs
          value={activeModifierType}
          onValueChange={(value) =>
            setActiveModifierType(value as VariantModifier["type"])
          }
          className="space-y-4"
        >
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger value="location">
              Locations ({modifiers.filter((modifier) => modifier.type === "location").length})
            </TabsTrigger>
            <TabsTrigger value="skill_level">
              Skills ({modifiers.filter((modifier) => modifier.type === "skill_level").length})
            </TabsTrigger>
            <TabsTrigger value="equipment">
              Equipment ({modifiers.filter((modifier) => modifier.type === "equipment").length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value={activeModifierType}>
            {visibleModifiers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/70 px-6 py-8 text-center">
                <p className={EDITOR_BODY_TEXT_CLASS}>
                  No {getModifierTypeLabel(activeModifierType).toLowerCase()} modifiers added yet.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addModifier(activeModifierType)}
                >
                  <IconPlus size={16} />
                  Add modifier
                </Button>
              </div>
            ) : (
              <Accordion
                type="multiple"
                value={openModifiers}
                onValueChange={setOpenModifiers}
                className="space-y-0"
              >
                {visibleModifiers.map(({ modifier, modifierIndex }) => (
            <AccordionItem
              key={modifier.id ?? `modifier-${modifierIndex}`}
              value={`modifier-${modifierIndex}`}
              className="border-b border-border/70 px-0 py-4 last:border-b"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  {modifier.type === "skill_level" ? (
                    <div className="min-w-0">
                      <Select
                          value={
                            modifier.skill_id
                              ? String(modifier.skill_id)
                              : EMPTY_VALUE
                          }
                          onValueChange={(value) => {
                            const selectedSkill = skillOptions.find(
                              (skill) => String(skill.id ?? skill.value) === value,
                            );
                            updateModifier(modifierIndex, (current) => ({
                              ...current,
                              skill_id:
                                value === EMPTY_VALUE
                                  ? undefined
                                  : Number(value),
                              name: selectedSkill
                                ? `${selectedSkill.label} level`
                                : "",
                            }));
                          }}
                        >
                          <SelectTrigger aria-label="Modifier skill">
                            <SelectValue placeholder="Select skill">
                              {(() => {
                                const selectedSkill = skillOptions.find(
                                  (skill) =>
                                    String(skill.id ?? skill.value) ===
                                    String(modifier.skill_id),
                                );
                                return selectedSkill ? (
                                  <span className="flex items-center gap-2">
                                    <PixelArtIcon
                                      src={getUrlByType(selectedSkill.name)}
                                      alt=""
                                      size="sm"
                                    />
                                    <span>{selectedSkill.label}</span>
                                  </span>
                                ) : null;
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={EMPTY_VALUE}>Select skill</SelectItem>
                            {skillOptions
                              .filter(
                                (skill) =>
                                  !modifiers.some(
                                    (otherModifier, otherIndex) =>
                                      otherIndex !== modifierIndex &&
                                      otherModifier.type === "skill_level" &&
                                      otherModifier.skill_id === skill.id,
                                  ),
                              )
                              .map((skill) => (
                                <SelectItem
                                  key={skill.id ?? skill.value}
                                  value={String(skill.id ?? skill.value)}
                                >
                                  <span className="flex items-center gap-2">
                                    <PixelArtIcon
                                      src={getUrlByType(skill.name)}
                                      alt=""
                                      size="sm"
                                    />
                                    <span>{skill.label}</span>
                                  </span>
                                </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <Input
                        id={`modifier-name-${modifierIndex}`}
                        value={modifier.name}
                        placeholder="Modifier name"
                        maxLength={160}
                        onChange={(event) =>
                          updateModifier(modifierIndex, (current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                  <p className={cn("mt-1", EDITOR_META_TEXT_CLASS)}>
                    {modifier.effects.length} {modifier.effects.length === 1 ? "effect" : "effects"}
                  </p>
                </div>
                <div
                  className="flex shrink-0 items-center gap-1"
                >
                  <AccordionTrigger
                    aria-label={`Toggle ${modifier.name || "modifier"}`}
                    className="h-10 w-auto flex-none items-center gap-1 p-2 no-underline hover:no-underline"
                  >
                    {openModifiers.includes(`modifier-${modifierIndex}`)
                      ? "Hide effects"
                      : "Show effects"}
                  </AccordionTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${modifier.name || "modifier"}`}
                    className="h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      onChange(
                        modifiers.filter((_, index) => index !== modifierIndex),
                      )
                    }
                  >
                    <IconTrash size={16} />
                  </Button>
                </div>
              </div>
              <AccordionContent className="space-y-6 pb-4">
                <p className={EDITOR_SUBSECTION_TITLE_CLASS}>Effects</p>
                <div className="space-y-4">
                  {modifier.effects.length === 0 ? (
                    <EmptySelectionState description="No effects added yet." />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className={cn(EDITOR_TABLE_SURFACE_CLASS, "min-w-[760px]")}>
                        <TableHeader className={EDITOR_TABLE_HEADER_CLASS}>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[190px]">Modifies</TableHead>
                            <TableHead className="w-[190px]">Field</TableHead>
                            <TableHead className="w-[150px]">Operation</TableHead>
                            <TableHead className="min-w-[220px]">Value</TableHead>
                            <TableHead className="w-[64px] text-right" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {modifier.effects.map((effect, effectIndex) => {
                            const target = getTarget(effect, steps);
                            const fields = getFields(target);
                            const isAfk = effect.target_property === "isAfk";
                            const usesCurve =
                              modifier.type === "skill_level" && !isAfk;
                            const tickField = isTickField(effect.target_property);
                            const successChance = isSuccessChanceField(
                              effect.target_property,
                            );
                            const tickValue =
                              typeof effect.value === "number"
                                ? effect.value
                                : undefined;

                            return (
                              <TableRow key={effect.id ?? `effect-${effectIndex}`}>
                                <TableCell className="align-top">
                                  <Select
                                    disabled={!hasTargets}
                                    value={target}
                                    onValueChange={(value) => {
                                      const nextTarget = value as EditorTarget;
                                      const nextField = getFields(nextTarget)[0].value;
                                      updateEffect(
                                        modifierIndex,
                                        effectIndex,
                                        (current) => ({
                                          ...current,
                                          ...getEffectTargetData(
                                            nextTarget,
                                            actionId ?? "",
                                            steps,
                                          ),
                                          target_property: nextField,
                                          operation: "set",
                                          value_type:
                                            modifier.type === "skill_level"
                                              ? "curve"
                                              : "constant",
                                          value:
                                            modifier.type === "skill_level"
                                              ? getDefaultCurve(nextField)
                                              : nextField === "isAfk"
                                                ? false
                                                : 0,
                                        }),
                                      );
                                    }}
                                  >
                                    <SelectTrigger aria-label="Effect target">
                                      <SelectValue placeholder="Select target" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {targetOptions.map((option) => {
                                        const cycleStepIndex = option.value.startsWith(
                                          "cycle_steps:",
                                        )
                                          ? Number(option.value.split(":")[1])
                                          : -1;
                                        const cycleStep = steps[cycleStepIndex];
                                        return (
                                          <SelectItem
                                            key={option.value}
                                            value={option.value}
                                          >
                                            <span className="flex flex-col items-start">
                                              <span>{option.label}</span>
                                              {cycleStep ? (
                                                <span className={EDITOR_META_TEXT_CLASS}>
                                                  {cycleStep.name || "Unnamed step"}
                                                </span>
                                              ) : null}
                                            </span>
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="align-top">
                                  <Select
                                    disabled={!hasTargets}
                                    value={effect.target_property}
                                    onValueChange={(value) => {
                                      const field = value as EditorField;
                                      updateEffect(
                                        modifierIndex,
                                        effectIndex,
                                        (current) => ({
                                          ...current,
                                          target_property: field,
                                          operation:
                                            field === "isAfk"
                                              ? "set"
                                              : current.operation,
                                          value_type:
                                            modifier.type === "skill_level" &&
                                            field !== "isAfk"
                                              ? "curve"
                                              : "constant",
                                          value:
                                            modifier.type === "skill_level" &&
                                            field !== "isAfk"
                                              ? getDefaultCurve(field)
                                              : field === "isAfk"
                                                ? false
                                                : 0,
                                        }),
                                      );
                                    }}
                                  >
                                    <SelectTrigger aria-label="Effect field">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {fields.map((field) => (
                                        <SelectItem key={field.value} value={field.value}>
                                          {field.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="align-top">
                                  <Select
                                    value={effect.operation}
                                    onValueChange={(value) =>
                                      updateEffect(
                                        modifierIndex,
                                        effectIndex,
                                        (current) => ({
                                          ...current,
                                          operation: value as ModifierOperation,
                                        }),
                                      )
                                    }
                                  >
                                    <SelectTrigger aria-label="Effect operation">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="set">Set</SelectItem>
                                      {!isAfk ? (
                                        <SelectItem value="multiply">
                                          Multiply
                                        </SelectItem>
                                      ) : null}
                                      {!isAfk ? (
                                        <SelectItem value="add">Add</SelectItem>
                                      ) : null}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="align-top">
                                  {usesCurve ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() =>
                                        setCurveEditor({
                                          modifierIndex,
                                          effectIndex,
                                        })
                                      }
                                    >
                                      <IconChartLine size={16} />
                                      Graph
                                    </Button>
                                  ) : isAfk ? (
                                    <Select
                                      value={String(effect.value === true)}
                                      onValueChange={(value) =>
                                        updateEffect(
                                          modifierIndex,
                                          effectIndex,
                                          (current) => ({
                                            ...current,
                                            value: value === "true",
                                          }),
                                        )
                                      }
                                    >
                                      <SelectTrigger aria-label="Is AFK value">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="true">True</SelectItem>
                                        <SelectItem value="false">False</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <div>
                                      <div className="flex min-w-0 items-center gap-2">
                                      <Input
                                        type="number"
                                        inputMode="decimal"
                                        min={
                                          successChance
                                            ? effect.operation === "multiply"
                                              ? 0
                                              : effect.operation === "set"
                                                ? 0.01
                                                : undefined
                                            : 0
                                        }
                                        max={
                                          successChance && effect.operation === "set"
                                            ? 100
                                            : undefined
                                        }
                                        step={tickField ? "0.6" : "0.01"}
                                        value={getConstantDisplayValue(effect)}
                                        aria-label="Effect value"
                                        className="min-w-0 flex-1"
                                        onChange={(event) => {
                                          const raw = Number(event.target.value);
                                          if (!Number.isFinite(raw)) return;
                                          const value = tickField
                                            ? secondsToGameTicks(raw)
                                            : successChance
                                              ? effect.operation === "multiply"
                                                ? raw
                                                : raw / 100
                                              : raw;
                                          if (value === undefined) return;
                                          updateEffect(
                                            modifierIndex,
                                            effectIndex,
                                            (current) => ({ ...current, value }),
                                          );
                                        }}
                                      />
                                      {tickField && tickValue !== undefined && isWholeGameTick(tickValue) ? (
                                        <span className={cn("shrink-0", EDITOR_META_TEXT_CLASS)}>
                                          {formatGameTickCount(tickValue)}
                                        </span>
                                      ) : null}
                                      </div>
                                      {tickField && tickValue !== undefined && !isWholeGameTick(tickValue) ? (
                                        <p className="mt-1 text-[13px] font-medium leading-[18px] text-destructive">
                                          Must be divisible by 0.6 seconds.
                                        </p>
                                      ) : null}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="align-top text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Delete effect"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() =>
                                      updateModifier(modifierIndex, (current) => ({
                                        ...current,
                                        effects: current.effects.filter(
                                          (_, index) => index !== effectIndex,
                                        ),
                                      }))
                                    }
                                  >
                                    <IconTrash size={16} />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!hasTargets}
                    onClick={() =>
                      updateModifier(modifierIndex, (current) => ({
                        ...current,
                        effects: [...current.effects, createEffect(current)],
                      }))
                    }
                  >
                    <IconPlus size={16} />
                    Add effect
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>
      </Tabs>
      <Button
        type="button"
        variant="outline"
        onClick={() => addModifier(activeModifierType)}
      >
        <IconPlus size={16} />
        Add modifier
      </Button>
      {!hasTargets ? (
        <p className={EDITOR_BODY_TEXT_CLASS}>
          Add an action and at least one cycle step before adding effects.
        </p>
      ) : null}
      {activeCurve && curveEditor ? (
        <CurveDialog
          open
          onOpenChange={(open) => !open && setCurveEditor(null)}
          value={normalizeCurve(
            activeCurve.value,
            activeCurve.target_property,
          )}
          successChance={isSuccessChanceField(activeCurve.target_property)}
          tickField={isTickField(activeCurve.target_property)}
          onSave={(value) =>
            updateEffect(
              curveEditor.modifierIndex,
              curveEditor.effectIndex,
              (effect) => ({ ...effect, value_type: "curve", value }),
            )
          }
        />
      ) : null}
    </div>
  );
}
