import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { Home } from "@/pages/Home";
import { server } from "../msw/server";
import { renderWithProviders } from "../utils/render";

describe("critical flow: methods list tags", () => {
  it("renders variant tags in the table with descriptions and overflow names", async () => {
    server.use(
      http.get("*/items", () =>
        HttpResponse.json({
          data: {
            9342: {
              name: "Onyx bolts icon",
              iconUrl: "https://example.com/onyx-bolts.png",
            },
          },
        }),
      ),
      http.get("*/methods", () =>
        HttpResponse.json({
          data: {
            methods: [
              {
                id: "method-1",
                slug: "tipping-bolts",
                name: "Tipping bolts",
                category: "skilling",
                likes: 0,
                likedByMe: false,
                variants: [
                  {
                    id: "variant-1",
                    slug: "onyx-bolts",
                    label: "Onyx bolts",
                    icon_id: 9342,
                    highProfit: 3199200,
                    lowProfit: 2167200,
                    requirements: {},
                    inputs: [],
                    outputs: [],
                    tags: [
                      {
                        label: "GE limits",
                        severity: 2,
                        description:
                          "Some required inputs exceed Grand Exchange buy limits.\n- Runite bolts require more than the GE cap.",
                      },
                      {
                        label: "High investment required",
                        severity: 2,
                        description:
                          "This method requires a high upfront investment.",
                      },
                      {
                        label: "Safe",
                        severity: 1,
                        description:
                          "This method has stayed above break-even over the last 24 hours.",
                      },
                    ],
                  },
                ],
              },
            ],
            page: 1,
            perPage: 10,
            total: 1,
          },
        }),
      ),
    );

    renderWithProviders(<Home />);

    expect(
      await screen.findByRole("link", { name: "Tipping bolts" }),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    const moreButton = await screen.findByRole("button", {
      name: /show 1 more tags/i,
    });
    const geLimitsTag = screen.getByText("GE limits").closest("[data-slot='badge']");
    const highInvestmentTag = screen
      .getByText("High investment required")
      .closest("[data-slot='badge']");

    expect(geLimitsTag).toHaveAttribute("data-severity", "2");
    expect(geLimitsTag).toHaveClass("bg-warning-soft", "text-warning-foreground");
    expect(highInvestmentTag).toHaveAttribute("data-severity", "2");
    expect(highInvestmentTag).toHaveClass(
      "bg-warning-soft",
      "text-warning-foreground",
    );

    await user.hover(screen.getByText("GE limits"));
    const tagTooltips = await screen.findAllByRole("tooltip");
    const tagTooltip = tagTooltips[tagTooltips.length - 1];
    const multilineDescription = within(tagTooltip).getByText(
      /grand exchange buy limits/i,
    );
    expect(multilineDescription).toBeInTheDocument();
    expect(multilineDescription).toHaveClass("whitespace-pre-line");
    expect(
      within(tagTooltip).getByText(/runite bolts require more than the ge cap/i),
    ).toBeInTheDocument();

    await user.unhover(screen.getByText("GE limits"));
    await user.hover(moreButton);

    expect(moreButton).toHaveAttribute("title", "Safe");
  });
});
