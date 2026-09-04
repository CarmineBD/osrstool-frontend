import { useState, type DragEvent } from "react";
import { IconGripVertical, IconPlus, IconTrash } from "@tabler/icons-react";
import { DynamicCycleSummary } from "@/components/DynamicCycleSummary";
import {
  EDITOR_ERROR_TEXT_CLASS,
  EDITOR_META_TEXT_CLASS,
  EDITOR_TABLE_HEADER_CLASS,
  EDITOR_TABLE_SURFACE_CLASS,
  EmptySelectionState,
} from "@/components/method-editor/MethodEditorPrimitives";
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
import type { DynamicCycleStep } from "@/lib/api";
import { calculateDynamicCycleSummary } from "@/lib/dynamicCycle";
import {
  formatGameTickCount,
  formatGameTickSeconds,
  isWholeGameTick,
  secondsToGameTicks,
} from "@/lib/gameTicks";
import { DYNAMIC_STEP_NAME_MAX_LENGTH, normalizeBoundedText, normalizeDigitInput } from "@/lib/validation";
import { cn } from "@/lib/utils";

interface DynamicCycleStepsFieldProps {
  steps: DynamicCycleStep[];
  rollIntervalTicks: number | undefined;
  onChange: (steps: DynamicCycleStep[]) => void;
  showValidationErrors?: boolean;
}

function normalizeStepPositions(steps: DynamicCycleStep[]): DynamicCycleStep[] {
  return steps.map((step, index) => ({
    ...step,
    stepOrderPosition: index + 1,
  }));
}

function createCycleStep(stepOrderPosition: number): DynamicCycleStep {
  return {
    name: "",
    stepOrderPosition,
    clicksMade: 0,
    isAfk: false,
    actionsMade: 0,
    durationTicks: 0,
  };
}

export function DynamicCycleStepsField({
  steps,
  rollIntervalTicks,
  onChange,
  showValidationErrors,
}: DynamicCycleStepsFieldProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const hasUsableRollInterval =
    typeof rollIntervalTicks === "number" &&
    Number.isInteger(rollIntervalTicks) &&
    rollIntervalTicks > 0;
  const summary = calculateDynamicCycleSummary(steps, rollIntervalTicks);

  const updateStep = (index: number, nextValues: Partial<DynamicCycleStep>) => {
    onChange(
      normalizeStepPositions(
        steps.map((step, stepIndex) =>
          stepIndex === index ? { ...step, ...nextValues } : step,
        ),
      ),
    );
  };

  const reorderSteps = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const nextSteps = [...steps];
    const [movedStep] = nextSteps.splice(fromIndex, 1);
    if (!movedStep) return;
    nextSteps.splice(toIndex, 0, movedStep);
    onChange(normalizeStepPositions(nextSteps));
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, index: number) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
    setDraggingIndex(index);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (event: DragEvent<HTMLTableRowElement>, index: number) => {
    event.preventDefault();
    const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isInteger(sourceIndex)) {
      reorderSteps(sourceIndex, index);
    }
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      {steps.length === 0 ? (
        <EmptySelectionState description="No steps added yet." />
      ) : (
        <Table className={cn(EDITOR_TABLE_SURFACE_CLASS, "min-w-[860px]")}>
          <TableHeader className={EDITOR_TABLE_HEADER_CLASS}>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[64px]">Step</TableHead>
              <TableHead className="min-w-[180px]">Name</TableHead>
              <TableHead className="w-[104px]">Clicks</TableHead>
              <TableHead className="w-[100px]">Is AFK</TableHead>
              <TableHead className="w-[124px]">Actions made</TableHead>
              <TableHead className="min-w-[174px]">Duration (seconds)</TableHead>
              <TableHead className="w-[92px] text-right">Options</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {steps.map((step, index) => {
              const actionsMade = step.actionsMade ?? 0;
              const isActionStep = actionsMade > 0;
              const resolvedDurationTicks = isActionStep
                ? hasUsableRollInterval
                  ? actionsMade * rollIntervalTicks
                  : undefined
                : (step.durationTicks ?? 0);
              const durationHasTickError =
                !isActionStep &&
                typeof resolvedDurationTicks === "number" &&
                !isWholeGameTick(resolvedDurationTicks);
              const nameError = showValidationErrors && !step.name.trim();

              return (
                <TableRow
                  key={step.id ?? `${step.stepOrderPosition}-${index}`}
                  onDragOver={(event) => {
                    if (draggingIndex === null || draggingIndex === index) return;
                    event.preventDefault();
                    if (dragOverIndex !== index) setDragOverIndex(index);
                  }}
                  onDrop={(event) => handleDrop(event, index)}
                  className={cn(
                    dragOverIndex === index && "outline outline-1 outline-primary/40",
                  )}
                >
                  <TableCell className="align-top font-medium">#{index + 1}</TableCell>
                  <TableCell className="align-top">
                    <Input
                      value={step.name}
                      maxLength={DYNAMIC_STEP_NAME_MAX_LENGTH}
                      aria-label={`Step ${index + 1} name`}
                      className={cn(
                        "bg-background",
                        nameError && "border-destructive focus-visible:ring-destructive",
                      )}
                      onChange={(event) =>
                        updateStep(index, {
                          name: normalizeBoundedText(
                            event.target.value,
                            DYNAMIC_STEP_NAME_MAX_LENGTH,
                          ),
                        })
                      }
                    />
                    {nameError ? (
                      <p className={cn("mt-2", EDITOR_ERROR_TEXT_CLASS)}>
                        A step name is required.
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={String(step.clicksMade)}
                      aria-label={`Step ${index + 1} clicks`}
                      onChange={(event) =>
                        updateStep(index, {
                          clicksMade: Number(
                            normalizeDigitInput(event.target.value, 8) || "0",
                          ),
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={step.isAfk ?? false}
                        aria-label={`Step ${index + 1} is AFK`}
                        onCheckedChange={(isAfk) => updateStep(index, { isAfk })}
                      />
                      <span className={EDITOR_META_TEXT_CLASS}>
                        {step.isAfk ? "On" : "Off"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={String(actionsMade)}
                      aria-label={`Step ${index + 1} actions made`}
                      onChange={(event) =>
                        updateStep(index, {
                          actionsMade: Number(
                            normalizeDigitInput(event.target.value, 8) || "0",
                          ),
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.6"
                      disabled={isActionStep}
                      value={formatGameTickSeconds(resolvedDurationTicks)}
                      aria-label={`Step ${index + 1} duration in seconds`}
                      className={cn(
                        "bg-background",
                        durationHasTickError &&
                          "border-destructive focus-visible:ring-destructive",
                      )}
                      onChange={(event) =>
                        updateStep(index, {
                          durationTicks:
                            event.target.value === ""
                              ? 0
                              : secondsToGameTicks(event.target.valueAsNumber) ?? 0,
                        })
                      }
                    />
                    {isWholeGameTick(resolvedDurationTicks) ? (
                      <p className={cn("mt-2", EDITOR_META_TEXT_CLASS)}>
                        {formatGameTickCount(resolvedDurationTicks)}
                      </p>
                    ) : null}
                    {durationHasTickError ? (
                      <p className={cn("mt-1", EDITOR_ERROR_TEXT_CLASS)}>
                        Duration must be divisible by 0.6 seconds.
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete step ${index + 1}`}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() =>
                          onChange(
                            normalizeStepPositions(
                              steps.filter((_, stepIndex) => stepIndex !== index),
                            ),
                          )
                        }
                      >
                        <IconTrash size={16} />
                      </Button>
                      <button
                        type="button"
                        aria-label={`Reorder step ${index + 1}`}
                        className={cn(
                          "cursor-grab rounded-md p-2 text-muted-foreground transition hover:text-foreground",
                          draggingIndex === index && "cursor-grabbing",
                        )}
                        draggable
                        onDragStart={(event) => handleDragStart(event, index)}
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

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          onChange([...steps, createCycleStep(steps.length + 1)])
        }
      >
        <IconPlus size={16} />
        Add new step
      </Button>

      <DynamicCycleSummary {...summary} />
    </div>
  );
}

export default DynamicCycleStepsField;
