import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { MethodUpsert } from "@/pages/MethodUpsert";
import { server } from "../msw/server";
import { renderWithProviders } from "../utils/render";

describe("critical flow: create/edit form validations", () => {
  it("validates required fields in create mode", async () => {
    let createRequests = 0;

    server.use(
      http.post("*/methods", () => {
        createRequests += 1;
        return HttpResponse.json({}, { status: 201 });
      })
    );

    renderWithProviders(
      <Routes>
        <Route path="/moneyMakingMethod/new" element={<MethodUpsert mode="create" />} />
      </Routes>,
      { route: "/moneyMakingMethod/new" }
    );

    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Create method" })
    );

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(await screen.findByText("Category is required")).toBeInTheDocument();
    expect(createRequests).toBe(0);
  });

  it("validates required fields in edit mode", async () => {
    let updateRequests = 0;

    server.use(
      http.get("*/methods/slug/:slug", ({ params }) =>
        HttpResponse.json({
          data: {
            method: {
              id: "method-1",
              slug: params.slug,
              name: "Rune dragons",
              category: "combat",
              description: "Safe setup",
              enabled: true,
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
        })
      ),
      http.put("*/methods/:methodId", () => {
        updateRequests += 1;
        return HttpResponse.json({}, { status: 200 });
      }),
      http.put("*/methods/:methodId/basic", () => {
        updateRequests += 1;
        return HttpResponse.json({}, { status: 200 });
      })
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/moneyMakingMethod/:slug/edit"
          element={<MethodUpsert mode="edit" />}
        />
      </Routes>,
      { route: "/moneyMakingMethod/rune-dragons/edit" }
    );

    const nameInput = await screen.findByDisplayValue("Rune dragons");
    const user = userEvent.setup();
    await user.clear(nameInput);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(updateRequests).toBe(0);
  });

  it("requires method and variant icon selection in create mode", async () => {
    let createRequests = 0;

    server.use(
      http.post("*/methods", () => {
        createRequests += 1;
        return HttpResponse.json({}, { status: 201 });
      })
    );

    renderWithProviders(
      <Routes>
        <Route path="/moneyMakingMethod/new" element={<MethodUpsert mode="create" />} />
      </Routes>,
      { route: "/moneyMakingMethod/new" }
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Create method" }));

    expect(await screen.findByText("Method icon is required")).toBeInTheDocument();
    expect(await screen.findByText("Variant icon is required")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Actions/hr is required and must be between 0 and 99999 with up to 2 decimals.",
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText("Action type is required.")).toBeInTheDocument();
    expect(createRequests).toBe(0);
  });

  it(
    "shows F2P conflicts from the backend and retries as P2P variants",
    async () => {
    const updateBodies: unknown[] = [];

    server.use(
      http.get("*/methods/slug/:slug", ({ params }) =>
        HttpResponse.json({
          data: {
            method: {
              id: "method-1",
              slug: params.slug,
              name: "Rune dragons",
              category: "combat",
              description: "Safe setup",
              enabled: true,
              icon_id: 4151,
              variants: [
                {
                  id: "variant-1",
                  slug: "main",
                  label: "Main",
                  icon_id: 11284,
                  members: false,
                  actionsPerHour: 42,
                  actionType: "kills",
                  description: "",
                  xpHour: [],
                  requirements: {},
                  inputs: [{ id: 1, quantity: 1 }],
                  outputs: [{ id: 2, quantity: 1 }],
                },
              ],
            },
          },
        }),
      ),
      http.put("*/methods/:methodId", async ({ request }) => {
        const body = await request.json();
        updateBodies.push(body);

        if (updateBodies.length === 1) {
          return HttpResponse.json(
            {
              status: "error",
              error: {
                code: "F2P_VARIANT_CONTAINS_MEMBERS_ITEMS",
                message:
                  "Free-to-play variants cannot include members-only items. Conflicts: Main: Abyssal whip, Membership bond",
                details: {
                  variants: [
                    {
                      variantTitle: "Main",
                      membersOnlyItems: [
                        { id: 100, name: "Abyssal whip" },
                        { id: 101, name: "Membership bond" },
                      ],
                    },
                  ],
                },
              },
            },
            { status: 400 },
          );
        }

        return HttpResponse.json({
          data: {
            method: {
              id: "method-1",
              slug: "rune-dragons",
              name: "Rune dragons",
              category: "combat",
              description: "Safe setup",
              enabled: true,
              icon_id: 4151,
              variants: [
                {
                  id: "variant-1",
                  slug: "main",
                  label: "Main",
                  icon_id: 11284,
                  members: true,
                  actionsPerHour: 42,
                  actionType: "kills",
                  description: "Updated variant note",
                  xpHour: [],
                  requirements: {},
                  inputs: [{ id: 1, quantity: 1 }],
                  outputs: [{ id: 2, quantity: 1 }],
                },
              ],
            },
          },
        });
      }),
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/moneyMakingMethod/:slug/edit"
          element={<MethodUpsert mode="edit" />}
        />
        <Route
          path="/moneyMakingMethod/:slug"
          element={<p>Saved detail page</p>}
        />
      </Routes>,
      { route: "/moneyMakingMethod/rune-dragons/edit" },
    );

    const user = userEvent.setup();
    await user.type(
      await screen.findByPlaceholderText("Describe this variant"),
      "Updated variant note",
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByRole("heading", {
        name: "Some free-to-play variants use members items",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Free-to-play variants cannot include members-only items\./,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Blocking items")).toBeInTheDocument();
    expect(screen.getByText("Abyssal whip")).toBeInTheDocument();
    expect(screen.getByText("Membership bond")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Retry as P2P variants" }),
    );

    expect(await screen.findByText("Saved detail page")).toBeInTheDocument();
    expect(updateBodies).toHaveLength(2);
    expect(
      (updateBodies[1] as { variants?: Array<{ members?: boolean }> })
        .variants?.[0]?.members,
    ).toBe(true);
    },
    10000,
  );
});
