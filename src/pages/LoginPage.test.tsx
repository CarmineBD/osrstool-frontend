import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createTestQueryClient } from "../../tests/utils/render";
import { LoginPage } from "./LoginPage";

type AuthProviderTestModule = typeof import("@/auth/AuthProvider") & {
  __setAuthMockState: (partial: Record<string, unknown>) => void;
};

function renderPage() {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/account/authenticated"
            element={<div>Authenticated destination</div>}
          />
          <Route path="/account" element={<div>Account destination</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LoginPage", () => {
  it("routes pending post-auth setup sessions to the confirmation screen", async () => {
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

    window.localStorage.setItem("rsmethods-pending-post-auth-setup", "1");

    renderPage();

    expect(
      await screen.findByText("Authenticated destination"),
    ).toBeInTheDocument();
    expect(
      window.localStorage.getItem("rsmethods-pending-post-auth-setup"),
    ).toBeNull();
  });
});
