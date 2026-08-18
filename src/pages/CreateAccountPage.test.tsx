import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createTestQueryClient } from "../../tests/utils/render";
import { CreateAccountPage } from "./CreateAccountPage";
import { CURRENT_TERMS_VERSION } from "@/lib/termsOfUse";

type AuthProviderTestModule = typeof import("@/auth/AuthProvider") & {
  __setAuthMockState: (partial: Record<string, unknown>) => void;
};

function renderCreateAccount(
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
      } = "/create-account",
) {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/create-account" element={<CreateAccountPage />} />
          <Route
            path="/account/authenticated"
            element={<div>Authenticated destination</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CreateAccountPage", () => {
  it("requires Terms of Use acceptance before creating an account", async () => {
    const signUp = vi.fn(async () => ({
      needsEmailConfirmation: false,
      error: null,
    }));
    const authProviderModule =
      (await import("@/auth/AuthProvider")) as AuthProviderTestModule;
    authProviderModule.__setAuthMockState({
      signUp,
      session: null,
      user: null,
      isLoading: false,
    });

    renderCreateAccount({
      pathname: "/create-account",
      state: {
        from: {
          pathname: "/roadmaps",
        },
      },
    });

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Repeat password"), "password123");

    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText(
        "You must accept the Terms of Use to create an account.",
      ),
    ).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();

    await user.click(
      screen.getByLabelText("I have read and accept the current Terms of Use."),
    );
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(screen.getByText("Authenticated destination")).toBeInTheDocument(),
    );

    expect(signUp).toHaveBeenCalledWith(
      "user@example.com",
      "password123",
      CURRENT_TERMS_VERSION,
    );
  });

  it("shows an email confirmation message when signup requires confirmation", async () => {
    const signUp = vi.fn(async () => ({
      needsEmailConfirmation: true,
      error: null,
    }));
    const authProviderModule =
      (await import("@/auth/AuthProvider")) as AuthProviderTestModule;
    authProviderModule.__setAuthMockState({
      signUp,
      session: null,
      user: null,
      isLoading: false,
    });

    renderCreateAccount();

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Repeat password"), "password123");
    await user.click(
      screen.getByLabelText("I have read and accept the current Terms of Use."),
    );
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText(
        "Account created. Check your email to confirm registration. After confirmation, you will continue with account setup.",
      ),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem("rsmethods-pending-post-auth-setup")).toBe(
      "1",
    );
  });

  it("blocks account creation when the repeated password does not match", async () => {
    const signUp = vi.fn(async () => ({
      needsEmailConfirmation: false,
      error: null,
    }));
    const authProviderModule =
      (await import("@/auth/AuthProvider")) as AuthProviderTestModule;
    authProviderModule.__setAuthMockState({
      signUp,
      session: null,
      user: null,
      isLoading: false,
    });

    renderCreateAccount();

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Repeat password"), "password999");
    await user.click(
      screen.getByLabelText("I have read and accept the current Terms of Use."),
    );
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("Passwords do not match."),
    ).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });
});
