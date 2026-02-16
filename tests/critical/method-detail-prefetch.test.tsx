import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { MethodsList } from "@/features/methods/MethodsList";
import { server } from "../msw/server";
import { renderWithProviders } from "../utils/render";

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("critical flow: method detail prefetch", () => {
  it("prefetches only on intentional hover and skips duplicate fresh requests", async () => {
    let detailRequests = 0;

    server.use(
      http.get("*/methods", () =>
        HttpResponse.json({
          data: {
            methods: [
              {
                id: "method-1",
                slug: "zulrah",
                name: "Zulrah",
                category: "combat",
                likes: 5,
                likedByMe: false,
                variants: [
                  {
                    slug: "main",
                    label: "Main",
                    requirements: {},
                    inputs: [],
                    outputs: [],
                  },
                ],
              },
            ],
            page: 1,
            perPage: 10,
            total: 1,
          },
        })
      ),
      http.get("*/methods/slug/:slug", ({ params }) => {
        detailRequests += 1;

        return HttpResponse.json({
          data: {
            method: {
              id: "method-1",
              slug: params.slug,
              name: "Zulrah",
              category: "combat",
              likes: 5,
              likedByMe: false,
              variants: [
                {
                  slug: "main",
                  label: "Main",
                  requirements: {},
                  inputs: [],
                  outputs: [],
                },
              ],
            },
          },
        });
      })
    );

    renderWithProviders(<MethodsList username="" />);

    const methodLink = await screen.findByRole("link", { name: "Zulrah" });
    const user = userEvent.setup();

    await user.hover(methodLink);
    await wait(100);
    await user.unhover(methodLink);
    await wait(250);
    expect(detailRequests).toBe(0);

    await user.hover(methodLink);
    await waitFor(() => {
      expect(detailRequests).toBe(1);
    });

    await user.unhover(methodLink);
    await user.hover(methodLink);
    await wait(250);
    expect(detailRequests).toBe(1);
  });
});
