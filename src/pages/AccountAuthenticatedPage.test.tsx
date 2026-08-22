import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { server } from "../../tests/msw/server";
import { createTestQueryClient } from "../../tests/utils/render";
import { AccountAuthenticatedPage } from "./AccountAuthenticatedPage";

type AuthProviderTestModule = typeof import("@/auth/AuthProvider") & {
  __setAuthMockState: (partial: Record<string, unknown>) => void;
};

function renderPage(
  initialEntry:
    | string
    | {
        pathname: string;
        state?: {
          from?: {
            pathname?: string;
            search?: string;
            hash?: string;
          };
        };
      } = "/account/authenticated",
) {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/account/authenticated"
            element={<AccountAuthenticatedPage />}
          />
          <Route
            path="/account/onboarding"
            element={<div>Onboarding destination</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AccountAuthenticatedPage", () => {
  it("shows the confirmation step and continues to onboarding", async () => {
    const authProviderModule =
      (await import("@/auth/AuthProvider")) as AuthProviderTestModule;
    authProviderModule.__setAuthMockState({
      session: {
        access_token: "token-1",
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      },
      user: {
        id: "user-1",
        email: "user@example.com",
      },
      isLoading: false,
    });

    server.use(
      http.get("*/users/me", () =>
        HttpResponse.json({
          data: {
            id: "user-1",
            email: "user@example.com",
            username: null,
            role: "user",
            terms: {
              currentVersion: "v1",
              accepted: true,
            },
          },
        }),
      ),
    );

    renderPage({
      pathname: "/account/authenticated",
      state: {
        from: {
          pathname: "/roadmaps",
        },
      },
    });

    expect(
      await screen.findByText("Your account is ready to continue"),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Continue setup" }),
    );

    expect(
      await screen.findByText("Onboarding destination"),
    ).toBeInTheDocument();
  });
});
