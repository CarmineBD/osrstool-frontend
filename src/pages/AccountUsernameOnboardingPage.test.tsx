import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { server } from "../../tests/msw/server";
import { createTestQueryClient } from "../../tests/utils/render";
import { AccountUsernameOnboardingPage } from "./AccountUsernameOnboardingPage";

type AuthProviderTestModule = typeof import("@/auth/AuthProvider") & {
  __setAuthMockState: (partial: Record<string, unknown>) => void;
};

function renderOnboarding(
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
      } = "/account/onboarding",
) {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/account/onboarding"
            element={<AccountUsernameOnboardingPage />}
          />
          <Route path="/roadmaps" element={<div>Roadmaps destination</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AccountUsernameOnboardingPage", () => {
  it("saves the account username, redirects to the intended destination, and leaves OSRS username storage untouched", async () => {
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

    let accountUsername: string | null = null;
    let submittedUsername = "";

    server.use(
      http.get("*/users/me", () =>
        HttpResponse.json({
          data: {
            id: "user-1",
            email: "user@example.com",
            username: accountUsername,
            role: "user",
          },
        }),
      ),
      http.post("*/users/me/account-username", async ({ request }) => {
        const body = (await request.json()) as { username?: string };
        submittedUsername = body.username ?? "";
        accountUsername = submittedUsername;

        return HttpResponse.json({
          data: {
            username: accountUsername,
          },
        });
      }),
    );

    window.localStorage.setItem("username", "Zezima");

    renderOnboarding({
      pathname: "/account/onboarding",
      state: {
        from: {
          pathname: "/roadmaps",
        },
      },
    });

    const user = userEvent.setup();
    await user.type(
      await screen.findByLabelText("Account username"),
      "Account_User",
    );
    await user.click(
      screen.getByRole("button", { name: "Save account username" }),
    );

    await waitFor(() =>
      expect(screen.getByText("Roadmaps destination")).toBeInTheDocument(),
    );

    expect(submittedUsername).toBe("account_user");
    expect(window.localStorage.getItem("username")).toBe("Zezima");
  });

  it("shows a clear conflict error when the username is already taken", async () => {
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
          },
        }),
      ),
      http.post("*/users/me/account-username", () =>
        HttpResponse.json(
          {
            message: "Account username is already taken",
          },
          { status: 409 },
        ),
      ),
    );

    renderOnboarding();

    const user = userEvent.setup();
    await user.type(
      await screen.findByLabelText("Account username"),
      "account_user",
    );
    await user.click(
      screen.getByRole("button", { name: "Save account username" }),
    );

    expect(
      await screen.findByText("This account username is already taken."),
    ).toBeInTheDocument();
  });
});
