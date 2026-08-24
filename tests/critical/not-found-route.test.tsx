import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "@/App";
import { render } from "@testing-library/react";
import { createTestQueryClient } from "../utils/render";

describe("critical flow: unknown routes", () => {
  it("renders the 404 page for unknown routes", async () => {
    window.history.pushState({}, "", "/route-that-does-not-exist");

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    expect(await screen.findByText("404 - Page not found")).toBeInTheDocument();
    expect(
      screen.getByText("The page you are looking for does not exist or was moved.")
    ).toBeInTheDocument();
    expect(document.title).toBe("404 - Page not found | RSMethods");
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, follow"
    );
    const homeLink = screen.getByRole("link", { name: "RSMethods home" });
    expect(homeLink).toBeInTheDocument();

    await userEvent.setup().click(homeLink);

    await screen.findByText("Welcome to RSMethods");
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });
});
