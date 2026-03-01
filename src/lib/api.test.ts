import { describe, expect, it, vi } from "vitest";
import {
  buildMethodUpdatePayload,
  fetchItems,
  getVariantsSignature,
  type Variant,
} from "./api";

describe("api update payload helpers", () => {
  it("maps input/output item types in the method update payload", () => {
    const variant: Variant = {
      label: "Main",
      xpHour: [],
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
        xpHour: [],
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

  it("requests extended fields when fetching items", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await fetchItems([100, 200]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInput = fetchSpy.mock.calls[0]?.[0];
    const requestUrl =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;
    const url = new URL(requestUrl, window.location.origin);

    expect(url.searchParams.get("ids")).toBe("100,200");
    expect(url.searchParams.get("fields")).toBe(
      "name,iconUrl,highPrice,lowPrice,high24h,low24h,highTime,lowTime"
    );

    fetchSpy.mockRestore();
  });
});
