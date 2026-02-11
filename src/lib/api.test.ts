import { describe, expect, it } from "vitest";
import { buildMethodUpdatePayload, getVariantsSignature, type Variant } from "./api";

describe("api update payload helpers", () => {
  it("maps input/output item types in the method update payload", () => {
    const variant: Variant = {
      label: "Main",
      requirements: {},
      inputs: [{ id: 1, quantity: 2, reason: "buy" }],
      outputs: [{ id: 2, quantity: 3 }],
    };

    const payload = buildMethodUpdatePayload(
      {
        name: "Test method",
        category: "skilling",
        description: "desc",
        enabled: true,
      },
      [variant]
    );

    expect(payload.variants[0]?.inputs[0]?.type).toBe("input");
    expect(payload.variants[0]?.outputs[0]?.type).toBe("output");
    expect(payload.variants[0]?.outputs[0]?.reason).toBeNull();
  });

  it("builds stable signatures for equal variants", () => {
    const variants: Variant[] = [
      {
        label: "A",
        requirements: {},
        inputs: [{ id: 100, quantity: 1 }],
        outputs: [{ id: 200, quantity: 1 }],
      },
    ];

    const signatureA = getVariantsSignature(variants);
    const signatureB = getVariantsSignature(
      JSON.parse(JSON.stringify(variants)) as Variant[]
    );

    expect(signatureA).toBe(signatureB);
  });
});
