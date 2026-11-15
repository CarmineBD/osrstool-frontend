import { describe, expect, it } from "vitest";
import { validateDynamicModifiers } from "@/features/method-upsert/useMethodUpsert";
import type { Variant, VariantModifierEffect } from "@/lib/api";

function createDynamicVariant(effect: VariantModifierEffect): Variant {
  return {
    calculationMode: "dynamic",
    dynamicAction: { id: "action-id" },
    cycleSteps: [{ targetId: "step-id" }],
    modifiers: [
      {
        name: "Test modifier",
        type: "location",
        effects: [effect],
      },
    ],
  } as Variant;
}

describe("validateDynamicModifiers", () => {
  it("accepts success chance and timing multipliers as operands", () => {
    expect(
      validateDynamicModifiers(
        createDynamicVariant({
          target_type: "actions",
          target_id: "action-id",
          target_property: "baseSuccessChance",
          operation: "multiply",
          value_type: "constant",
          value: 2,
        }),
        "Dynamic variant",
      ),
    ).toBeNull();

    expect(
      validateDynamicModifiers(
        createDynamicVariant({
          target_type: "actions",
          target_id: "action-id",
          target_property: "rollIntervalTicks",
          operation: "multiply",
          value_type: "constant",
          value: 0.5,
        }),
        "Dynamic variant",
      ),
    ).toBeNull();
  });

  it("keeps absolute success chance limits for set operations", () => {
    expect(
      validateDynamicModifiers(
        createDynamicVariant({
          target_type: "actions",
          target_id: "action-id",
          target_property: "baseSuccessChance",
          operation: "set",
          value_type: "constant",
          value: 2,
        }),
        "Dynamic variant",
      ),
    ).toContain("at most 100%");
  });
});
