import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
          <Route path="/create-account" element={<div>Create account destination</div>} />
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

  it("shows a friendly invalid credentials message", async () => {
    const signIn = vi.fn(async () => "Invalid login credentials");
    const authProviderModule =
      (await import("@/auth/AuthProvider")) as AuthProviderTestModule;
    authProviderModule.__setAuthMockState({
      signIn,
      session: null,
      user: null,
      isLoading: false,
    });

    renderPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-pass");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("The email or password is incorrect."),
    ).toBeInTheDocument();
  });

  it("offers a create-account shortcut when the user does not exist", async () => {
    const signIn = vi.fn(async () => "User does not exist");
    const authProviderModule =
      (await import("@/auth/AuthProvider")) as AuthProviderTestModule;
    authProviderModule.__setAuthMockState({
      signIn,
      session: null,
      user: null,
      isLoading: false,
    });

    renderPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "missing@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-pass");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const createAccountShortcut = await screen.findByRole("button", {
      name: "Create an account",
    });
    expect(screen.getByText(/No account exists for that email\./)).toBeInTheDocument();

    await user.click(createAccountShortcut);

    expect(
      await screen.findByText("Create account destination"),
    ).toBeInTheDocument();
  });
});
