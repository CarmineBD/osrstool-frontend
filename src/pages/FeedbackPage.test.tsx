import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OFFICIAL_DISCORD_URL } from "@/lib/community";
import { FEEDBACK_DISCORD_FORUM_URL } from "@/lib/feedback";
import { renderWithProviders } from "../../tests/utils/render";
import { FeedbackPage } from "./FeedbackPage";

describe("FeedbackPage", () => {
  it("uses the official Discord by default and opens it securely", () => {
    renderWithProviders(<FeedbackPage />, { route: "/feedback" });

    const discordLink = screen.getByRole("link", {
      name: "Join our Discord.",
    });

    expect(FEEDBACK_DISCORD_FORUM_URL).toBe(OFFICIAL_DISCORD_URL);
    expect(discordLink).toHaveAttribute(
      "href",
      FEEDBACK_DISCORD_FORUM_URL,
    );
    expect(discordLink).toHaveAttribute("target", "_blank");
    expect(discordLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});
