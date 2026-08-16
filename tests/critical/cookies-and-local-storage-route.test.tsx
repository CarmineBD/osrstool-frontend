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
    </QueryClientProvider>,
  );
}

describe("critical flow: cookies and local storage route", () => {
  it("links to and renders the cookies and local storage page", async () => {
    window.history.pushState({}, "", "/");

    renderApp();

    const user = userEvent.setup();
    const cookiesLink = await screen.findByRole("link", {
      name: /cookies and local storage/i,
    });

    expect(cookiesLink).toHaveAttribute("href", "/cookies-and-local-storage");

    await user.click(cookiesLink);

    expect(
      await screen.findByRole("heading", {
        name: "Cookies and Local Storage",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Detected Storage" })).toBeInTheDocument();
    expect(
      screen.getByText(/no analytics, advertising, or non-essential tracking scripts/i),
    ).toBeInTheDocument();
  });
});
