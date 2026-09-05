import { describe, expect, it } from "vitest";
import {
  createEditorDynamicAction,
  formatBaseSuccessChancePercentage,
  hasConditionalEffects,
  normalizeBaseSuccessChancePercentage,
  parseBaseSuccessChancePercentage,
} from "./dynamicActionFailureState";

describe("dynamic action failure editor state", () => {
  it("keeps UI failure effects after the parent re-renders the edited variant", () => {
    const editorAction = {
      name: "Open chest",
      rollIntervalTicks: 4,
      baseSuccessChance: 0.75,
      inputs: [{ id: 1, quantity: 2 }],
      outputs: [{ id: 2, quantity: 1 }],
      xpGained: [],
      failureInputs: [{ id: 1, quantity: 3 }],
      failureOutputs: [{ id: 2, quantity: 0 }],
      failureXpGained: [{ skillId: 3, experience: 10 }],
    };

    expect(createEditorDynamicAction(editorAction)).toEqual(editorAction);
    expect(hasConditionalEffects(editorAction)).toBe(true);
  });

  it("duplicates unconditional effects into the failure editor when loading a conditional action", () => {
    const editorAction = createEditorDynamicAction({
      name: "Open chest",
      rollIntervalTicks: 4,
      baseSuccessChance: 0.75,
      inputs: [{ id: 1, quantity: 2, condition: "always" }],
      outputs: [
        { id: 2, quantity: 1, condition: "success" },
        { id: 2, quantity: 0, condition: "failure" },
      ],
      xpGained: [
        { skillId: 3, skill: "thieving", experience: 50, condition: "always" },
      ],
    });

    expect(editorAction.inputs).toEqual([{ id: 1, quantity: 2 }]);
    expect(editorAction.failureInputs).toEqual([{ id: 1, quantity: 2 }]);
    expect(editorAction.outputs).toEqual([{ id: 2, quantity: 1 }]);
    expect(editorAction.failureOutputs).toEqual([{ id: 2, quantity: 0 }]);
    expect(editorAction.xpGained).toEqual([
      { skillId: 3, skill: "thieving", experience: 50 },
    ]);
    expect(editorAction.failureXpGained).toEqual([
      { skillId: 3, skill: "thieving", experience: 50 },
    ]);
  });

  it("preserves valid maximum percentage values without floating-point truncation", () => {
    expect(normalizeBaseSuccessChancePercentage(99.99)).toBe(99.99);
    expect(normalizeBaseSuccessChancePercentage(99.9)).toBe(99.9);
    expect(normalizeBaseSuccessChancePercentage(100)).toBe(99.99);
    expect(parseBaseSuccessChancePercentage("99,99")).toBe(0.9999);
    expect(parseBaseSuccessChancePercentage("99.9")).toBe(0.999);
    expect(formatBaseSuccessChancePercentage(0.9999)).toBe("99.99");
  });
});
