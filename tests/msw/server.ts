import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const server = setupServer(
  http.get("*/users/me", () =>
    HttpResponse.json({
      data: {
        id: "user-1",
        email: "test@example.com",
        role: "user",
      },
    })
  ),
  http.get("*/me", () =>
    HttpResponse.json({
      data: {
        id: "user-1",
        email: "test@example.com",
        role: "user",
      },
    })
  ),
  http.get("*/achievement-diaries", () => HttpResponse.json([])),
  http.get("*/achievement_diaries", () => HttpResponse.json([])),
  http.get("*/items", ({ request }) => {
    const url = new URL(request.url);
    const ids = (url.searchParams.get("ids") ?? "")
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    const data = Object.fromEntries(
      ids.map((id) => [
        id,
        {
          name: `Item ${id}`,
          iconUrl: `https://example.com/items/${id}.png`,
        },
      ])
    );

    return HttpResponse.json({ data });
  }),
  http.get("*/quests", () => HttpResponse.json([])),
  http.get("*/methods/trending-profit", ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("window") !== "1h") {
      return HttpResponse.json(
        { error: "Expected trending profit window=1h" },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      data: {
        methods: [
          {
            id: "trend-1",
            slug: "blast-furnace",
            name: "Blast Furnace",
            category: "processing",
            variantCount: 1,
            variants: [
              {
                id: "trend-variant-1",
                slug: "steel-bars",
                label: "Steel bars",
                highProfit: 1200000,
                lowProfit: 980000,
                profitGrowth: {
                  window: "1h",
                  mode: "reliable",
                  previousPeriodProfit: 930000,
                  currentPeriodProfit: 980000,
                  growthAbs: 50000,
                  growthPct: 5.38,
                  trendDirection: "up",
                },
                xpHour: [],
                requirements: {},
                inputs: [],
                outputs: [],
              },
            ],
          },
          {
            id: "trend-2",
            slug: "rune-dragons",
            name: "Rune Dragons",
            category: "combat",
            variantCount: 1,
            variants: [
              {
                id: "trend-variant-2",
                slug: "main",
                label: "Main",
                highProfit: 900000,
                lowProfit: 820000,
                profitGrowth: {
                  window: "1h",
                  mode: "reliable",
                  previousPeriodProfit: 795000,
                  currentPeriodProfit: 820000,
                  growthAbs: 25000,
                  growthPct: 2.4,
                  trendDirection: "up",
                },
                xpHour: [],
                requirements: {},
                inputs: [],
                outputs: [],
              },
            ],
          },
        ],
      },
    });
  }),
  http.get("*/skills", () => HttpResponse.json([]))
);
