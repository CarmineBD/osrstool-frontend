import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { Home } from "@/pages/Home";
import { server } from "../msw/server";
import { renderWithProviders } from "../utils/render";

function buildMethod(id: string, name: string, slug: string) {
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
        label: "Main",
        requirements: {},
        inputs: [],
        outputs: [],
      },
    ],
  };
}

describe("critical flow: list render + filters", () => {
  it("renders methods and applies method-name filtering", async () => {
    const seenNames: string[] = [];

    server.use(
      http.get("*/methods", ({ request }) => {
        const requestUrl = new URL(request.url);
        const name = requestUrl.searchParams.get("name") ?? "";
        seenNames.push(name);

        const methods = name.toLowerCase().includes("dragon")
          ? [buildMethod("method-2", "Dragon bones run", "dragon-bones-run")]
          : [buildMethod("method-1", "Shark fishing", "shark-fishing")];

        return HttpResponse.json({
          data: {
            methods,
            page: 1,
            perPage: 10,
            total: methods.length,
          },
        });
      })
    );

    renderWithProviders(<Home />);

    expect(
      await screen.findByRole("link", { name: "Shark fishing" })
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText("Buscar por nombre de metodo"),
      "dragon"
    );
    await user.click(screen.getByRole("button", { name: "Filtrar" }));

    expect(
      await screen.findByRole("link", { name: "Dragon bones run" })
    ).toBeInTheDocument();
    expect(seenNames).toContain("dragon");
  });
});
