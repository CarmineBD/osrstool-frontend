import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import App from "@/App";
import { server } from "../msw/server";
import { createTestQueryClient } from "../utils/render";

function renderApp() {
  const queryClient = createTestQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

const SLOW_INTERACTION_TEST_TIMEOUT_MS = 20000;

describe("critical flow: skilling routes", () => {
  it("renders skills by category with expandable best-method metrics", async () => {
    server.use(
      http.post("*/methods/skills/summary", () =>
        HttpResponse.json({
          data: {
            attack: {
              officialVariantCount: 0,
            },
            magic: {
              officialVariantCount: 3,
              bestProfit: {
                id: "method-1",
                slug: "bursting-monkeys",
                name: "Bursting monkeys",
                variantCount: 1,
                likes: 0,
                likedByMe: false,
                variants: [
                  {
                    id: "variant-1",
                    label: "Main",
                    highProfit: 1500000,
                    lowProfit: 1200000,
                    afkiness: 15,
                    xpHour: [{ skill: "Magic", experience: 80000 }],
                    requirements: {},
                    inputs: [],
                    outputs: [],
                  },
                ],
              },
              bestXp: {
                id: "method-2",
                slug: "bursting-temple",
                name: "Bursting temple",
                variantCount: 1,
                likes: 0,
                likedByMe: false,
                variants: [
                  {
                    id: "variant-2",
                    label: "Main",
                    highProfit: 500000,
                    lowProfit: 200000,
                    afkiness: 10,
                    xpHour: [{ skill: "Magic", experience: 120000 }],
                    requirements: {},
                    inputs: [],
                    outputs: [],
                  },
                ],
              },
              bestAfk: {
                id: "method-3",
                slug: "splashing",
                name: "Splashing",
                variantCount: 1,
                likes: 0,
                likedByMe: false,
                variants: [
                  {
                    id: "variant-3",
                    label: "Main",
                    highProfit: 0,
                    lowProfit: 0,
                    afkiness: 95,
                    xpHour: [{ skill: "Magic", experience: 10000 }],
                    requirements: {},
                    inputs: [],
                    outputs: [],
                  },
                ],
              },
            },
          },
          meta: {
            computedAt: 1771459200,
          },
        })
      )
    );

    window.history.pushState({}, "", "/skilling");
    renderApp();
    const user = userEvent.setup();

    expect(await screen.findByRole("heading", { name: "Skilling" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Combat skills" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gathering skills" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Magic" })).toHaveAttribute(
      "href",
      "/skilling/magic"
    );
    expect(screen.queryByRole("link", { name: "Bursting monkeys" })).not.toBeInTheDocument();
    await waitFor(() => {
      const attackCard = screen.getByText("Attack").closest("article");
      expect(attackCard).not.toBeNull();
      expect(
        within(attackCard as HTMLElement).getByText("No variants added yet."),
      ).toBeInTheDocument();
      expect(
        within(attackCard as HTMLElement).queryByRole("link", {
          name: "Attack",
        }),
      ).not.toBeInTheDocument();
    });

    const magicCard = screen.getByRole("link", { name: "Magic" }).closest("article");
    expect(magicCard).not.toBeNull();
    expect(
      within(magicCard as HTMLElement).getByText("3 variants"),
    ).toBeInTheDocument();
    expect(
      within(magicCard as HTMLElement).getByRole("link", {
        name: "See all variants",
      }),
    ).toHaveAttribute("href", "/skilling/magic");
    await user.hover(magicCard as HTMLElement);

    const profitMetric = await screen.findByRole("link", {
      name: /Best for Profit: 1\.5m GP\/hr\. Method: Bursting monkeys/i,
    });
    const xpMetric = screen.getByRole("link", {
      name: /Best for XP: 120k XP\/hr\. Method: Bursting temple/i,
    });
    const afkMetric = screen.getByRole("link", {
      name: /Most AFK: 95% AFK\. Method: Splashing/i,
    });
    expect(profitMetric).toHaveAttribute("href", "/moneyMakingMethod/bursting-monkeys");
    expect(xpMetric).toHaveAttribute("href", "/moneyMakingMethod/bursting-temple");
    expect(afkMetric).toHaveAttribute("href", "/moneyMakingMethod/splashing");

    await user.hover(profitMetric);
    {
      const tooltips = await screen.findAllByRole("tooltip");
      const tooltip = tooltips[tooltips.length - 1];
      expect(within(tooltip).getByText("Bursting monkeys")).toBeInTheDocument();
      expect(within(tooltip).getByText("Main")).toBeInTheDocument();
      expect(within(tooltip).queryByText("XP/hr: 80k")).not.toBeInTheDocument();
      expect(within(tooltip).queryByText("AFK: 15%")).not.toBeInTheDocument();
    }
  }, SLOW_INTERACTION_TEST_TIMEOUT_MS);

  it("shows every metric when the same method leads more than one category", async () => {
    server.use(
      http.post("*/methods/skills/summary", () =>
        HttpResponse.json({
          data: {
            magic: {
              officialVariantCount: 3,
              bestProfit: {
                id: "method-1",
                slug: "bursting-monkeys",
                name: "Bursting monkeys",
                variantCount: 1,
                likes: 0,
                likedByMe: false,
                variants: [
                  {
                    id: "variant-1",
                    label: "Main",
                    highProfit: 1500000,
                    lowProfit: 1200000,
                    afkiness: 15,
                    xpHour: [{ skill: "Magic", experience: 80000 }],
                    requirements: {},
                    inputs: [],
                    outputs: [],
                  },
                ],
              },
              bestXp: {
                id: "method-1",
                slug: "bursting-monkeys",
                name: "Bursting monkeys",
                variantCount: 1,
                likes: 0,
                likedByMe: false,
                variants: [
                  {
                    id: "variant-1",
                    label: "Main",
                    highProfit: 1500000,
                    lowProfit: 1200000,
                    afkiness: 15,
                    xpHour: [{ skill: "Magic", experience: 80000 }],
                    requirements: {},
                    inputs: [],
                    outputs: [],
                  },
                ],
              },
              bestAfk: {
                id: "method-3",
                slug: "splashing",
                name: "Splashing",
                variantCount: 1,
                likes: 0,
                likedByMe: false,
                variants: [
                  {
                    id: "variant-3",
                    label: "Main",
                    highProfit: 0,
                    lowProfit: 0,
                    afkiness: 95,
                    xpHour: [{ skill: "Magic", experience: 10000 }],
                    requirements: {},
                    inputs: [],
                    outputs: [],
                  },
                ],
              },
            },
          },
          meta: {
            computedAt: 1771459200,
          },
        })
      )
    );

    window.history.pushState({}, "", "/skilling");
    renderApp();
    const user = userEvent.setup();

    const magicCard = (await screen.findByRole("link", { name: "Magic" })).closest("article");
    expect(magicCard).not.toBeNull();
    await user.hover(magicCard as HTMLElement);
    expect(
      screen.getByRole("link", {
        name: /Best for Profit: 1\.5m GP\/hr\. Method: Bursting monkeys/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Best for XP: 80k XP\/hr\. Method: Bursting monkeys/i,
      }),
    ).toBeInTheDocument();
  });

  it("locks skill filters when browsing a specific skill page", async () => {
    const seenSkills: string[] = [];
    const seenVariants: string[] = [];
    const seenSortBy: string[] = [];

    server.use(
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
      http.post("*/methods/search", ({ request }) => {
        const url = new URL(request.url);
        seenSkills.push(url.searchParams.get("skill") ?? "");
        seenVariants.push(url.searchParams.get("variants") ?? "");
        seenSortBy.push(url.searchParams.get("sortBy") ?? "");

        return HttpResponse.json({
          data: {
            methods: [
              {
                id: "method-1",
                slug: "bursting-monkeys",
                name: "Bursting monkeys",
                category: "skilling",
                likes: 0,
                likedByMe: false,
                variants: [
                  {
                    id: "variant-1",
                    slug: "main",
                    label: "Main",
                    icon_id: 2001,
                    gpPerXpHigh: 4.2,
                    gpPerXpLow: 3.1,
                    xpHour: [
                      { skill: "Magic", experience: 120000 },
                      { skill: "Crafting", experience: 50000 },
                    ],
                    requirements: {
                      levels: [
                        { skill: "Magic", level: 55 },
                        { skill: "Crafting", level: 70 },
                        { skill: "Smithing", level: 85 },
                      ],
                    },
                    inputs: [],
                    outputs: [],
                  },
                ],
              },
              {
                id: "method-2",
                slug: "runecrafting-alt",
                name: "Runecrafting alt",
                category: "skilling",
                likes: 0,
                likedByMe: false,
                variants: [
                  {
                    id: "variant-2",
                    slug: "alt",
                    label: "Alt",
                    icon_id: 2002,
                    gpPerXpHigh: 2.1,
                    gpPerXpLow: 1.4,
                    xpHour: [{ skill: "Magic", experience: 90000 }],
                    requirements: {
                      levels: [
                        { skill: "Crafting", level: 70 },
                        { skill: "Runecrafting", level: 5 },
                      ],
                    },
                    inputs: [],
                    outputs: [],
                  },
                ],
              },
            ],
            page: 1,
            perPage: 10,
            total: 2,
          },
        });
      })
    );

    window.history.pushState({}, "", "/skilling/magic");
    renderApp();
    const user = userEvent.setup();

    expect(
      await screen.findByRole("heading", { name: "Methods for Magic" })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /show filters/i }));
    expect(screen.getByText("Skill locked: Magic")).toBeInTheDocument();
    const tableHeaders = await screen.findAllByRole("columnheader");
    expect(tableHeaders[0]).toHaveTextContent(/requirements/i);
    expect(
      screen.getByRole("link", { name: "Main" })
    ).toHaveAttribute("href", "/moneyMakingMethod/bursting-monkeys/main");
    expect(await screen.findByAltText("Bursting monkeys icon")).toBeInTheDocument();

    const requirementsOverflowButton = screen.getByRole("button", {
      name: /and 2 more/i,
    });
    await user.hover(requirementsOverflowButton);
    {
      const tooltips = await screen.findAllByRole("tooltip");
      const tooltip = tooltips[tooltips.length - 1];
      expect(within(tooltip).getByText(/Crafting: 70/i)).toBeInTheDocument();
      expect(within(tooltip).getByText(/Smithing: 85/i)).toBeInTheDocument();
    }
    await user.unhover(requirementsOverflowButton);

    const runecraftingRow = screen
      .getByRole("link", { name: "Runecrafting alt" })
      .closest("tr");
    expect(runecraftingRow).not.toBeNull();
    expect(
      within(runecraftingRow as HTMLTableRowElement).getByAltText(
        "Runecrafting alt icon"
      )
    ).toBeInTheDocument();
    expect(
      within(runecraftingRow as HTMLTableRowElement).getByAltText("crafting_icon")
    ).toBeInTheDocument();

    const runecraftingRequirementsOverflow = within(
      runecraftingRow as HTMLTableRowElement
    ).getByRole("button", {
      name: /and 1 more/i,
    });
    await user.hover(runecraftingRequirementsOverflow);
    {
      const tooltips = await screen.findAllByRole("tooltip");
      const tooltip = tooltips[tooltips.length - 1];
      expect(within(tooltip).getByText(/Runecrafting: 5/i)).toBeInTheDocument();
    }
    await user.unhover(runecraftingRequirementsOverflow);

    const xpOverflowButton = screen.getByRole("button", {
      name: /and 1 more\.\.\./i,
    });
    await user.hover(xpOverflowButton);
    {
      const tooltips = await screen.findAllByRole("tooltip");
      const tooltip = tooltips[tooltips.length - 1];
      expect(within(tooltip).getByText(/Crafting:/i)).toBeInTheDocument();
    }
    await user.unhover(xpOverflowButton);

    await user.click(screen.getByRole("button", { name: /gp\/xp/i }));

    await waitFor(() => {
      expect(seenSkills).toContain("magic");
      expect(seenVariants).toContain("all");
      expect(seenSortBy).toContain("gpPerXpHigh");
    });
  }, SLOW_INTERACTION_TEST_TIMEOUT_MS);

  it("shows enabled switch for super admin and toggles enabled query param", async () => {
    const authProviderModule = await import("@/auth/AuthProvider");
    authProviderModule.__setAuthMockState({
      session: {
        access_token: "token-1",
      },
      user: {
        id: "user-1",
        email: "test@example.com",
      },
      isLoading: false,
    });

    const seenEnabledValues: string[] = [];

    server.use(
      http.get("*/users/me", () =>
        HttpResponse.json({
          data: {
            id: "user-1",
            email: "test@example.com",
            role: "super_admin",
          },
        })
      ),
      http.post("*/methods/skills/summary", ({ request }) => {
        const url = new URL(request.url);
        seenEnabledValues.push(url.searchParams.get("enabled") ?? "");

        return HttpResponse.json({
          data: {},
          meta: {
            computedAt: 1771459200,
          },
        });
      })
    );

    window.history.pushState({}, "", "/skilling");
    renderApp();

    const user = userEvent.setup();
    expect(await screen.findByText("Enabled only")).toBeInTheDocument();
    await waitFor(() => {
      expect(seenEnabledValues).toContain("true");
    });

    await user.click(
      screen.getByRole("switch", { name: /enabled methods filter/i }),
    );

    await waitFor(() => {
      expect(seenEnabledValues).toContain("false");
    });
  });

  it("shows enabled switch in /skilling/:skill only for super admin", async () => {
    const authProviderModule = await import("@/auth/AuthProvider");
    authProviderModule.__setAuthMockState({
      session: {
        access_token: "token-1",
      },
      user: {
        id: "user-1",
        email: "test@example.com",
      },
      isLoading: false,
    });

    server.use(
      http.get("*/users/me", () =>
        HttpResponse.json({
          data: {
            id: "user-1",
            email: "test@example.com",
            role: "super_admin",
          },
        })
      ),
      http.post("*/methods/search", () =>
        HttpResponse.json({
          data: {
            methods: [],
            page: 1,
            perPage: 10,
            total: 0,
          },
        })
      )
    );

    window.history.pushState({}, "", "/skilling/magic");
    renderApp();

    expect(
      await screen.findByRole("heading", { name: "Methods for Magic" })
    ).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /show filters/i }));
    expect(await screen.findByText("Enabled methods")).toBeInTheDocument();
  });
});
