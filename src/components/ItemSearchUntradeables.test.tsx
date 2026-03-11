import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IoItemsField } from "@/components/IoItemsField";
import { RequirementsRecommendationsField } from "@/components/RequirementsRecommendationsField";
import { fetchItems, searchItems } from "@/lib/api";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    fetchItems: vi.fn(),
    searchItems: vi.fn(),
  };
});

describe("item search untradeables toggle", () => {
  beforeEach(() => {
    vi.mocked(fetchItems).mockResolvedValue({});
    vi.mocked(searchItems).mockResolvedValue({
      items: [],
      page: 1,
      pageCount: 1,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to false and updates the inputs search request when enabled", async () => {
    const user = userEvent.setup();

    render(<IoItemsField label="Inputs" items={[]} onChange={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "Inputs search options" })
    );

    const showUntradeablesSwitch = await screen.findByRole("switch", {
      name: "Show untradeables",
    });
    expect(showUntradeablesSwitch).toHaveAttribute("aria-checked", "false");

    await user.click(showUntradeablesSwitch);
    expect(showUntradeablesSwitch).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{Escape}");

    const searchInput = screen.getByPlaceholderText("Buscar item...");
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
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Requirements search options" })
    );

    const showUntradeablesSwitch = await screen.findByRole("switch", {
      name: "Show untradeables",
    });
    expect(showUntradeablesSwitch).toHaveAttribute("aria-checked", "false");

    await user.click(showUntradeablesSwitch);
    expect(showUntradeablesSwitch).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{Escape}");

    const searchInput = screen.getByPlaceholderText(
      "Buscar items, quests, achievement diaries o skills..."
    );
    await user.type(searchInput, "coal");

    await waitFor(() => expect(searchItems).toHaveBeenCalled());
    expect(vi.mocked(searchItems).mock.calls.at(-1)?.[0]).toBe("coal");
    expect(vi.mocked(searchItems).mock.calls.at(-1)?.[4]).toEqual({
      showUntradeables: true,
    });
  });
});
