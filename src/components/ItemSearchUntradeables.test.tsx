import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ItemIconField } from "@/components/ItemIconField";
import { IoItemsField } from "@/components/IoItemsField";
import { RequirementsRecommendationsField } from "@/components/RequirementsRecommendationsField";
import {
  fetchIconRecords,
  fetchItems,
  searchIcons,
  searchItems,
  type Variant,
} from "@/lib/api";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    fetchItems: vi.fn(),
    fetchIconRecords: vi.fn(),
    searchIcons: vi.fn(),
    searchItems: vi.fn(),
  };
});

const SLOW_INTERACTION_TEST_TIMEOUT_MS = 15000;

describe("item search untradeables toggle", () => {
  beforeEach(() => {
    vi.mocked(fetchItems).mockResolvedValue({});
    vi.mocked(searchItems).mockResolvedValue({
      items: [],
      page: 1,
      pageCount: 1,
    });
    vi.mocked(fetchIconRecords).mockResolvedValue({});
    vi.mocked(searchIcons).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to false and updates the inputs search request when enabled", async () => {
    const user = userEvent.setup();

    render(<IoItemsField label="Inputs" items={[]} onChange={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "Inputs search options" }),
    );

    const showUntradeablesSwitch = await screen.findByRole("switch", {
      name: "Show untradeables",
    });
    expect(showUntradeablesSwitch).toHaveAttribute("aria-checked", "false");

    await user.click(showUntradeablesSwitch);
    expect(showUntradeablesSwitch).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{Escape}");

    const searchInput = screen.getByPlaceholderText("Search for an item...");
    await user.type(searchInput, "coal");

    await waitFor(() => expect(searchItems).toHaveBeenCalled());
    expect(vi.mocked(searchItems).mock.calls.at(-1)?.[0]).toBe("coal");
    expect(vi.mocked(searchItems).mock.calls.at(-1)?.[4]).toEqual({
      showUntradeables: true,
    });
  });

  it("defaults to false and updates requirements item search when enabled", async () => {
    const user = userEvent.setup();

    render(
      <RequirementsRecommendationsField
        requirements={{}}
        recommendations={{}}
        skillOptions={[]}
        questOptions={[]}
        achievementDiaryOptions={[]}
        onChange={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Requirements search options" }),
    );

    const showUntradeablesSwitch = await screen.findByRole("switch", {
      name: "Show untradeables",
    });
    expect(showUntradeablesSwitch).toHaveAttribute("aria-checked", "false");

    await user.click(showUntradeablesSwitch);
    expect(showUntradeablesSwitch).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{Escape}");

    const searchInput = screen.getByPlaceholderText(
      "Search items, skills, quests, or achievement diaries",
    );
    await user.type(searchInput, "coal");

    await waitFor(() => expect(searchItems).toHaveBeenCalled());
    expect(vi.mocked(searchItems).mock.calls.at(-1)?.[0]).toBe("coal");
    expect(vi.mocked(searchItems).mock.calls.at(-1)?.[4]).toEqual({
      showUntradeables: true,
    });
  });

  it("hides empty requirement tables until entries are selected", () => {
    render(
      <RequirementsRecommendationsField
        requirements={{}}
        recommendations={{}}
        skillOptions={[]}
        questOptions={[]}
        achievementDiaryOptions={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Unified search")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "Search items, skills, quests, or achievement diaries",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Items")).not.toBeInTheDocument();
    expect(screen.queryByText("Quests")).not.toBeInTheDocument();
    expect(screen.queryByText("Achievement Diaries")).not.toBeInTheDocument();
    expect(screen.queryByText("Skills")).not.toBeInTheDocument();
  });

  it("uses the selected icon type and only enables untradeable items for all or items", async () => {
    const user = userEvent.setup();

    render(
      <ItemIconField
        label="Method icon"
        value={undefined}
        onChange={vi.fn()}
        searchAriaLabel="Method icon search"
        optionsAriaLabel="Method icon search options"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open Method icon" }));

    await user.click(
      screen.getByRole("button", { name: "Method icon search options" }),
    );

    const untradeableItemsSwitch = await screen.findByRole("switch", {
      name: "Untradeable items",
    });
    expect(untradeableItemsSwitch).toHaveAttribute("aria-checked", "false");

    await user.click(untradeableItemsSwitch);
    expect(untradeableItemsSwitch).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{Escape}");

    const searchInput = screen.getByRole("combobox", {
      name: "Method icon search",
    });
    await user.type(searchInput, "coal");

    await waitFor(() => expect(searchIcons).toHaveBeenCalled());
    expect(vi.mocked(searchIcons).mock.calls.at(-1)?.slice(0, 3)).toEqual([
      "coal",
      "all",
      true,
    ]);

    await user.click(
      screen.getByRole("button", { name: "Method icon search options" }),
    );
    await user.click(screen.getByRole("menuitemradio", { name: "Spell" }));
    await user.click(
      screen.getByRole("button", { name: "Method icon search options" }),
    );
    const disabledUntradeableItemsSwitch = screen.getByRole("switch", {
      name: "Untradeable items",
    });
    expect(disabledUntradeableItemsSwitch).toBeDisabled();
    expect(disabledUntradeableItemsSwitch).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("prefills the icon search input with the selected icon name when opened", async () => {
    const user = userEvent.setup();

    vi.mocked(fetchIconRecords).mockResolvedValue({
      "game_icon:1609": {
        id: 1609,
        name: "Opal",
        iconUrl: "/opal.png",
        source: "game_icon",
        type: "spell",
      },
    });

    render(
      <ItemIconField
        label="Method icon"
        value={1609}
        source="game_icon"
        onChange={vi.fn()}
        searchAriaLabel="Method icon search"
        optionsAriaLabel="Method icon search options"
      />,
    );

    await waitFor(() =>
      expect(fetchIconRecords).toHaveBeenCalledWith([
        { id: 1609, source: "game_icon" },
      ]),
    );

    await user.click(screen.getByRole("button", { name: "Open Method icon" }));

    expect(
      screen.getByRole("combobox", { name: "Method icon search" }),
    ).toHaveValue("Opal");
  });

  it("preserves blank spaces in requirement reasons while keeping the input single-line", async () => {
    const user = userEvent.setup();

    function Wrapper() {
      const [requirements, setRequirements] = useState<Variant["requirements"]>(
        {
          levels: [{ skill: "Attack", level: 70 }],
        },
      );
      const [recommendations, setRecommendations] = useState<
        Variant["recommendations"]
      >({});

      return (
        <RequirementsRecommendationsField
          requirements={requirements}
          recommendations={recommendations}
          skillOptions={[]}
          questOptions={[]}
          achievementDiaryOptions={[]}
          onChange={({
            requirements: nextRequirements,
            recommendations: nextRecommendations,
          }) => {
            setRequirements(nextRequirements);
            setRecommendations(nextRecommendations ?? {});
          }}
        />
      );
    }

    render(<Wrapper />);

    const attackRow = screen.getByText("Attack").closest("tr");
    expect(attackRow).not.toBeNull();
    const input = within(attackRow as HTMLTableRowElement).getByPlaceholderText(
      "Optional",
    );

    await user.type(input, "main hand ");

    expect(input).toHaveValue("main hand ");
  });

  it("allows up to one required and one recommended entry for the same skill", async () => {
    const user = userEvent.setup();

    function Wrapper() {
      const [requirements, setRequirements] = useState<Variant["requirements"]>(
        {},
      );
      const [recommendations, setRecommendations] =
        useState<Variant["recommendations"]>();

      return (
        <>
          <RequirementsRecommendationsField
            requirements={requirements}
            recommendations={recommendations}
            skillOptions={[
              { label: "Attack", value: "attack", name: "Attack" },
            ]}
            questOptions={[]}
            achievementDiaryOptions={[]}
            onChange={({
              requirements: nextRequirements,
              recommendations: nextRecommendations,
            }) => {
              setRequirements(nextRequirements);
              setRecommendations(nextRecommendations);
            }}
          />
          <pre data-testid="requirements-state">
            {JSON.stringify({
              requirements,
              recommendations: recommendations ?? null,
            })}
          </pre>
        </>
      );
    }

    render(<Wrapper />);

    const searchInput = screen.getByPlaceholderText(
      "Search items, skills, quests, or achievement diaries",
    );
    const getComboboxItem = () =>
      document.querySelector(
        "[data-slot='combobox-item']",
      ) as HTMLElement | null;

    await user.click(searchInput);
    await user.clear(searchInput);
    await user.type(searchInput, "att");
    await waitFor(() => expect(getComboboxItem()).not.toBeNull());
    await user.click(getComboboxItem() as HTMLElement);

    expect(screen.getByTestId("requirements-state")).toHaveTextContent(
      JSON.stringify({
        requirements: { levels: [{ skill: "Attack", level: 1 }] },
        recommendations: null,
      }),
    );

    await user.click(searchInput);
    await user.clear(searchInput);
    await user.type(searchInput, "att");
    await waitFor(() => expect(screen.getByText("1/2")).toBeInTheDocument());
    await user.click(getComboboxItem() as HTMLElement);

    expect(screen.getByTestId("requirements-state")).toHaveTextContent(
      JSON.stringify({
        requirements: { levels: [{ skill: "Attack", level: 1 }] },
        recommendations: { levels: [{ skill: "Attack", level: 1 }] },
      }),
    );

    await user.clear(searchInput);
    await user.type(searchInput, "att");
    expect(await screen.findByText("Complete")).toBeInTheDocument();
  });

  it(
    "does not allow duplicate quest or achievement diary entries",
    async () => {
      const user = userEvent.setup();

      function Wrapper() {
        const [requirements, setRequirements] = useState<
          Variant["requirements"]
        >({});
        const [recommendations, setRecommendations] =
          useState<Variant["recommendations"]>();

        return (
          <>
            <RequirementsRecommendationsField
              requirements={requirements}
              recommendations={recommendations}
              skillOptions={[]}
              questOptions={[
                {
                  label: "Fairy Tale II",
                  value: "fairy-tale-ii",
                  name: "Fairy Tale II",
                  stage: 2,
                },
              ]}
              achievementDiaryOptions={[
                {
                  label: "Lumbridge & Draynor - Hard",
                  value: "lumbridge-draynor-hard",
                  name: "Lumbridge & Draynor",
                  tier: "Hard",
                },
              ]}
              onChange={({
                requirements: nextRequirements,
                recommendations: nextRecommendations,
              }) => {
                setRequirements(nextRequirements);
                setRecommendations(nextRecommendations);
              }}
            />
            <pre data-testid="requirements-state">
              {JSON.stringify({
                requirements,
                recommendations: recommendations ?? null,
              })}
            </pre>
          </>
        );
      }

      render(<Wrapper />);

      const searchInput = screen.getByPlaceholderText(
        "Search items, skills, quests, or achievement diaries",
      );
      const getComboboxItem = () =>
        document.querySelector(
          "[data-slot='combobox-item']",
        ) as HTMLElement | null;

      await user.click(searchInput);
      await user.type(searchInput, "fairy");
      await waitFor(() => expect(getComboboxItem()).not.toBeNull());
      await user.click(getComboboxItem() as HTMLElement);

      expect(screen.getByTestId("requirements-state")).toHaveTextContent(
        JSON.stringify({
          requirements: { quests: [{ name: "Fairy Tale II", stage: 2 }] },
          recommendations: null,
        }),
      );

      await user.clear(searchInput);
      await user.type(searchInput, "fairy");
      expect(await screen.findByText("Added")).toBeInTheDocument();

      await user.clear(searchInput);
      await user.type(searchInput, "lumb");
      await waitFor(() => expect(getComboboxItem()).not.toBeNull());
      await user.click(getComboboxItem() as HTMLElement);

      expect(screen.getByTestId("requirements-state")).toHaveTextContent(
        JSON.stringify({
          requirements: {
            quests: [{ name: "Fairy Tale II", stage: 2 }],
            achievement_diaries: [
              { name: "Lumbridge & Draynor", stage: 2, tier: "Hard" },
            ],
          },
          recommendations: null,
        }),
      );

      await user.clear(searchInput);
      await user.type(searchInput, "lumb");
      expect(await screen.findByText("Added")).toBeInTheDocument();
    },
    SLOW_INTERACTION_TEST_TIMEOUT_MS,
  );

  it("shows only the matching category table for the selected requirement type", async () => {
    const user = userEvent.setup();

    function Wrapper() {
      const [requirements, setRequirements] = useState<Variant["requirements"]>(
        {},
      );
      const [recommendations, setRecommendations] =
        useState<Variant["recommendations"]>();

      return (
        <RequirementsRecommendationsField
          requirements={requirements}
          recommendations={recommendations}
          skillOptions={[]}
          questOptions={[
            {
              label: "Fairy Tale II",
              value: "fairy-tale-ii",
              name: "Fairy Tale II",
              stage: 2,
            },
          ]}
          achievementDiaryOptions={[]}
          onChange={({
            requirements: nextRequirements,
            recommendations: nextRecommendations,
          }) => {
            setRequirements(nextRequirements);
            setRecommendations(nextRecommendations);
          }}
        />
      );
    }

    render(<Wrapper />);

    const searchInput = screen.getByPlaceholderText(
      "Search items, skills, quests, or achievement diaries",
    );
    const getComboboxItem = () =>
      document.querySelector(
        "[data-slot='combobox-item']",
      ) as HTMLElement | null;

    await user.click(searchInput);
    await user.type(searchInput, "fairy");
    await waitFor(() => expect(getComboboxItem()).not.toBeNull());
    await user.click(getComboboxItem() as HTMLElement);

    expect(screen.getByRole("heading", { name: "Quests" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Items" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Achievement diaries" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Skills" }),
    ).not.toBeInTheDocument();
  });
});
