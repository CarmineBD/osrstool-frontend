import { describe, expect, it, vi } from "vitest";
import {
  buildMethodUpdatePayload,
  createMethodWithVariants,
  fetchMethodTags,
  fetchMethods,
  fetchSkillRoadmap,
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
      icon_id: 3145,
      members: true,
      description: "Primera linea\nSegunda linea\n\nTercera linea",
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
        icon_id: 3145,
      },
      [variant]
    );

    expect(payload.icon_id).toBe(3145);
    expect(payload.variants[0]?.icon_id).toBe(3145);
    expect(payload.variants[0]?.inputs[0]?.type).toBe("input");
    expect(payload.variants[0]?.outputs[0]?.type).toBe("output");
    expect(payload.variants[0]?.outputs[0]?.reason).toBeNull();
    expect(payload.variants[0]?.members).toBe(true);
    expect(payload.variants[0]?.description).toBe(
      "Primera linea\nSegunda linea\n\nTercera linea"
    );
  });

  it("builds stable signatures for equal variants", () => {
    const variants: Variant[] = [
      {
        label: "A",
        icon_id: 100,
        members: false,
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
                    members: true,
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

  it("passes the members filter when fetching methods", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { methods: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await fetchMethods(undefined, undefined, undefined, { members: false });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInput = fetchSpy.mock.calls[0]?.[0];
    const requestUrl =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;
    const url = new URL(requestUrl, window.location.origin);

    expect(url.searchParams.get("members")).toBe("false");
    expect(url.searchParams.get("show_only_free_to_play")).toBe("false");

    fetchSpy.mockRestore();
  });

  it("falls back to summing variant likes when a method aggregate is missing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            methods: [
              {
                id: "method-1",
                slug: "zulrah",
                name: "Zulrah",
                category: "combat",
                variants: [
                  {
                    id: "variant-1",
                    slug: "main",
                    label: "Main",
                    likes: 2,
                    members: true,
                    requirements: {},
                    inputs: [],
                    outputs: [],
                  },
                  {
                    id: "variant-2",
                    slug: "alt",
                    label: "Alt",
                    likes: 3,
                    members: true,
                    requirements: {},
                    inputs: [],
                    outputs: [],
                  },
                ],
              },
            ],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const response = await fetchMethods();

    expect(response.methods[0]?.likes).toBe(5);

    fetchSpy.mockRestore();
  });

  it("truncates long method and username filters before fetching methods", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { methods: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await fetchMethods("abcdefghijklmnop", undefined, "x".repeat(130));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInput = fetchSpy.mock.calls[0]?.[0];
    const requestUrl =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;
    const url = new URL(requestUrl, window.location.origin);

    expect(url.searchParams.get("username")).toBe("abcdefghijkl");
    expect(url.searchParams.get("name")).toBe("x".repeat(100));

    fetchSpy.mockRestore();
  });

  it("passes the free-to-play-only filter when enabled", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { methods: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await fetchMethods(undefined, undefined, undefined, {
      showOnlyFreeToPlay: true,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInput = fetchSpy.mock.calls[0]?.[0];
    const requestUrl =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;
    const url = new URL(requestUrl, window.location.origin);

    expect(url.searchParams.get("show_only_free_to_play")).toBe("true");

    fetchSpy.mockRestore();
  });

  it("passes ignoredTags as repeated query params when fetching methods", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { methods: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await fetchMethods(undefined, undefined, undefined, {
      ignoredTags: ["not_viable", "safe"],
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInput = fetchSpy.mock.calls[0]?.[0];
    const requestUrl =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;
    const url = new URL(requestUrl, window.location.origin);

    expect(url.searchParams.getAll("ignoredTags")).toEqual([
      "not_viable",
      "safe",
    ]);

    fetchSpy.mockRestore();
  });

  it("fetches the method tags catalog", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            tags: [
              {
                key: "not_viable",
                label: "Not viable",
                severity: 3,
                description:
                  "This method has extreme market impact. Operating it at the one-hour scale may take days to fully buy and sell through the market.",
              },
              {
                key: "safe",
                label: "Safe",
                severity: 1,
                description: "This method stayed above break-even over the last 24 hours.",
              },
            ],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(fetchMethodTags()).resolves.toEqual([
      {
        key: "not_viable",
        label: "Not viable",
        severity: 3,
        description:
          "This method has extreme market impact. Operating it at the one-hour scale may take days to fully buy and sell through the market.",
      },
      {
        key: "safe",
        label: "Safe",
        severity: 1,
        description: "This method stayed above break-even over the last 24 hours.",
      },
    ]);

    fetchSpy.mockRestore();
  });

  it("calls the roadmap endpoint with the backend-compatible query params", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            roadmap: {
              skill: "herblore",
              strategy: "profitable",
              currentLevel: 1,
              currentExperience: 0,
              targetLevel: 99,
              targetExperience: 13034431,
              totalHours: 10,
              averageAfkPercent: 50,
              totalProfit: { low: -1000, high: 5000 },
              ranges: [],
            },
            user: {
              levels: { Herblore: 1 },
              quests: {},
              achievement_diaries: {},
            },
          },
          meta: {
            username: "abcdefghijkl",
            skill: "herblore",
            strategy: "profitable",
            enabled: true,
            show_only_free_to_play: true,
            ignoredTags: ["safe", "not_viable"],
            computedAt: 1771459200,
            usesExactSkillExperience: true,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const response = await fetchSkillRoadmap({
      username: "abcdefghijklmnop",
      skill: "herblore",
      strategy: "profitable",
      targetLevel: 77,
      showOnlyFreeToPlay: true,
      ignoredTags: ["safe", "not_viable"],
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInput = fetchSpy.mock.calls[0]?.[0];
    const requestUrl =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;
    const url = new URL(requestUrl, window.location.origin);

    expect(url.pathname.endsWith("/methods/skills/roadmap")).toBe(true);
    expect(url.searchParams.get("username")).toBe("abcdefghijkl");
      expect(url.searchParams.get("skill")).toBe("herblore");
      expect(url.searchParams.get("strategy")).toBe("profitable");
      expect(url.searchParams.get("target_level")).toBe("77");
      expect(url.searchParams.get("show_only_free_to_play")).toBe("true");
    expect(url.searchParams.getAll("ignoredTags")).toEqual([
      "safe",
      "not_viable",
    ]);
    expect(response.meta.strategy).toBe("profitable");

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

  it("truncates long item search queries", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { items: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await searchItems("q".repeat(140), 10, 1);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInput = fetchSpy.mock.calls[0]?.[0];
    const requestUrl =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;
    const url = new URL(requestUrl, window.location.origin);

    expect(url.searchParams.get("q")).toBe("q".repeat(100));

    fetchSpy.mockRestore();
  });

  it("surfaces structured free-to-play conflicts from method save errors", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "error",
          error: {
            code: "F2P_VARIANT_CONTAINS_MEMBERS_ITEMS",
            message: "Free-to-play variants cannot include members-only items. Conflicts: Main: Abyssal whip, Membership bond",
            details: {
              variants: [
                {
                  variantTitle: "Main",
                  membersOnlyItems: [
                    { id: 100, name: "Abyssal whip" },
                    { id: 101, name: "Membership bond" },
                  ],
                },
              ],
            },
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    );

    await expect(
      createMethodWithVariants(
        {
          name: "Test method",
          category: "combat",
          description: "desc",
          enabled: true,
          icon_id: 3145,
        },
        [
          {
            label: "Main",
            icon_id: 3145,
            members: false,
            xpHour: [],
            requirements: {},
            inputs: [],
            outputs: [],
          },
        ],
      ),
    ).rejects.toMatchObject({
      code: "F2P_VARIANT_CONTAINS_MEMBERS_ITEMS",
      message:
        "Free-to-play variants cannot include members-only items. Conflicts: Main: Abyssal whip, Membership bond",
      status: 400,
      freeToPlayVariantConflicts: [
        {
          variantLabel: "Main",
          items: [
            { id: 100, name: "Abyssal whip" },
            { id: 101, name: "Membership bond" },
          ],
          itemNames: ["Abyssal whip", "Membership bond"],
        },
      ],
    });

    fetchSpy.mockRestore();
  });
});
