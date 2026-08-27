import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OFFICIAL_DISCORD_URL } from "@/lib/community";
import { renderWithProviders } from "../../tests/utils/render";
import { FeedbackPage } from "./FeedbackPage";

describe("FeedbackPage", () => {
  it("links to the official Discord securely", () => {
    renderWithProviders(<FeedbackPage />, { route: "/feedback" });

    const discordLink = screen.getByRole("link", {
      name: "Join our Discord.",
    });

    expect(discordLink).toHaveAttribute("href", OFFICIAL_DISCORD_URL);
    expect(discordLink).toHaveAttribute("target", "_blank");
    expect(discordLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});
