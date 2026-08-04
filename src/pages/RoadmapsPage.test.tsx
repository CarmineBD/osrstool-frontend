import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../tests/msw/server";
import { renderWithProviders } from "../../tests/utils/render";
import { RoadmapsPage } from "./RoadmapsPage";

describe("RoadmapsPage", () => {
  it("renders the timeline layout with variant icons and xp left", async () => {
    server.use(
      http.get("*/methods/skills/roadmap", () =>
        HttpResponse.json({
          data: {
            roadmap: {
              skill: "crafting",
              strategy: "fastest",
              currentLevel: 22,
              currentExperience: 5735,
              targetLevel: 99,
              targetExperience: 13034431,
              totalHours: 51.647622105150816,
              averageAfkPercent: 78,
              totalProfit: {
                low: -100103942.40984952,
                high: -91752595.56981304,
              },
              ranges: [
                {
                  levelStart: 22,
                  levelEnd: 27,
                  experienceStart: 5735,
                  experienceEnd: 9730,
                  experienceNeeded: 3995,
                  hours: 0.034,
                  afkPercent: 78,
                  profit: {
                    low: -799.0000000000001,
                    high: 0,
                  },
                  method: {
                    id: "method-1",
                    name: "Cutting gems",
                    slug: "cutting-gems",
                    icon_id: 1755,
                    category: "skilling",
                    enabled: true,
                  },
                  variant: {
                    id: "variant-1",
                    slug: "sapphires",
                    icon_id: 1607,
                    label: "Sapphires",
                    description: "Cut sapphires.",
                    xpPerHour: 117500,
                    clickIntensity: 609,
                    afkiness: 78,
                    riskLevel: null,
                    requirements: {
                      items: [{ id: 1755, reason: "Required", quantity: 1 }],
                      levels: [
                        {
                          level: 20,
                          skill: "Crafting",
                          reason: "To cut sapphires.",
                        },
                      ],
                    },
                    wilderness: false,
                    members: false,
                    lowProfit: -23500,
                    highProfit: 0,
                    tags: [],
                  },
                },
              ],
            },
            user: {
              levels: {
                Crafting: 22,
                Herblore: 22,
              },
              quests: {},
              achievement_diaries: {},
            },
          },
          meta: {
            username: "carmixtank",
            skill: "crafting",
            strategy: "fastest",
            enabled: true,
            show_only_free_to_play: true,
            ignoredTags: ["not_viable"],
            computedAt: 1785780480,
            usesExactSkillExperience: true,
          },
        }),
      ),
    );

    renderWithProviders(<RoadmapsPage />, { route: "/roadmaps" });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("OSRS username"), "carmixtank");
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(
      await screen.findByRole("heading", { name: "Roadmap overview" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("13.03m xp needed to reach level 99."),
    ).toBeInTheDocument();
    expect(screen.getByText("(4k xp)")).toBeInTheDocument();
    expect(await screen.findByText("Sapphires")).toBeInTheDocument();
    expect(screen.getByAltText("Sapphires icon")).toHaveAttribute(
      "src",
      "https://example.com/items/1607.png",
    );
    expect(screen.getByRole("link", { name: "Cutting gems" })).toHaveAttribute(
      "href",
      "/moneyMakingMethod/cutting-gems/sapphires",
    );
    expect(
      screen.queryByText(/The page calls the backend roadmap endpoint/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Null AFK values are treated as 100%/i),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Time spent").length).toBeGreaterThan(0);
    expect(screen.getByText("Average % AFK")).toBeInTheDocument();
    expect(screen.queryByText("% AFK")).not.toBeInTheDocument();
    expect(screen.queryByText("XP needed")).not.toBeInTheDocument();
  });

  it("commits target level on blur and keeps it above the current skill level", async () => {
    server.use(
      http.get("*/methods/skills/roadmap", () =>
        HttpResponse.json({
          data: {
            roadmap: {
              skill: "crafting",
              strategy: "fastest",
              currentLevel: 22,
              currentExperience: 5735,
              targetLevel: 99,
              targetExperience: 13034431,
              totalHours: 51.647622105150816,
              averageAfkPercent: 78,
              totalProfit: {
                low: -100103942.40984952,
                high: -91752595.56981304,
              },
              ranges: [
                {
                  levelStart: 22,
                  levelEnd: 27,
                  experienceStart: 5735,
                  experienceEnd: 9730,
                  experienceNeeded: 3995,
                  hours: 0.034,
                  afkPercent: 78,
                  profit: {
                    low: -799.0000000000001,
                    high: 0,
                  },
                  method: {
                    id: "method-1",
                    name: "Cutting gems",
                    slug: "cutting-gems",
                    icon_id: 1755,
                    category: "skilling",
                    enabled: true,
                  },
                  variant: {
                    id: "variant-1",
                    slug: "sapphires",
                    icon_id: 1607,
                    label: "Sapphires",
                    description: "Cut sapphires.",
                    xpPerHour: 117500,
                    clickIntensity: 609,
                    afkiness: 78,
                    riskLevel: null,
                    requirements: {
                      items: [{ id: 1755, reason: "Required", quantity: 1 }],
                      levels: [
                        {
                          level: 20,
                          skill: "Crafting",
                          reason: "To cut sapphires.",
                        },
                      ],
                    },
                    wilderness: false,
                    members: false,
                    lowProfit: -23500,
                    highProfit: 0,
                    tags: [],
                  },
                },
              ],
            },
            user: {
              levels: {
                Crafting: 22,
                Herblore: 22,
              },
              quests: {},
              achievement_diaries: {},
            },
          },
          meta: {
            username: "carmixtank",
            skill: "crafting",
            strategy: "fastest",
            enabled: true,
            show_only_free_to_play: true,
            ignoredTags: ["not_viable"],
            computedAt: 1785780480,
            usesExactSkillExperience: true,
          },
        }),
      ),
    );

    renderWithProviders(<RoadmapsPage />, { route: "/roadmaps" });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("OSRS username"), "carmixtank");
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await screen.findByRole("heading", { name: "Roadmap overview" });

    const targetLevelInput = screen.getByLabelText("Target level");
    await user.clear(targetLevelInput);
    expect(targetLevelInput).toHaveValue("");

    await user.type(targetLevelInput, "10");
    expect(targetLevelInput).toHaveValue("10");

    targetLevelInput.blur();
    await waitFor(() => expect(targetLevelInput).toHaveValue("23"));
  });
});
