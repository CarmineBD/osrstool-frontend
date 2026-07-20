import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { delay, http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { MethodDetail } from "@/pages/MethodDetail";
import { MethodsList } from "@/features/methods/MethodsList";
import { server } from "../msw/server";
import { renderWithProviders } from "../utils/render";

describe("critical flow: optimistic variant like", () => {
  it("updates variant like state optimistically before the API resolves", async () => {
    const authProviderModule = await import("@/auth/AuthProvider");
    authProviderModule.__setAuthMockState({
      session: {
        access_token: "token-1",
      },
      user: {
        id: "user-1",
        email: "test@example.com",
      },
    });

    let likeRequests = 0;
    let variantLikes = 5;
    let variantLikedByMe = false;

    server.use(
      http.get("*/methods/slug/:slug", ({ params }) =>
        HttpResponse.json({
          data: {
            method: {
              id: "method-1",
              slug: params.slug,
              name: "Zulrah",
              category: "combat",
              description: "Poison-heavy money maker.",
              variants: [
                {
                  id: "variant-1",
                  slug: "main",
                  label: "Main",
                  likes: variantLikes,
                  likedByMe: variantLikedByMe,
                  requirements: {},
                  inputs: [],
                  outputs: [],
                },
              ],
            },
          },
        }),
      ),
      http.post("*/methods/variant/:variantId/like", async () => {
        likeRequests += 1;
        await delay(120);
        variantLikes = 6;
        variantLikedByMe = true;
        return HttpResponse.json({}, { status: 200 });
      }),
      http.get("*/variants/:variantId/history", () =>
        HttpResponse.json({
          data: [],
          variant_snapshot: [],
        }),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/moneyMakingMethod/:slug/:variantSlug?"
          element={<MethodDetail />}
        />
      </Routes>,
      { route: "/moneyMakingMethod/zulrah" },
    );

    const likeButton = await screen.findByRole("button", {
      name: /Like variant|Unlike variant/,
    });
    expect(within(likeButton).getByText("5")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(likeButton);

    await waitFor(() => {
      const unlikeButton = screen.getByRole("button", {
        name: "Unlike variant",
      });
      expect(within(unlikeButton).getByText("6")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(likeRequests).toBe(1);
      expect(
        screen.getByRole("button", { name: "Unlike variant" }),
      ).not.toBeDisabled();
    });
  });

  it("shows aggregated likes in lists without rendering a like action", async () => {
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
                variants: [
                  {
                    id: "variant-1",
                    slug: "main",
                    label: "Main",
                    likes: 5,
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
        }),
      ),
    );

    renderWithProviders(<MethodsList username="" />);

    expect(await screen.findByRole("link", { name: "Zulrah" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Likes" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Like variant|Unlike variant/ })).not.toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
