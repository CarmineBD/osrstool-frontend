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
      screen.getByRole("link", { name: /explore money making methods/i })
    ).toHaveAttribute("href", "/allMethods");
    expect(
      screen.getByRole("heading", { name: "Changelog de novedades" })
    ).toBeInTheDocument();
    expect(await screen.findByText("Blast Furnace")).toBeInTheDocument();
    expect(await screen.findByAltText("Steel bars icon")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /#1\s+Steel bars icon\s+Blast Furnace/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /#2\s+Main icon\s+Rune Dragons/i })
    ).toBeInTheDocument();
    expect(screen.getByText("1.2m")).toBeInTheDocument();
    expect(screen.getByText("+5.4%")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /leer articulo completo/i })).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: /ver todas las novedades/i })
    ).toHaveAttribute("href", "/changelog");
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
      await screen.findByRole("heading", { name: "All Methods" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /View every currently available in-game method with real data\./i
      )
    ).toBeInTheDocument();
  });

  it("renders a changelog detail page", async () => {
    window.history.pushState({}, "", "/changelog/2026-02-22-v0.3.0");

    renderApp();

    expect(
      await screen.findByRole("heading", { name: "Landing SEO + Changelog" })
    ).toBeInTheDocument();
    expect(await screen.findByText("Cambios principales")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /volver/i })).toBeInTheDocument();
  });

  it("renders changelog list page with pagination", async () => {
    window.history.pushState({}, "", "/changelog");

    renderApp();

    expect(
      await screen.findByRole("heading", { name: "Todas las novedades" })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /ver detalle de la novedad/i })
    ).toHaveLength(5);
    expect(
      screen.getByRole("button", { name: "Current page, page 1" })
    ).toBeInTheDocument();
  });
});
