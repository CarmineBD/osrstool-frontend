import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MethodVariantContent } from "@/features/method-detail/MethodVariantContent";
import { renderWithProviders } from "../utils/render";

describe("method variant content reasons", () => {
  it("shows requirement and recommendation reasons through shadcn tooltips", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <MethodVariantContent
        variant={{
          label: "Main",
          members: false,
          description: "Variant description",
          xpHour: [],
          requirements: {
            levels: [
              { skill: "Prayer", level: 70, reason: "Needed for Piety" },
            ],
            quests: [
              {
                name: "Fairy Tale II",
                stage: 1,
                reason: "Unlock fairy rings",
              },
            ],
          },
          recommendations: {
            achievement_diaries: [
              {
                name: "Lumbridge & Draynor",
                tier: "Hard",
                stage: 2,
                reason: "Useful quality-of-life perk",
              },
            ],
          },
          inputs: [],
          outputs: [],
        }}
        itemsMap={{}}
      />
    );

    await user.hover(screen.getByText("70"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Needed for Piety"
    );

    await user.unhover(screen.getByText("70"));
    await user.hover(screen.getByText("Fairy Tale II (started)"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Unlock fairy rings"
    );

    await user.unhover(screen.getByText("Fairy Tale II (started)"));
    await user.hover(screen.getByText("Lumbridge & Draynor Hard"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Useful quality-of-life perk"
    );
  });
});
