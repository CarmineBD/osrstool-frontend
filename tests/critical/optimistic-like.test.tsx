import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { delay, http, HttpResponse } from "msw";
import { MethodsList } from "@/features/methods/MethodsList";
import { server } from "../msw/server";
import { renderWithProviders } from "../utils/render";

describe("critical flow: optimistic like", () => {
  it("updates like state optimistically before the API resolves", async () => {
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
      http.post("*/methods/:methodId/like", async () => {
        likeRequests += 1;
        await delay(120);
        return HttpResponse.json({}, { status: 200 });
      })
    );

    renderWithProviders(<MethodsList username="" />);

    const likeButton = await screen.findByRole("button", { name: "Like method" });
    expect(within(likeButton).getByText("5")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(likeButton);

    await waitFor(() => {
      const unlikeButton = screen.getByRole("button", { name: "Unlike method" });
      expect(within(unlikeButton).getByText("6")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(likeRequests).toBe(1);
      expect(
        screen.getByRole("button", { name: "Unlike method" })
      ).not.toBeDisabled();
    });
  });
});
