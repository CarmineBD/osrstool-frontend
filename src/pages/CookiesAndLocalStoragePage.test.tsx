import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../tests/utils/render";
import { CookiesAndLocalStoragePage } from "./CookiesAndLocalStoragePage";

describe("CookiesAndLocalStoragePage", () => {
  it("documents detected frontend storage and the absence of analytics", () => {
    renderWithProviders(<CookiesAndLocalStoragePage />, {
      route: "/cookies-and-local-storage",
    });

    expect(
      screen.getByRole("heading", { name: "Cookies and Local Storage" }),
    ).toBeInTheDocument();
    expect(screen.getByText("rsmethods-theme")).toBeInTheDocument();
    expect(
      screen.getByText("sb-<supabase-project-ref>-auth-token"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /RSMethods does not currently set first-party cookies from its own frontend code\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /The current frontend does not load analytics, advertising, or cross-site tracking tools automatically\./i,
      ),
    ).toBeInTheDocument();
  });
});
