import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
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

describe("critical flow: terms of use route", () => {
  it("links to and renders the terms of use page", async () => {
    window.history.pushState({}, "", "/");

    renderApp();

    const user = userEvent.setup();
    const termsLink = await screen.findByRole("link", {
      name: /terms of use/i,
    });

    expect(termsLink).toHaveAttribute("href", "/terms-of-use");

    await user.click(termsLink);

    expect(
      await screen.findByRole("heading", { name: "Terms of Use" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Acceptable Use" })
    ).toBeInTheDocument();

    const termsPagePanel = screen.getByRole("heading", {
      name: "Terms of Use",
    }).closest("section");

    expect(termsPagePanel).not.toBeNull();
    expect(
      within(termsPagePanel as HTMLElement).getByRole("link", {
        name: /privacy policy/i,
      })
    ).toHaveAttribute("href", "/privacy-policy");
    expect(
      screen.getByRole("heading", { name: "Last Updated" })
    ).toBeInTheDocument();
  });
});
