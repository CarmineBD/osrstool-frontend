import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const server = setupServer(
  http.get("*/users/me", () =>
    HttpResponse.json({
      data: {
        id: "user-1",
        email: "test@example.com",
        username: "account_user",
        role: "user",
      },
    })
  ),
  http.get("*/me", () =>
    HttpResponse.json({
      data: {
        id: "user-1",
        email: "test@example.com",
        username: "account_user",
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
  http.get("*/methods/tags", () =>
    HttpResponse.json({
      data: {
        tags: [
          {
            key: "ge_limits",
            label: "GE limits",
            severity: 2,
            description:
              "Some required inputs exceed Grand Exchange buy limits at the one-hour scale.",
          },
          {
            key: "high_investment_required",
            label: "High investment required",
            severity: 2,
            description:
              "This method requires a high upfront investment. One hour of inputs costs more than the method's best-case hourly profit.",
          },
          {
            key: "risky_to_lose_money",
            label: "Risky to lose money",
            severity: 3,
            description:
              "This method can be profitable in the best case, but it can lose money in the worst case.",
          },
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
          {
            key: "very_slow_to_buy_inputs",
            label: "Very Slow to buy inputs",
            severity: 2,
            description:
              "Buying the required inputs may take a long time because hourly demand is much higher than market volume.",
          },
          {
            key: "very_slow_to_sell_outputs",
            label: "Very Slow to sell outputs",
            severity: 2,
            description:
              "Selling the generated outputs may take a long time because hourly supply is much higher than market volume.",
          },
        ],
      },
    }),
  ),
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
                icon_id: 1001,
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
                icon_id: 1002,
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
