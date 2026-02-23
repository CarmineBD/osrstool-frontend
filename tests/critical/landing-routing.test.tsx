import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import App from "@/App";
import { server } from "../msw/server";
import { render } from "@testing-library/react";
import { createTestQueryClient } from "../utils/render";

function renderApp() {
  const queryClient = createTestQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

describe("critical flow: landing + all methods routing", () => {
  it("renders landing content at root route", async () => {
    window.history.pushState({}, "", "/");

    renderApp();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /make money and train efficiently/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /explorar money making methods/i })
    ).toHaveAttribute("href", "/allMethods");
    expect(
      screen.getByRole("heading", { name: "Changelog de novedades" })
    ).toBeInTheDocument();
  });

  it("renders all methods page at /allMethods", async () => {
    server.use(
      http.get("*/methods", () =>
        HttpResponse.json({
          data: {
            methods: [],
            page: 1,
            perPage: 10,
            total: 0,
          },
        })
      )
    );

    window.history.pushState({}, "", "/allMethods");
    renderApp();

    expect(
      await screen.findByRole("heading", { name: "OSRS Moneymaking Methods" })
    ).toBeInTheDocument();
  });

  it("renders a changelog detail page", async () => {
    window.history.pushState({}, "", "/changelog/2026-02-22-v0.3.0");

    renderApp();

    expect(
      await screen.findByRole("heading", { name: "Landing SEO + Changelog" })
    ).toBeInTheDocument();
    expect(await screen.findByText("Cambios principales")).toBeInTheDocument();
  });
});
