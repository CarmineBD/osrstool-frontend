import type {
  DynamicActionItem,
  DynamicActionSkillXp,
  DynamicVariantAction,
} from "@/lib/api";

export const MAX_BASE_SUCCESS_CHANCE = 0.9999;

export function normalizeBaseSuccessChancePercentage(
  value: number,
): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  return Number(Math.min(99.99, Math.max(0.01, value)).toFixed(2));
}

export function parseBaseSuccessChancePercentage(
  value: string,
): number | undefined {
  const normalizedValue = value.trim().replace(",", ".");
  if (!/^\d*(?:\.\d*)?$/.test(normalizedValue) || normalizedValue === "") {
    return undefined;
  }

  const percentage = normalizeBaseSuccessChancePercentage(
    Number(normalizedValue),
  );
  return percentage === undefined
    ? undefined
    : Number((percentage / 100).toFixed(4));
}

export function formatBaseSuccessChancePercentage(
  value: number | undefined,
): string {
  return value === undefined
    ? ""
    : String(Number((value * 100).toFixed(2)));
}

export function withoutActionCondition(
  item: DynamicActionItem,
): DynamicActionItem {
  return {
    id: item.id,
    quantity: item.quantity,
    ...(item.type ? { type: item.type } : {}),
    ...(item.reason !== undefined ? { reason: item.reason } : {}),
  };
}

function withoutXpCondition(entry: DynamicActionSkillXp): DynamicActionSkillXp {
  return {
    skillId: entry.skillId,
    experience: entry.experience,
    ...(entry.skill ? { skill: entry.skill } : {}),
  };
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

export function createEditorDynamicAction(
  action: DynamicVariantAction | undefined,
): DynamicVariantAction {
  if (!action) return createEmptyDynamicAction();

  const hasEditorFailureState =
    action.failureInputs !== undefined ||
    action.failureOutputs !== undefined ||
    action.failureXpGained !== undefined;
  if (hasEditorFailureState) return action;

  const hasFailureConfiguration = [
    ...action.inputs,
    ...action.outputs,
    ...action.xpGained,
  ].some(
    (entry) => entry.condition === "success" || entry.condition === "failure",
  );
  const inputs = action.inputs
    .filter((item) => item.condition !== "failure")
    .map(withoutActionCondition);
  const outputs = action.outputs
    .filter((item) => item.condition !== "failure")
    .map(withoutActionCondition);
  const xpGained = action.xpGained
    .filter((entry) => entry.condition !== "failure")
    .map(withoutXpCondition);
  const inputsHaveConditionalEffects = action.inputs.some(
    (item) => item.condition === "success" || item.condition === "failure",
  );
  const outputsHaveConditionalEffects = action.outputs.some(
    (item) => item.condition === "success" || item.condition === "failure",
  );
  const xpHaveConditionalEffects = action.xpGained.some(
    (entry) => entry.condition === "success" || entry.condition === "failure",
  );

  return {
    ...action,
    inputs,
    outputs,
    xpGained,
    ...(hasFailureConfiguration
      ? {
          baseSuccessChance:
            action.baseSuccessChance ?? MAX_BASE_SUCCESS_CHANCE,
          failureInputs: inputsHaveConditionalEffects
            ? action.inputs
                .filter((item) => item.condition === "failure")
                .map(withoutActionCondition)
            : inputs.map(withoutActionCondition),
          failureOutputs: outputsHaveConditionalEffects
            ? action.outputs
                .filter((item) => item.condition === "failure")
                .map(withoutActionCondition)
            : outputs.map(withoutActionCondition),
          failureXpGained: xpHaveConditionalEffects
            ? action.xpGained
                .filter((entry) => entry.condition === "failure")
                .map(withoutXpCondition)
            : xpGained.map(withoutXpCondition),
        }
      : {
          baseSuccessChance: undefined,
          failureInputs: undefined,
          failureOutputs: undefined,
          failureXpGained: undefined,
        }),
  };
}

export function hasConditionalEffects(
  action: DynamicVariantAction | undefined,
): boolean {
  const hasEditorFailureState =
    action?.failureInputs !== undefined ||
    action?.failureOutputs !== undefined ||
    action?.failureXpGained !== undefined;
  return (
    hasEditorFailureState ||
    action?.inputs.some(
      (item) => item.condition === "success" || item.condition === "failure",
    ) ||
    action?.outputs.some(
      (item) => item.condition === "success" || item.condition === "failure",
    ) ||
    action?.xpGained.some(
      (entry) => entry.condition === "success" || entry.condition === "failure",
    ) ||
    false
  );
}
