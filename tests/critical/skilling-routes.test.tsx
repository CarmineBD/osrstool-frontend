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

describe("critical flow: skilling routes", () => {
  it("renders skills cards with best metric tags and tooltip details", async () => {
    server.use(
      http.get("*/methods/skills/summary", () =>
        HttpResponse.json({
          data: {
            magic: {
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
    expect(screen.getByRole("link", { name: "Magic" })).toHaveAttribute(
      "href",
      "/skilling/magic"
    );
    expect(screen.queryByRole("link", { name: "Bursting monkeys" })).not.toBeInTheDocument();

    const profitTag = await screen.findByRole("button", { name: /GP\/hr: 1\.5m/i });
    const xpTag = screen.getByRole("button", { name: /XP\/hr: 120k/i });
    const afkTag = screen.getByRole("button", { name: /AFKiness: 95%/i });
    expect(profitTag).not.toHaveAttribute("title");
    expect(xpTag).not.toHaveAttribute("title");
    expect(afkTag).not.toHaveAttribute("title");

    await user.hover(profitTag);
    {
      const tooltips = await screen.findAllByRole("tooltip");
      const tooltip = tooltips[tooltips.length - 1];
      expect(within(tooltip).getByText("Bursting monkeys")).toBeInTheDocument();
      expect(within(tooltip).getByText("XP/hr: 80k")).toBeInTheDocument();
      expect(within(tooltip).getByText("AFKiness: 15%")).toBeInTheDocument();
    }
    await user.unhover(profitTag);

    await user.hover(xpTag);
    await waitFor(() => {
      expect(profitTag.className).toContain("opacity-45");
      expect(afkTag.className).toContain("opacity-45");
      expect(xpTag.className).not.toContain("opacity-45");
    });
    {
      const tooltips = await screen.findAllByRole("tooltip");
      const tooltip = tooltips[tooltips.length - 1];
      expect(within(tooltip).getByText("Bursting temple")).toBeInTheDocument();
      expect(within(tooltip).getByText("GP/hr: 500k")).toBeInTheDocument();
      expect(within(tooltip).getByText("AFKiness: 10%")).toBeInTheDocument();
    }
    await user.unhover(xpTag);

    await user.hover(afkTag);
    {
      const tooltips = await screen.findAllByRole("tooltip");
      const tooltip = tooltips[tooltips.length - 1];
      expect(within(tooltip).getByText("Splashing")).toBeInTheDocument();
      expect(within(tooltip).getByText("GP/hr: 0")).toBeInTheDocument();
      expect(within(tooltip).getByText("XP/hr: 10k")).toBeInTheDocument();
    }
    await user.unhover(afkTag);
  });

  it("does not dim tags that share the same method", async () => {
    server.use(
      http.get("*/methods/skills/summary", () =>
        HttpResponse.json({
          data: {
            magic: {
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

    const profitTag = await screen.findByRole("button", { name: /GP\/hr: 1\.5m/i });
    const xpTag = screen.getByRole("button", { name: /XP\/hr: 80k/i });
    const afkTag = screen.getByRole("button", { name: /AFKiness: 95%/i });

    await user.hover(profitTag);
    await waitFor(() => {
      expect(xpTag.className).not.toContain("opacity-45");
      expect(afkTag.className).toContain("opacity-45");
    });
    await user.unhover(profitTag);
  });

  it("locks skill filters when browsing a specific skill page", async () => {
    const seenSkills: string[] = [];
    const seenVariants: string[] = [];
    const seenSortBy: string[] = [];

    server.use(
      http.get("*/methods", ({ request }) => {
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
    expect(screen.getByText("Skill locked: Magic")).toBeInTheDocument();
    const tableHeaders = await screen.findAllByRole("columnheader");
    expect(tableHeaders[0]).toHaveTextContent(/requirements/i);
    expect(
      screen.getByRole("link", { name: "Main" })
    ).toHaveAttribute("href", "/moneyMakingMethod/bursting-monkeys/main");

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
  });

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
      http.get("*/methods/skills/summary", ({ request }) => {
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
    expect(await screen.findByText("enabled")).toBeInTheDocument();
    await waitFor(() => {
      expect(seenEnabledValues).toContain("false");
    });

    await user.click(screen.getByRole("switch"));

    await waitFor(() => {
      expect(seenEnabledValues).toContain("true");
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
      http.get("*/methods", () =>
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
    expect(await screen.findByText("enabled")).toBeInTheDocument();
  });
});
