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
    await user.click(await screen.findByRole("button", { name: "Guardar" }));

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
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(updateRequests).toBe(0);
  });
});
