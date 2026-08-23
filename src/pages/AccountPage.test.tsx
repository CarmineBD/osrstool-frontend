import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../tests/msw/server";
import { renderWithProviders } from "../../tests/utils/render";
import { AccountPage } from "./AccountPage";

type AuthProviderTestModule = typeof import("@/auth/AuthProvider") & {
  __setAuthMockState: (partial: Record<string, unknown>) => void;
};

type UsernameContextTestModule = typeof import("@/contexts/UsernameContext") & {
  __getUsernameMockSpies: () => {
    clearUsernameSpy: ReturnType<typeof vi.fn>;
  };
};

describe("AccountPage", () => {
  it("shows a destructive delete button and deletes the account after confirmation", async () => {
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

    const usernameContextModule =
      (await import("@/contexts/UsernameContext")) as UsernameContextTestModule;
    const usernameSpies = usernameContextModule.__getUsernameMockSpies();
    const supabaseModule = await import("@/lib/supabaseClient");
    vi.mocked(supabaseModule.supabase.auth.signOut).mockClear();

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
      http.delete("*/users/me", () =>
        HttpResponse.json({
          data: {
            deleted: true,
          },
        }),
      ),
    );

    renderWithProviders(<AccountPage />, { route: "/account" });

    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Delete account" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Delete account?" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete account" }));

    await waitFor(() => {
      expect(usernameSpies.clearUsernameSpy).toHaveBeenCalledTimes(1);
      expect(supabaseModule.supabase.auth.signOut).toHaveBeenCalledWith({
        scope: "local",
      });
    });
  });
});
