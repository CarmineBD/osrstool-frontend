import { describe, expect, it, vi } from "vitest";
import {
  buildMethodUpdatePayload,
  fetchTrendingProfitMethods,
  fetchItems,
  getVariantsSignature,
  searchItems,
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

  it("requests the last-hour window for trending profit methods", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          data: {
            methods: [
              {
                id: "trend-1",
                slug: "testing",
                name: "Testing",
                category: "skilling",
                variants: [
                  {
                    id: "variant-1",
                    slug: "copy-of-new-variant",
                    label: "copy of New variant",
                    xpHour: null,
                    requirements: {},
                    lowProfit: 2221295961.1012797,
                    highProfit: 2275707578.04,
                    profitGrowth: {
                      window: "1h",
                      mode: "reliable",
                      previousPeriodProfit: 2203244244.34435,
                      currentPeriodProfit: 2221295961.1012797,
                      growthAbs: 18051716.756929874,
                      growthPct: 0.8193243578540143,
                      trendDirection: "up",
                    },
                    inputs: [],
                    outputs: [],
                  },
                ],
              },
            ],
          },
          warnings: [],
          meta: {
            total: 1,
            window: "1h",
            mode: "reliable",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const methods = await fetchTrendingProfitMethods();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInput = fetchSpy.mock.calls[0]?.[0];
    const requestUrl =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;
    const url = new URL(requestUrl, window.location.origin);

    expect(url.searchParams.get("window")).toBe("1h");
    expect(url.searchParams.get("mode")).toBe("reliable");
    expect(url.searchParams.get("variants")).toBe("all");
    expect(methods).toHaveLength(1);
    expect(methods[0]?.name).toBe("Testing");
    expect(methods[0]?.variants[0]?.profitGrowth?.growthAbs).toBe(
      18051716.756929874
    );

    fetchSpy.mockRestore();
  });

  it("defaults showUntradeables to false when searching items", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { items: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await searchItems("coal", 10, 2);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInput = fetchSpy.mock.calls[0]?.[0];
    const requestUrl =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;
    const url = new URL(requestUrl, window.location.origin);

    expect(url.searchParams.get("q")).toBe("coal");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("showUntradeables")).toBe("false");

    fetchSpy.mockRestore();
  });

  it("passes showUntradeables when enabled in item search", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { items: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await searchItems("coal", 10, 1, undefined, { showUntradeables: true });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInput = fetchSpy.mock.calls[0]?.[0];
    const requestUrl =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;
    const url = new URL(requestUrl, window.location.origin);

    expect(url.searchParams.get("showUntradeables")).toBe("true");

    fetchSpy.mockRestore();
  });
});
