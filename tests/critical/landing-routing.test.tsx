import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import App from "@/App";
import { server } from "../msw/server";
import { render } from "@testing-library/react";
import { createTestQueryClient } from "../utils/render";
import { OFFICIAL_DISCORD_URL } from "@/lib/community";

function renderApp() {
  const queryClient = createTestQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe("critical flow: landing + all methods routing", () => {
  it("renders landing content at root route", async () => {
    window.history.pushState({}, "", "/");

    renderApp();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /play smarter\.\s*earn more\./i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Find a method" }),
    ).toHaveAttribute("href", "#method-finder");
    const betaNotice = screen.getByText(/RSMethods is in Beta/);
    expect(betaNotice).toBeInTheDocument();
    expect(betaNotice.parentElement).toHaveTextContent(
      "You may encounter bugs or inaccurate data while we keep improving the app. Found something wrong or have an idea? Join our Discord and let us know.",
    );
    expect(betaNotice.closest("[role='alert']")).toBeNull();
    expect(
      screen.getByRole("link", {
        name: "Join our Discord",
      }),
    ).toHaveAttribute("href", OFFICIAL_DISCORD_URL);
    expect(document.getElementById("method-finder")).toHaveClass(
      "scroll-mt-20",
    );
    expect(
      screen.getByRole("heading", { name: "What do you feel like doing?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /see what.*new in rsmethods/i }),
    ).toBeInTheDocument();
    expect(await screen.findAllByText("Blast Furnace")).not.toHaveLength(0);
    expect(
      await screen.findAllByAltText("Steel bars icon"),
    ).not.toHaveLength(0);
    expect(
      screen.getByRole("link", {
        name: /#1\s+Steel bars icon\s+Blast Furnace/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /#2\s+Main icon\s+Rune Dragons/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("1.2m")).not.toHaveLength(0);
    expect(screen.getByText("+5.4%")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /read update/i }),
    ).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: /view all updates/i }),
    ).toHaveAttribute("href", "/changelog");
  }, 10_000);

  it("clears the Quick Demo username when Fetch is submitted empty", async () => {
    window.history.pushState({}, "", "/");

    renderApp();

    const finder = await screen.findByRole("region", {
      name: "What do you feel like doing?",
    });
    expect(
      within(finder).getByLabelText("OSRS username"),
    ).toHaveAttribute("placeholder", "username");

    await userEvent.setup().click(
      within(finder).getByRole("button", { name: "Fetch" }),
    );

    expect(
      screen.getByRole("heading", {
        name: "What do you feel like doing?",
      }),
    ).toBeInTheDocument();
  }, 10_000);

  it("shows the fixed training skill shortcuts in Quick Demo", async () => {
    window.history.pushState({}, "", "/");

    renderApp();

    const finder = await screen.findByRole("region", {
      name: "What do you feel like doing?",
    });
    await userEvent.setup().click(
      within(finder).getByRole("button", { name: "Train a skill" }),
    );

    for (const skill of ["Herblore", "Fletching", "Crafting", "Magic"]) {
      expect(
        within(finder).getByRole("button", { name: skill }),
      ).toBeInTheDocument();
    }
    expect(
      within(finder).getByRole("link", { name: "See all skills" }),
    ).toHaveAttribute("href", "/skilling");

    await userEvent.setup().click(within(finder).getByLabelText("Only F2P"));
    expect(within(finder).getByRole("button", { name: "Herblore" })).toBeDisabled();
    expect(within(finder).getByRole("button", { name: "Fletching" })).toBeDisabled();
  }, 10_000);

  it("shows three result skeletons while Quick Demo filters are updating", async () => {
    window.history.pushState({}, "", "/");

    renderApp();

    const finder = await screen.findByRole("region", {
      name: "What do you feel like doing?",
    });
    await within(finder).findByRole("link", { name: /Blast Furnace/i });

    let resolveSearch: (() => void) | undefined;
    server.use(
      http.post("*/methods/search", async () => {
        await new Promise<void>((resolve) => {
          resolveSearch = resolve;
        });

        return HttpResponse.json({
          data: { methods: [], page: 1, perPage: 10, total: 0 },
        });
      }),
    );

    await userEvent.setup().click(
      within(finder).getByRole("button", { name: "Train a skill" }),
    );

    const loadingMatches = await within(finder).findByRole("status", {
      name: "Loading matches",
    });
    expect(
      loadingMatches.querySelectorAll('[data-slot="skeleton"]'),
    ).toHaveLength(9);

    resolveSearch?.();
    expect(
      await within(finder).findByText("No methods match these choices yet."),
    ).toBeInTheDocument();
  });

  it("renders all methods page at /allMethods", async () => {
    server.use(
      http.post("*/methods/search", () =>
        HttpResponse.json({
          data: {
            methods: [],
            page: 1,
            perPage: 10,
            total: 0,
          },
        }),
      ),
    );

    window.history.pushState({}, "", "/allMethods");
    renderApp();

    expect(
      await screen.findByRole("heading", { name: "All Methods" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Browse every currently available in-game method with live data\./i,
      ),
    ).toBeInTheDocument();
  });

  it("renders a changelog detail page", async () => {
    window.history.pushState({}, "", "/changelog/2026-02-22-v0.3.0");

    renderApp();

    expect(
      await screen.findByRole("heading", { name: "Landing SEO + Changelog" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Main changes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("renders changelog list page with pagination", async () => {
    window.history.pushState({}, "", "/changelog");

    renderApp();

    expect(
      await screen.findByRole("heading", { name: "All updates" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /read update details/i }),
    ).toHaveLength(5);
    expect(
      screen.getByRole("button", { name: "Current page, page 1" }),
    ).toBeInTheDocument();
  });
});
