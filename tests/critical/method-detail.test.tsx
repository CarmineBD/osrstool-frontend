import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { MethodDetail } from "@/pages/MethodDetail";
import { server } from "../msw/server";
import { renderWithProviders } from "../utils/render";

const methodAuditDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function renderMethodDetail(route: string) {
  return renderWithProviders(
    <Routes>
      <Route
        path="/moneyMakingMethod/:slug/:variantSlug?"
        element={<MethodDetail />}
      />
    </Routes>,
    { route }
  );
}

describe("critical flow: method detail load + error", () => {
  it("loads and renders method detail", async () => {
    server.use(
      http.get("*/methods/slug/:slug", ({ params }) =>
        HttpResponse.json({
          data: {
            method: {
              id: "method-1",
              slug: params.slug,
              name: "Vorkath farming",
              category: "combat",
              description: "Consistent dragon loot.",
              likes: 7,
              likedByMe: false,
              variants: [
                {
                  slug: "main",
                  label: "Main",
                  description: "Use dragon hunter lance.",
                  lowProfit: 3200000,
                  clickIntensity: 850,
                  marketImpactSlow: 0.05,
                  marketImpactInstant: 48,
                  tags: [
                    {
                      label: "Safe",
                      description:
                        "This method has stayed above break-even over the last 24 hours.",
                    },
                    {
                      label: "High investment required",
                      description:
                        "This method requires a high upfront investment.",
                    },
                  ],
                  requirements: {},
                  inputs: [],
                  outputs: [],
                },
              ],
            },
          },
        })
      )
    );

    renderMethodDetail("/moneyMakingMethod/vorkath-farming");

    expect(
      await screen.findByRole("heading", { name: "Vorkath farming" })
    ).toBeInTheDocument();
    expect(screen.getByText("Consistent dragon loot.")).toBeInTheDocument();
    expect(screen.queryByText("1 variant")).not.toBeInTheDocument();
    expect(screen.getByText("Patient")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
    expect(screen.getByText("Instant")).toBeInTheDocument();
    expect(screen.getByText("4800%")).toBeInTheDocument();
    expect(screen.getByText("great")).toBeInTheDocument();
    expect(screen.getByText("not viable")).toBeInTheDocument();
    expect(screen.getByText("3.2m")).toBeInTheDocument();
    expect(screen.getByText(/850 clicks\/hr/i)).toBeInTheDocument();
    expect(screen.getByText("Safe")).toBeInTheDocument();
    expect(screen.getByText("High investment required")).toBeInTheDocument();
    expect(screen.queryByText("It's better to")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.hover(screen.getByText("Safe"));
    const tagTooltips = await screen.findAllByRole("tooltip");
    const tagTooltip = tagTooltips[tagTooltips.length - 1];
    expect(
      within(tagTooltip).getByText(
        /stayed above break-even over the last 24 hours/i,
      ),
    ).toBeInTheDocument();

    await user.unhover(screen.getByText("Safe"));

    const lowProfitExplanationButton = screen.getByRole("button", {
      name: /low profit explanation/i,
    });
    await user.hover(lowProfitExplanationButton);
    const lowProfitTooltips = await screen.findAllByRole("tooltip");
    const lowProfitTooltip = lowProfitTooltips[lowProfitTooltips.length - 1];
    expect(
      within(lowProfitTooltip).getByText(
        /the profit expected if the player insta-buys the inputs and insta-sells the outputs/i,
      ),
    ).toBeInTheDocument();

    await user.unhover(lowProfitExplanationButton);

    const clickIntensityExplanationButton = screen.getByRole("button", {
      name: /click intensity explanation/i,
    });
    await user.hover(clickIntensityExplanationButton);
    const clickIntensityTooltips = await screen.findAllByRole("tooltip");
    const clickIntensityTooltip =
      clickIntensityTooltips[clickIntensityTooltips.length - 1];
    expect(
      within(clickIntensityTooltip).getByText(
        /the number of clicks required for 1 hour of this method/i,
      ),
    ).toBeInTheDocument();

    await user.unhover(clickIntensityExplanationButton);

    const patientExplanationButton = screen.getByRole("button", {
      name: /market impact explanation for patient/i,
    });
    await user.hover(patientExplanationButton);
    const patientTooltips = await screen.findAllByRole("tooltip");
    const patientTooltip = patientTooltips[patientTooltips.length - 1];
    expect(
      within(patientTooltip).getByText(
        /easy to buy\/sell the items involved in this method/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(patientTooltip).getByText(/approximately 3 minutes/i),
    ).toBeInTheDocument();
    expect(
      within(patientTooltip).getByRole("link", { name: /wiki/i }),
    ).toHaveAttribute("href", "/wiki");

    await user.unhover(patientExplanationButton);

    const instantExplanationButton = screen.getByRole("button", {
      name: /market impact explanation for instant/i,
    });
    await user.hover(instantExplanationButton);
    const instantTooltips = await screen.findAllByRole("tooltip");
    const instantTooltip = instantTooltips[instantTooltips.length - 1];
    expect(
      within(instantTooltip).getByText(
        /hard to buy\/sell the items involved in this method/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(instantTooltip).getByText(/approximately 2 days/i),
    ).toBeInTheDocument();
    expect(
      within(instantTooltip).getByRole("link", { name: /wiki/i }),
    ).toHaveAttribute("href", "/wiki");
  }, 10000);

  it("shows the hourly explanation for good market impact", async () => {
    server.use(
      http.get("*/methods/slug/:slug", ({ params }) =>
        HttpResponse.json({
          data: {
            method: {
              id: "method-1",
              slug: params.slug,
              name: "Vorkath farming",
              category: "combat",
              description: "Consistent dragon loot.",
              created_by: {
                id: "creator-1",
                username: "carmi",
              },
              created_at: "2026-08-19T13:45:00.000Z",
              updated_at: "2026-08-19T18:30:00.000Z",
              likes: 7,
              likedByMe: false,
              variants: [
                {
                  slug: "main",
                  label: "Main",
                  description: "Use dragon hunter lance.",
                  marketImpactSlow: 3,
                  requirements: {},
                  inputs: [],
                  outputs: [],
                },
              ],
            },
          },
        })
      )
    );

    renderMethodDetail("/moneyMakingMethod/vorkath-farming");

    const user = userEvent.setup();
    const explanationButton = await screen.findByRole("button", {
      name: /market impact explanation for patient/i,
    });
    await user.hover(explanationButton);

    const tooltips = await screen.findAllByRole("tooltip");
    const tooltip = tooltips[tooltips.length - 1];

    expect(
      within(tooltip).getByText(
        /quite hard to buy\/sell the items involved in this method/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(tooltip).getByText(/approximately 3 hours/i),
    ).toBeInTheDocument();
    expect(
      within(tooltip).getByRole("link", { name: /wiki/i }),
    ).toHaveAttribute("href", "/wiki");
  });

  it("shows the creator avatar image when the authenticated creator has one", async () => {
    const authProviderModule = await import("@/auth/AuthProvider");
    authProviderModule.__setAuthMockState({
      session: {
        user: {
          id: "creator-1",
          email: "creator@example.com",
          user_metadata: {
            avatar_url: "https://example.com/avatar.png",
          },
        },
      },
      user: {
        id: "creator-1",
        email: "creator@example.com",
      },
    });

    server.use(
      http.get("*/users/me", () =>
        HttpResponse.json({
          data: {
            id: "creator-1",
            email: "creator@example.com",
            username: "carmi",
            role: "user",
          },
        }),
      ),
      http.get("*/methods/slug/:slug", ({ params }) =>
        HttpResponse.json({
          data: {
            method: {
              id: "method-1",
              slug: params.slug,
              name: "Vorkath farming",
              category: "combat",
              description: "Consistent dragon loot.",
              created_by: {
                id: "creator-1",
                username: "carmi",
              },
              created_at: "2026-08-19T13:45:00.000Z",
              updated_at: "2026-08-19T18:30:00.000Z",
              variants: [
                {
                  slug: "main",
                  label: "Main",
                  description: "Use dragon hunter lance.",
                  requirements: {},
                  inputs: [],
                  outputs: [],
                },
              ],
            },
          },
        }),
      ),
    );

    renderMethodDetail("/moneyMakingMethod/vorkath-farming");

    expect(await screen.findByLabelText("carmi avatar")).toBeInTheDocument();
    expect(screen.getByText("Created by")).toBeInTheDocument();
    expect(screen.getByText("carmi")).toBeInTheDocument();
    expect(
      screen.getByText(
        methodAuditDateFormatter.format(new Date("2026-08-19T13:45:00.000Z")),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        methodAuditDateFormatter.format(new Date("2026-08-19T18:30:00.000Z")),
      ),
    ).toBeInTheDocument();
  });

  it("shows an error state when detail request fails", async () => {
    server.use(
      http.get("*/methods/slug/:slug", () =>
        HttpResponse.json({ message: "boom" }, { status: 500 })
      )
    );

    renderMethodDetail("/moneyMakingMethod/failing-method");

    expect(await screen.findByText(/HTTP 500/i)).toBeInTheDocument();
  });

  it("toggles advanced item tooltip details globally across all items", async () => {
    const nowUnixSeconds = Math.floor(Date.now() / 1000);
    const highTimeUnix = nowUnixSeconds - (2 * 60 * 60 + 16 * 60);
    const lowTimeUnix = nowUnixSeconds - (1 * 60 * 60 + 6 * 60);

    server.use(
      http.get("*/methods/slug/:slug", ({ params }) =>
        HttpResponse.json({
          data: {
            method: {
              id: "method-1",
              slug: params.slug,
              name: "Vorkath farming",
              category: "combat",
              description: "Consistent dragon loot.",
              created_by: {
                id: "creator-1",
                username: "carmi",
              },
              created_at: "2026-08-19T13:45:00.000Z",
              updated_at: "2026-08-19T18:30:00.000Z",
              likes: 7,
              likedByMe: false,
              variants: [
                {
                  slug: "main",
                  label: "Main",
                  description: "Use dragon hunter lance.",
                  requirements: {},
                  inputs: [
                    { id: 536, quantity: 2, reason: "Core input" },
                    { id: 385, quantity: 1, reason: "Secondary input" },
                  ],
                  outputs: [],
                },
              ],
            },
          },
        })
      ),
      http.get("*/items", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("fields")).toBe(
          "name,iconUrl,highPrice,lowPrice,high24h,low24h,highTime,lowTime"
        );

        return HttpResponse.json({
          data: {
            536: {
              name: "Dragon bones",
              iconUrl: "https://oldschool.runescape.wiki/images/Dragon_bones.png",
              highPrice: 3000,
              lowPrice: 2800,
              high24h: 123456,
              low24h: 654321,
              highTime: highTimeUnix,
              lowTime: lowTimeUnix,
            },
            385: {
              name: "Shark",
              iconUrl: "https://oldschool.runescape.wiki/images/Shark.png",
              highPrice: 900,
              lowPrice: 850,
              high24h: 3000,
              low24h: 4500,
              highTime: highTimeUnix,
              lowTime: lowTimeUnix,
            },
          },
        });
      }),
    );

    renderMethodDetail("/moneyMakingMethod/vorkath-farming");

    const user = userEvent.setup();
    const firstItemIcon = await screen.findByAltText("Dragon bones");
    await user.hover(firstItemIcon);

    const tooltips = await screen.findAllByRole("tooltip");
    const firstTooltip = tooltips[tooltips.length - 1];

    expect(within(firstTooltip).getByText("Core input")).toBeInTheDocument();
    expect(
      within(firstTooltip).getByRole("button", { name: /show item details/i })
    ).toBeInTheDocument();
    expect(
      within(firstTooltip).queryByText(/Insta buy volume last 24h/i)
    ).not.toBeInTheDocument();

    await user.click(
      within(firstTooltip).getByRole("button", { name: /show item details/i })
    );

    expect(
      await within(firstTooltip).findByText("Daily buys: 123.46k")
    ).toBeInTheDocument();
    expect(
      within(firstTooltip).getByText("Daily sales: 654.32k")
    ).toBeInTheDocument();
    expect(within(firstTooltip).getByText("Last buy: 2h 16m ago")).toBeInTheDocument();
    expect(within(firstTooltip).getByText("Last sell: 1h 6m ago")).toBeInTheDocument();
    expect(
      within(firstTooltip).getByRole("button", { name: /hide item details/i })
    ).toBeInTheDocument();

    await user.unhover(firstItemIcon);

    const secondItemIcon = await screen.findByAltText("Shark");
    await user.hover(secondItemIcon);

    const secondTooltips = await screen.findAllByRole("tooltip");
    const secondTooltip = secondTooltips[secondTooltips.length - 1];

    expect(within(secondTooltip).getByText("Secondary input")).toBeInTheDocument();
    expect(
      within(secondTooltip).getByText("Daily buys: 3k")
    ).toBeInTheDocument();
    expect(
      within(secondTooltip).getByRole("button", { name: /hide item details/i })
    ).toBeInTheDocument();

    await user.click(
      within(secondTooltip).getByRole("button", { name: /hide item details/i })
    );

    expect(
      await within(secondTooltip).findByRole("button", {
        name: /show item details/i,
      })
    ).toBeInTheDocument();
    expect(
      within(secondTooltip).queryByText(/Daily buys/i)
    ).not.toBeInTheDocument();

    await user.unhover(secondItemIcon);
    await user.hover(firstItemIcon);

    const collapsedTooltips = await screen.findAllByRole("tooltip");
    const collapsedFirstTooltip = collapsedTooltips[collapsedTooltips.length - 1];

    expect(
      within(collapsedFirstTooltip).getByRole("button", {
        name: /show item details/i,
      })
    ).toBeInTheDocument();
    expect(
      within(collapsedFirstTooltip).queryByText(/Daily buys/i)
    ).not.toBeInTheDocument();
  });

  it("shows the view weights toggle only for io groups with more than one item", async () => {
    server.use(
      http.get("*/methods/slug/:slug", ({ params }) =>
        HttpResponse.json({
          data: {
            method: {
              id: "method-1",
              slug: params.slug,
              name: "Vorkath farming",
              category: "combat",
              description: "Consistent dragon loot.",
              created_by: {
                id: "creator-1",
                username: "carmi",
              },
              created_at: "2026-08-19T13:45:00.000Z",
              updated_at: "2026-08-19T18:30:00.000Z",
              likes: 7,
              likedByMe: false,
              variants: [
                {
                  slug: "main",
                  label: "Main",
                  description: "Use dragon hunter lance.",
                  requirements: {},
                  inputs: [
                    { id: 536, quantity: 2, reason: "Core input" },
                    { id: 385, quantity: 1, reason: "Secondary input" },
                  ],
                  outputs: [{ id: 995, quantity: 150000 }],
                },
              ],
            },
          },
        })
      ),
      http.get("*/items", () =>
        HttpResponse.json({
          data: {
            536: {
              name: "Dragon bones",
              iconUrl: "https://oldschool.runescape.wiki/images/Dragon_bones.png",
              highPrice: 3000,
              lowPrice: 2800,
            },
            385: {
              name: "Shark",
              iconUrl: "https://oldschool.runescape.wiki/images/Shark.png",
              highPrice: 900,
              lowPrice: 850,
            },
            995: {
              name: "Coins",
              iconUrl: "https://oldschool.runescape.wiki/images/Coins_10000.png",
              highPrice: 1,
              lowPrice: 1,
            },
          },
        })
      ),
    );

    renderMethodDetail("/moneyMakingMethod/vorkath-farming");

    await screen.findByRole("heading", { name: "Inputs" });

    expect(screen.getAllByText(/view weights/i)).toHaveLength(1);
  });

  it("hides the view weights toggle when inputs and outputs have one item each", async () => {
    server.use(
      http.get("*/methods/slug/:slug", ({ params }) =>
        HttpResponse.json({
          data: {
            method: {
              id: "method-1",
              slug: params.slug,
              name: "Vorkath farming",
              category: "combat",
              description: "Consistent dragon loot.",
              created_by: {
                id: "creator-1",
                username: "carmi",
              },
              created_at: "2026-08-19T13:45:00.000Z",
              updated_at: "2026-08-19T18:30:00.000Z",
              likes: 7,
              likedByMe: false,
              variants: [
                {
                  slug: "main",
                  label: "Main",
                  description: "Use dragon hunter lance.",
                  requirements: {},
                  inputs: [{ id: 536, quantity: 2, reason: "Core input" }],
                  outputs: [{ id: 995, quantity: 150000 }],
                },
              ],
            },
          },
        })
      ),
      http.get("*/items", () =>
        HttpResponse.json({
          data: {
            536: {
              name: "Dragon bones",
              iconUrl: "https://oldschool.runescape.wiki/images/Dragon_bones.png",
              highPrice: 3000,
              lowPrice: 2800,
            },
            995: {
              name: "Coins",
              iconUrl: "https://oldschool.runescape.wiki/images/Coins_10000.png",
              highPrice: 1,
              lowPrice: 1,
            },
          },
        })
      ),
    );

    renderMethodDetail("/moneyMakingMethod/vorkath-farming");

    await screen.findByRole("heading", { name: "Inputs" });

    expect(screen.queryByText(/view weights/i)).not.toBeInTheDocument();
  });
});
