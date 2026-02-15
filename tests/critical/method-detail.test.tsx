import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { MethodDetail } from "@/pages/MethodDetail";
import { server } from "../msw/server";
import { renderWithProviders } from "../utils/render";

function renderMethodDetail(route: string) {
  return renderWithProviders(
    <Routes>
      <Route
        path="/moneyMakingMethod/:slug/:variantSlug?"
        element={<MethodDetail />}
      />
    </Routes>,
    { route }
  );
}

describe("critical flow: method detail load + error", () => {
  it("loads and renders method detail", async () => {
    server.use(
      http.get("*/methods/slug/:slug", ({ params }) =>
        HttpResponse.json({
          data: {
            method: {
              id: "method-1",
              slug: params.slug,
              name: "Vorkath farming",
              category: "combat",
              description: "Consistent dragon loot.",
              likes: 7,
              likedByMe: false,
              variants: [
                {
                  slug: "main",
                  label: "Main",
                  description: "Use dragon hunter lance.",
                  requirements: {},
                  inputs: [],
                  outputs: [],
                },
              ],
            },
          },
        })
      )
    );

    renderMethodDetail("/moneyMakingMethod/vorkath-farming");

    expect(
      await screen.findByRole("heading", { name: "Vorkath farming" })
    ).toBeInTheDocument();
    expect(screen.getByText("Category:")).toBeInTheDocument();
  });

  it("shows an error state when detail request fails", async () => {
    server.use(
      http.get("*/methods/slug/:slug", () =>
        HttpResponse.json({ message: "boom" }, { status: 500 })
      )
    );

    renderMethodDetail("/moneyMakingMethod/failing-method");

    expect(await screen.findByText(/HTTP 500/i)).toBeInTheDocument();
  });
});
