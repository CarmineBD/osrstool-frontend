import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByText("Consistent dragon loot.")).toBeInTheDocument();
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

  it("toggles advanced item tooltip details globally across all items", async () => {
    const nowUnixSeconds = Math.floor(Date.now() / 1000);
    const highTimeUnix = nowUnixSeconds - (2 * 60 * 60 + 16 * 60);
    const lowTimeUnix = nowUnixSeconds - (1 * 60 * 60 + 6 * 60);

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
                  inputs: [
                    { id: 536, quantity: 2, reason: "Core input" },
                    { id: 385, quantity: 1, reason: "Secondary input" },
                  ],
                  outputs: [],
                },
              ],
            },
          },
        })
      ),
      http.get("*/items", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("fields")).toBe(
          "name,iconUrl,highPrice,lowPrice,high24h,low24h,highTime,lowTime"
        );

        return HttpResponse.json({
          data: {
            536: {
              name: "Dragon bones",
              iconUrl: "https://oldschool.runescape.wiki/images/Dragon_bones.png",
              highPrice: 3000,
              lowPrice: 2800,
              high24h: 123456,
              low24h: 654321,
              highTime: highTimeUnix,
              lowTime: lowTimeUnix,
            },
            385: {
              name: "Shark",
              iconUrl: "https://oldschool.runescape.wiki/images/Shark.png",
              highPrice: 900,
              lowPrice: 850,
              high24h: 3000,
              low24h: 4500,
              highTime: highTimeUnix,
              lowTime: lowTimeUnix,
            },
          },
        });
      }),
    );

    renderMethodDetail("/moneyMakingMethod/vorkath-farming");

    const user = userEvent.setup();
    const firstItemIcon = await screen.findByAltText("Dragon bones");
    await user.hover(firstItemIcon);

    const tooltips = await screen.findAllByRole("tooltip");
    const firstTooltip = tooltips[tooltips.length - 1];

    expect(within(firstTooltip).getByText("Core input")).toBeInTheDocument();
    expect(
      within(firstTooltip).getByRole("button", { name: /show more details/i })
    ).toBeInTheDocument();
    expect(
      within(firstTooltip).queryByText(/Insta buy volume last 24h/i)
    ).not.toBeInTheDocument();

    await user.click(
      within(firstTooltip).getByRole("button", { name: /show more details/i })
    );

    expect(
      await within(firstTooltip).findByText("Dailes buys: 123.46k")
    ).toBeInTheDocument();
    expect(
      within(firstTooltip).getByText("Dailies sales: 654.32k")
    ).toBeInTheDocument();
    expect(within(firstTooltip).getByText("last buy: 2h 16m ago")).toBeInTheDocument();
    expect(within(firstTooltip).getByText("last sell: 1h 6m ago")).toBeInTheDocument();
    expect(
      within(firstTooltip).getByRole("button", { name: /show less details/i })
    ).toBeInTheDocument();

    await user.unhover(firstItemIcon);

    const secondItemIcon = await screen.findByAltText("Shark");
    await user.hover(secondItemIcon);

    const secondTooltips = await screen.findAllByRole("tooltip");
    const secondTooltip = secondTooltips[secondTooltips.length - 1];

    expect(within(secondTooltip).getByText("Secondary input")).toBeInTheDocument();
    expect(
      within(secondTooltip).getByText("Dailes buys: 3k")
    ).toBeInTheDocument();
    expect(
      within(secondTooltip).getByRole("button", { name: /show less details/i })
    ).toBeInTheDocument();

    await user.click(
      within(secondTooltip).getByRole("button", { name: /show less details/i })
    );

    expect(
      await within(secondTooltip).findByRole("button", {
        name: /show more details/i,
      })
    ).toBeInTheDocument();
    expect(
      within(secondTooltip).queryByText(/Dailes buys/i)
    ).not.toBeInTheDocument();

    await user.unhover(secondItemIcon);
    await user.hover(firstItemIcon);

    const collapsedTooltips = await screen.findAllByRole("tooltip");
    const collapsedFirstTooltip = collapsedTooltips[collapsedTooltips.length - 1];

    expect(
      within(collapsedFirstTooltip).getByRole("button", {
        name: /show more details/i,
      })
    ).toBeInTheDocument();
    expect(
      within(collapsedFirstTooltip).queryByText(/Dailes buys/i)
    ).not.toBeInTheDocument();
  });
});
