import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { Home } from "@/pages/Home";
import { getMethodsTableColumnStorageKey } from "@/features/methods/tableColumns";
import { server } from "../msw/server";
import { renderWithProviders } from "../utils/render";

function buildMethod(
  id: string,
  name: string,
  slug: string,
  iconId: number,
  variantLabel = "Main",
) {
  return {
    id,
    slug,
    name,
    category: "skilling",
    likes: 0,
    likedByMe: false,
    variants: [
      {
        slug: `${slug}-main`,
        label: variantLabel,
        members: false,
        icon_id: iconId,
        requirements: {},
        inputs: [],
        outputs: [],
      },
    ],
  };
}

const SLOW_INTERACTION_TEST_TIMEOUT_MS = 20000;

describe("critical flow: list render + filters", () => {
  it(
    "renders methods and applies method-name filtering",
    async () => {
      const seenNames: string[] = [];
      const seenShowOnlyFreeToPlay: string[] = [];
      const seenIgnoredTags: string[] = [];
      const seenSortBy: string[] = [];
      const seenOrder: string[] = [];

      server.use(
        http.get("*/items", ({ request }) => {
          const requestUrl = new URL(request.url);
          const ids = (requestUrl.searchParams.get("ids") ?? "")
            .split(",")
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value));
          const data = Object.fromEntries(
            ids.map((id) => [
              id,
              id === 1001
                ? {
                    name: "Shark fishing icon",
                    iconUrl: "https://example.com/shark-fishing.png",
                  }
                : {
                    name: "Dragon bones run icon",
                    iconUrl: "https://example.com/dragon-bones-run.png",
                  },
            ]),
          );
          return HttpResponse.json({ data });
        }),
        http.post("*/methods/search", ({ request }) => {
          const requestUrl = new URL(request.url);
          const name = requestUrl.searchParams.get("name") ?? "";
          const showOnlyFreeToPlay =
            requestUrl.searchParams.get("show_only_free_to_play") ?? "";
          const ignoredTags = requestUrl.searchParams
            .getAll("ignoredTags")
            .join(",");
          const sortBy = requestUrl.searchParams.get("sortBy") ?? "";
          const order = requestUrl.searchParams.get("order") ?? "";
          seenNames.push(name);
          seenShowOnlyFreeToPlay.push(showOnlyFreeToPlay);
          seenIgnoredTags.push(ignoredTags);
          seenSortBy.push(sortBy);
          seenOrder.push(order);

          const methods = name.toLowerCase().includes("dragon")
            ? [
                buildMethod(
                  "method-2",
                  "Dragon bones run",
                  "dragon-bones-run",
                  1002,
                  "Fast route",
                ),
              ]
            : [buildMethod("method-1", "Shark fishing", "shark-fishing", 1001)];

          return HttpResponse.json({
            data: {
              methods,
              page: 1,
              perPage: 10,
              total: methods.length,
            },
          });
        }),
      );

      renderWithProviders(<Home />);

      expect(
        await screen.findByRole("link", { name: "Shark fishing" }),
      ).toBeInTheDocument();
      expect(
        await screen.findByAltText("Shark fishing icon"),
      ).toBeInTheDocument();
      expect(seenShowOnlyFreeToPlay).toContain("false");
      expect(seenIgnoredTags).toContain("not_viable");
      expect(seenSortBy).toContain("highProfit");
      expect(seenOrder).toContain("desc");

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /show filters/i }));
      expect((await screen.findAllByText("Not viable")).length).toBeGreaterThan(
        0,
      );
      await user.click(screen.getByLabelText("Ignored tags"));
      expect(screen.queryByText("No tags found.")).not.toBeInTheDocument();
      await user.hover(
        screen.getByRole("button", { name: /ge limits explanation/i }),
      );
      expect(
        (
          await screen.findAllByText(
            /some required inputs exceed grand exchange buy limits at the one-hour scale/i,
          )
        ).length,
      ).toBeGreaterThan(0);
      await user.keyboard("{Escape}");
      await user.click(screen.getByRole("button", { name: /clear/i }));
      await user.click(screen.getByRole("switch", { name: /f2p only/i }));
      await user.type(
        screen.getByPlaceholderText("Search by method name"),
        "dragon",
      );

      expect(
        await screen.findByRole("link", { name: "Dragon bones run" }),
      ).toBeInTheDocument();
      expect(
        await screen.findByAltText("Dragon bones run icon"),
      ).toBeInTheDocument();
      expect(screen.getByText("Fast route")).toBeInTheDocument();
      expect(seenNames).toContain("dragon");
      expect(seenShowOnlyFreeToPlay).toContain("true");
      expect(seenIgnoredTags).toContain("");
      expect(seenSortBy).toContain("highProfit");
      expect(seenOrder).toContain("desc");
    },
    SLOW_INTERACTION_TEST_TIMEOUT_MS,
  );

  it("disables the username-data switch when no username is available", async () => {
    server.use(
      http.post("*/methods/search", () =>
        HttpResponse.json({
          data: {
            methods: [
              buildMethod("method-1", "Shark fishing", "shark-fishing", 1001),
            ],
            page: 1,
            perPage: 10,
            total: 1,
          },
        }),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<Home />);

    await screen.findByRole("link", { name: "Shark fishing" });
    await user.click(screen.getByRole("button", { name: /show filters/i }));

    const usernameDataSwitch = screen.getByRole("switch", {
      name: /use username data/i,
    });
    expect(usernameDataSwitch).toBeDisabled();
    expect(usernameDataSwitch).toHaveAttribute("aria-checked", "false");
    expect(
      screen.getByText(
        "Enter your username to enable stat-based method filtering.",
      ),
    ).toBeInTheDocument();
  });

  it("lets users toggle username-based filtering on and off", async () => {
    const seenPlayerBodies: unknown[] = [];
    const usernameContextModule = await import("@/contexts/UsernameContext");
    usernameContextModule.__setUsernameMockState({ username: "Zezima" });

    server.use(
      http.get("*/items", () => HttpResponse.json({ data: {} })),
      http.post("*/methods/search", async ({ request }) => {
        seenPlayerBodies.push(
          ((await request.json()) as { player?: unknown }).player,
        );

        return HttpResponse.json({
          data: {
            methods: [
              buildMethod("method-1", "Shark fishing", "shark-fishing", 1001),
            ],
            page: 1,
            perPage: 10,
            total: 1,
          },
        });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<Home />);

    await screen.findByRole("link", { name: "Shark fishing" });
    expect(seenPlayerBodies.some((player) => player !== undefined)).toBe(true);

    await user.click(screen.getByRole("button", { name: /show filters/i }));
    const usernameDataSwitch = screen.getByRole("switch", {
      name: /use username data/i,
    });

    expect(usernameDataSwitch).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByText("Filter methods by your fetched stats."),
    ).toBeInTheDocument();

    await user.click(usernameDataSwitch);

    await waitFor(() => {
      expect(seenPlayerBodies).toContain(undefined);
    });
    expect(usernameDataSwitch).toHaveAttribute("aria-checked", "false");
    expect(
      screen.getByText("Ignore fetched username data and show all methods."),
    ).toBeInTheDocument();

    await user.click(usernameDataSwitch);

    expect(usernameDataSwitch).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByText("Filter methods by your fetched stats."),
    ).toBeInTheDocument();
  });

  it("shows the selected best variant below the method name unless it matches the method name", async () => {
    server.use(
      http.get("*/items", ({ request }) => {
        const requestUrl = new URL(request.url);
        const ids = (requestUrl.searchParams.get("ids") ?? "")
          .split(",")
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value));
        const data = Object.fromEntries(
          ids.map((id) => [
            id,
            {
              name: `Method icon ${id}`,
              iconUrl: `https://example.com/icon-${id}.png`,
            },
          ]),
        );
        return HttpResponse.json({ data });
      }),
      http.post("*/methods/search", () =>
        HttpResponse.json({
          data: {
            methods: [
              buildMethod(
                "method-1",
                "Shark fishing",
                "shark-fishing",
                1001,
                "Tick manipulation",
              ),
              buildMethod(
                "method-2",
                "Rune Dragons",
                "rune-dragons",
                1002,
                "Rune Dragons",
              ),
            ],
            page: 1,
            perPage: 10,
            total: 2,
          },
        }),
      ),
    );

    renderWithProviders(<Home />);

    expect(
      await screen.findByRole("link", { name: "Shark fishing" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Tick manipulation")).toBeInTheDocument();
    expect(
      screen.queryByText("Rune Dragons", { selector: "p" }),
    ).not.toBeInTheDocument();
  });

  it("persists selected table fields for the active session and clears them after logout", async () => {
    window.sessionStorage.clear();

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

    server.use(
      http.post("*/methods/search", () =>
        HttpResponse.json({
          data: {
            methods: [
              buildMethod("method-1", "Shark fishing", "shark-fishing", 1001),
            ],
            page: 1,
            perPage: 10,
            total: 1,
          },
        }),
      ),
    );

    const storageKey = getMethodsTableColumnStorageKey("user-1", false);
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(<Home />);

    await screen.findByRole("link", { name: "Shark fishing" });
    expect(
      screen.getByRole("columnheader", { name: "Members" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Market impact" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Table Fields" }));
    expect(
      screen.getByRole("checkbox", { name: /Method Name/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: /Market impact/i }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /Click Intensity/i }),
    ).not.toBeChecked();
    const tableFieldsList = screen.getByRole("list", { name: "Table fields" });
    fireEvent.dragStart(screen.getByRole("button", { name: "Reorder Tags" }));
    fireEvent.dragOver(screen.getByRole("listitem", { name: "Gp/Hr" }));
    fireEvent.drop(tableFieldsList);
    fireEvent.dragEnd(screen.getByRole("button", { name: "Reorder Tags" }));
    await user.click(screen.getByRole("checkbox", { name: /Members/i }));

    const reorderedHeaders = screen
      .getAllByRole("columnheader")
      .map((column) => column.textContent?.trim());
    expect(reorderedHeaders.slice(0, 3)).toEqual([
      "Method Name",
      "Tags",
      "Gp/Hr",
    ]);

    expect(
      screen.queryByRole("columnheader", { name: "Market impact" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Members" }),
    ).not.toBeInTheDocument();
    const storedState = JSON.parse(
      window.sessionStorage.getItem(storageKey) ?? "{}",
    );
    expect(storedState.orderedColumnIds.slice(0, 3)).toEqual([
      "methodName",
      "tags",
      "gpPerHr",
    ]);
    expect(storedState.visibleColumnIds).toContain("methodName");
    expect(storedState.visibleColumnIds).not.toContain("members");
    expect(storedState.visibleColumnIds).not.toContain("liquidityScore");
    expect(storedState.visibleColumnIds).not.toContain("clickIntensity");

    rerender(<Home />);
    expect(
      screen.queryByRole("columnheader", { name: "Market impact" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Members" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")[1]).toHaveTextContent("Tags");

    authProviderModule.__setAuthMockState({
      session: null,
      user: null,
    });
    rerender(<Home />);

    expect(window.sessionStorage.getItem(storageKey)).toBeNull();

    authProviderModule.__setAuthMockState({
      session: {
        access_token: "token-2",
      },
      user: {
        id: "user-1",
        email: "test@example.com",
      },
    });
    rerender(<Home />);

    expect(
      screen.getByRole("columnheader", { name: "Members" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Market impact" }),
    ).not.toBeInTheDocument();
  }, 10000);

  it(
    "restores default table field visibility and order",
    async () => {
      window.sessionStorage.clear();

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

      server.use(
        http.post("*/methods/search", () =>
          HttpResponse.json({
            data: {
              methods: [
                buildMethod("method-1", "Shark fishing", "shark-fishing", 1001),
              ],
              page: 1,
              perPage: 10,
              total: 1,
            },
          }),
        ),
      );

      const storageKey = getMethodsTableColumnStorageKey("user-1", false);
      const user = userEvent.setup();

      renderWithProviders(<Home />);

      await screen.findByRole("link", { name: "Shark fishing" });
      await user.click(screen.getByRole("button", { name: "Table Fields" }));
      const tableFieldsList = screen.getByRole("list", {
        name: "Table fields",
      });

      fireEvent.dragStart(screen.getByRole("button", { name: "Reorder Tags" }));
      fireEvent.dragOver(screen.getByRole("listitem", { name: "Gp/Hr" }));
      fireEvent.drop(tableFieldsList);
      fireEvent.dragEnd(screen.getByRole("button", { name: "Reorder Tags" }));

      await user.click(
        screen.getByRole("checkbox", { name: /Market impact/i }),
      );
      await user.click(screen.getByRole("checkbox", { name: /Members/i }));

      expect(screen.getAllByRole("columnheader")[1]).toHaveTextContent("Tags");
      expect(
        screen.queryByRole("columnheader", { name: "Members" }),
      ).not.toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Reset to default" }),
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      expect(
        await screen.findByRole("columnheader", { name: "Members" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("columnheader", { name: "Market impact" }),
      ).not.toBeInTheDocument();
      expect(screen.getAllByRole("columnheader")[1]).toHaveTextContent("Gp/Hr");

      const storedState = JSON.parse(
        window.sessionStorage.getItem(storageKey) ?? "{}",
      );
      expect(storedState.orderedColumnIds).toEqual([
        "methodName",
        "gpPerHr",
        "tags",
        "liquidityScore",
        "xpPerHr",
        "clickIntensity",
        "afkiness",
        "requirements",
        "members",
        "likes",
      ]);
      expect(storedState.visibleColumnIds).toEqual([
        "methodName",
        "gpPerHr",
        "tags",
        "xpPerHr",
        "afkiness",
        "requirements",
        "members",
        "likes",
      ]);
    },
    SLOW_INTERACTION_TEST_TIMEOUT_MS,
  );
});
