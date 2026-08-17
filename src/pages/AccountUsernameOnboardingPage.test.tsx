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
  it("requires both Terms and RSMethods username when both are missing", async () => {
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

    let accepted = false;
    let accountUsername: string | null = null;
    let submittedUsername = "";
    const calls: string[] = [];

    server.use(
      http.get("*/users/me", () =>
        HttpResponse.json({
          data: {
            id: "user-1",
            email: "user@example.com",
            username: accountUsername,
            role: "user",
            terms: {
              currentVersion: "v1",
              accepted,
            },
          },
        }),
      ),
      http.post("*/users/me/terms/acceptance", () => {
        calls.push("terms");
        accepted = true;

        return HttpResponse.json({
          data: {
            terms: {
              currentVersion: "v1",
              accepted: true,
            },
          },
        });
      }),
      http.post("*/users/me/account-username", async ({ request }) => {
        calls.push("username");
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

    renderOnboarding({
      pathname: "/account/onboarding",
      state: {
        from: {
          pathname: "/roadmaps",
        },
      },
    });

    const user = userEvent.setup();
    const submitButton = await screen.findByRole("button", {
      name: "Complete account",
    });

    expect(submitButton).toBeDisabled();
    expect(screen.queryByLabelText("OSRS username")).not.toBeInTheDocument();

    await user.type(
      screen.getByLabelText("RSMethods username"),
      "Account_User",
    );
    expect(submitButton).toBeDisabled();

    await user.click(
      screen.getByLabelText(
        "I have read and accept the current Terms of Use.",
      ),
    );
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    await waitFor(() =>
      expect(screen.getByText("Roadmaps destination")).toBeInTheDocument(),
    );

    expect(calls).toEqual(["terms", "username"]);
    expect(submittedUsername).toBe("account_user");
  });

  it("shows only the username requirement when Terms are already accepted", async () => {
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

    let submittedUsername = "";
    let acceptedTermsCalls = 0;

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
      http.post("*/users/me/terms/acceptance", () => {
        acceptedTermsCalls += 1;
        return HttpResponse.json({}, { status: 500 });
      }),
      http.post("*/users/me/account-username", async ({ request }) => {
        const body = (await request.json()) as { username?: string };
        submittedUsername = body.username ?? "";

        return HttpResponse.json({
          data: {
            username: submittedUsername,
          },
        });
      }),
    );

    renderOnboarding({
      pathname: "/account/onboarding",
      state: {
        from: {
          pathname: "/roadmaps",
        },
      },
    });

    const user = userEvent.setup();
    expect(
      await screen.findByLabelText("RSMethods username"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(
        "I have read and accept the current Terms of Use.",
      ),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("RSMethods username"), "new_user");
    await user.click(screen.getByRole("button", { name: "Complete account" }));

    await waitFor(() =>
      expect(screen.getByText("Roadmaps destination")).toBeInTheDocument(),
    );

    expect(submittedUsername).toBe("new_user");
    expect(acceptedTermsCalls).toBe(0);
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
            terms: {
              currentVersion: "v1",
              accepted: true,
            },
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
      await screen.findByLabelText("RSMethods username"),
      "account_user",
    );
    await user.click(screen.getByRole("button", { name: "Complete account" }));

    expect(
      await screen.findByText("This account username is already taken."),
    ).toBeInTheDocument();
  });
});
