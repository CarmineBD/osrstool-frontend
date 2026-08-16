import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "@/App";
import { createTestQueryClient } from "../utils/render";

function renderApp() {
  const queryClient = createTestQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

describe("critical flow: privacy policy route", () => {
  it("links to and renders the privacy policy page", async () => {
    window.history.pushState({}, "", "/");

    renderApp();

    const user = userEvent.setup();
    const privacyLink = await screen.findByRole("link", {
      name: /privacy policy/i,
    });

    expect(privacyLink).toHaveAttribute("href", "/privacy-policy");

    await user.click(privacyLink);

    expect(
      await screen.findByRole("heading", { name: "Privacy Policy" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Who We Are" })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /contact@rsmethods\.com/i }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: "Last Updated" })
    ).toBeInTheDocument();
  });
});
