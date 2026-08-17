import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { server } from "../../tests/msw/server";
import { createTestQueryClient } from "../../tests/utils/render";
import { AcceptTermsPage } from "./AcceptTermsPage";

type AuthProviderTestModule = typeof import("@/auth/AuthProvider") & {
  __setAuthMockState: (partial: Record<string, unknown>) => void;
};

function renderAcceptTerms(
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
      } = "/accept-terms",
) {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/accept-terms" element={<AcceptTermsPage />} />
          <Route path="/roadmaps" element={<div>Roadmaps destination</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AcceptTermsPage", () => {
  it("reuses onboarding and handles the terms-only requirement", async () => {
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
    let usernameSubmissionCount = 0;

    server.use(
      http.get("*/users/me", () =>
        HttpResponse.json({
          data: {
            id: "user-1",
            email: "user@example.com",
            username: "account_user",
            role: "user",
            terms: {
              currentVersion: "v1",
              accepted,
            },
          },
        }),
      ),
      http.post("*/users/me/terms/acceptance", () => {
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
      http.post("*/users/me/account-username", () => {
        usernameSubmissionCount += 1;
        return HttpResponse.json({}, { status: 500 });
      }),
    );

    renderAcceptTerms({
      pathname: "/accept-terms",
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

    expect(screen.queryByLabelText("RSMethods username")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("OSRS username")).not.toBeInTheDocument();
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

    expect(usernameSubmissionCount).toBe(0);
  });
});
