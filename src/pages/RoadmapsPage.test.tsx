import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../tests/msw/server";
import { renderWithProviders } from "../../tests/utils/render";
import { RoadmapsPage } from "./RoadmapsPage";

const ROADMAP_INTERACTION_TEST_TIMEOUT_MS = 10000;

describe("RoadmapsPage", () => {
  it(
    "passes the default ignored tags when generating a roadmap",
    async () => {
    let capturedIgnoredTags: string[] = [];

    server.use(
      http.post("*/methods/skills/roadmap", ({ request }) => {
        const url = new URL(request.url);
        capturedIgnoredTags = url.searchParams.getAll("ignoredTags");

        return HttpResponse.json({
          data: {
            roadmap: {
              skill: "crafting",
              strategy: "fastest",
              currentLevel: 22,
              currentExperience: 5735,
              targetLevel: 99,
              targetExperience: 13034431,
              totalHours: 1,
              averageAfkPercent: 78,
              totalProfit: {
                low: -1000,
                high: 0,
              },
              ranges: [],
            },
            user: {
              levels: {
                Crafting: 22,
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
            ignoredTags: ["ge_limits", "not_viable"],
            computedAt: 1785780480,
            usesExactSkillExperience: true,
          },
        });
      }),
    );

    renderWithProviders(<RoadmapsPage />, { route: "/roadmaps" });
    const user = userEvent.setup();

    expect((await screen.findAllByText("GE limits")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not viable").length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText("OSRS username"), "carmixtank");
    await user.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() =>
      expect(capturedIgnoredTags).toEqual(["ge_limits", "not_viable"]),
    );
    },
    ROADMAP_INTERACTION_TEST_TIMEOUT_MS,
  );

  it("renders the timeline layout with variant icons and xp left", async () => {
    server.use(
      http.post("*/methods/skills/roadmap", () =>
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
              totalInputs: [
                { id: 2138, quantity: 575096215 },
                { id: 2141, quantity: 1200 },
              ],
              totalOutputs: [{ id: 2140, quantity: 575096215 }],
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
    expect(
      screen.getByRole("heading", { name: "Inputs & outputs" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Requirements" }),
    ).toBeInTheDocument();
    expect(screen.getByText("View weights")).toBeInTheDocument();
    expect(screen.queryByText("% AFK")).not.toBeInTheDocument();
    expect(screen.queryByText("XP needed")).not.toBeInTheDocument();
  });

  it("commits target level on blur and keeps it above the current skill level", async () => {
    server.use(
      http.post("*/methods/skills/roadmap", () =>
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
    await screen.findByText("13.03m xp needed to reach level 99.");

    const targetLevelInput = screen.getByLabelText("Target level");
    await user.clear(targetLevelInput);
    expect(targetLevelInput).toHaveValue("");

    await user.type(targetLevelInput, "10");
    expect(targetLevelInput).toHaveValue("10");

    targetLevelInput.blur();
    await waitFor(() => expect(targetLevelInput).toHaveValue("23"));
  });

  it("shows roadmap material warnings when totals are unavailable", async () => {
    server.use(
      http.post("*/methods/skills/roadmap", () =>
        HttpResponse.json({
          data: {
            roadmap: {
              skill: "herblore",
              strategy: "profitable",
              currentLevel: 3,
              currentExperience: 174,
              targetLevel: 99,
              targetExperience: 13034431,
              totalHours: 123.45,
              averageAfkPercent: 65,
              totalProfit: {
                low: -5000,
                high: -2000,
              },
              totalInputs: null,
              totalOutputs: null,
              ranges: [
                {
                  levelStart: 3,
                  levelEnd: 11,
                  experienceStart: 174,
                  experienceEnd: 1358,
                  experienceNeeded: 1184,
                  hours: 1.2,
                  afkPercent: 65,
                  profit: {
                    low: -500,
                    high: -200,
                  },
                  method: {
                    id: "method-2",
                    name: "Guam potion",
                    slug: "guam-potion",
                    icon_id: 249,
                    category: "skilling",
                    enabled: true,
                  },
                  variant: {
                    id: "variant-2",
                    slug: "main",
                    icon_id: 91,
                    label: "Main",
                    description: "Mix guam potions.",
                    xpPerHour: 20000,
                    clickIntensity: 500,
                    afkiness: 65,
                    riskLevel: null,
                    requirements: {},
                    wilderness: false,
                    members: false,
                    lowProfit: -500,
                    highProfit: -200,
                    tags: [],
                  },
                },
              ],
            },
            user: {
              levels: {
                Herblore: 3,
              },
              quests: {},
              achievement_diaries: {},
            },
          },
          warnings: [
            "Roadmap material totals are unavailable because actionsPerHour is missing for guam leaf (levels 3-11).",
          ],
          meta: {
            username: "carmixtank",
            skill: "herblore",
            strategy: "profitable",
            enabled: true,
            show_only_free_to_play: false,
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
      await screen.findByText("Material totals unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Roadmap material totals are unavailable because actionsPerHour is missing for guam leaf (levels 3-11).",
      ),
    ).toBeInTheDocument();
  });

  it("deduplicates roadmap requirements across steps", async () => {
    server.use(
      http.post("*/methods/skills/roadmap", () =>
        HttpResponse.json({
          data: {
            roadmap: {
              skill: "herblore",
              strategy: "profitable",
              currentLevel: 3,
              currentExperience: 174,
              targetLevel: 30,
              targetExperience: 13363,
              totalHours: 8,
              averageAfkPercent: 70,
              totalProfit: {
                low: 1000,
                high: 2000,
              },
              totalInputs: [{ id: 249, quantity: 50 }],
              totalOutputs: [{ id: 121, quantity: 50 }],
              ranges: [
                {
                  levelStart: 3,
                  levelEnd: 11,
                  experienceStart: 174,
                  experienceEnd: 1358,
                  experienceNeeded: 1184,
                  hours: 1,
                  afkPercent: 70,
                  profit: {
                    low: 100,
                    high: 200,
                  },
                  method: {
                    id: "method-3",
                    name: "Method one",
                    slug: "method-one",
                    icon_id: 249,
                    category: "skilling",
                    enabled: true,
                  },
                  variant: {
                    id: "variant-3",
                    slug: "step-one",
                    icon_id: 91,
                    label: "Step one",
                    description: "First step",
                    xpPerHour: 10000,
                    clickIntensity: 100,
                    afkiness: 70,
                    riskLevel: null,
                    requirements: {
                      levels: [
                        { level: 10, skill: "Herblore", reason: "Base level" },
                      ],
                      quests: [
                        {
                          name: "Druidic Ritual",
                          stage: 1,
                          reason: "Start the quest.",
                        },
                      ],
                      achievement_diaries: [
                        {
                          name: "Varrock",
                          tier: "Medium",
                          reason: "Helpful early diary.",
                        },
                      ],
                    },
                    wilderness: false,
                    members: true,
                    lowProfit: 100,
                    highProfit: 200,
                    tags: [],
                  },
                },
                {
                  levelStart: 11,
                  levelEnd: 30,
                  experienceStart: 1358,
                  experienceEnd: 13363,
                  experienceNeeded: 12005,
                  hours: 7,
                  afkPercent: 70,
                  profit: {
                    low: 900,
                    high: 1800,
                  },
                  method: {
                    id: "method-4",
                    name: "Method two",
                    slug: "method-two",
                    icon_id: 251,
                    category: "skilling",
                    enabled: true,
                  },
                  variant: {
                    id: "variant-4",
                    slug: "step-two",
                    icon_id: 93,
                    label: "Step two",
                    description: "Second step",
                    xpPerHour: 20000,
                    clickIntensity: 150,
                    afkiness: 70,
                    riskLevel: null,
                    requirements: {
                      levels: [
                        { level: 20, skill: "Herblore", reason: "Higher level" },
                      ],
                      quests: [
                        {
                          name: "Druidic Ritual",
                          stage: 2,
                          reason: "Complete the quest.",
                        },
                      ],
                      achievement_diaries: [
                        {
                          name: "Varrock",
                          tier: "Hard",
                          reason: "Later diary.",
                        },
                      ],
                    },
                    wilderness: false,
                    members: true,
                    lowProfit: 900,
                    highProfit: 1800,
                    tags: [],
                  },
                },
              ],
            },
            user: {
              levels: {
                Herblore: 3,
              },
              quests: {},
              achievement_diaries: {},
            },
          },
          meta: {
            username: "carmixtank",
            skill: "herblore",
            strategy: "profitable",
            enabled: true,
            show_only_free_to_play: false,
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

    expect(await screen.findByText("Druidic Ritual")).toBeInTheDocument();
    expect(screen.getAllByText("Druidic Ritual")).toHaveLength(1);
    expect(screen.queryByText("Druidic Ritual (started)")).not.toBeInTheDocument();
    expect(screen.getByText("Varrock Hard")).toBeInTheDocument();
    expect(screen.queryByText("Varrock Medium")).not.toBeInTheDocument();
  });
});
