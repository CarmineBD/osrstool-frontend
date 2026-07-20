import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import App from "@/App";
import { createTestQueryClient } from "../utils/render";

function renderApp() {
  const queryClient = createTestQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

describe("critical flow: password recovery routes", () => {
  it("renders forgot password page and sends a reset request", async () => {
    const requestPasswordReset = vi.fn(async () => null);
    const authProviderModule = await import("@/auth/AuthProvider");
    authProviderModule.__setAuthMockState({
      requestPasswordReset,
    });

    window.history.pushState({}, "", "/forgot-password");
    renderApp();

    expect(await screen.findByText("Reset password")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(requestPasswordReset).toHaveBeenCalledWith("user@example.com");
    expect(
      await screen.findByText(
        "If an account exists for that email, a password reset link has been sent."
      )
    ).toBeInTheDocument();
  });

  it("renders the recovery form when the session is in recovery mode", async () => {
    const updatePassword = vi.fn(async () => null);
    const authProviderModule = await import("@/auth/AuthProvider");
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
      isRecoveryMode: true,
      updatePassword,
    });

    window.history.pushState({}, "", "/reset-password");
    renderApp();

    expect(await screen.findByText("Set a new password")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("New password"), "new-password-123");
    await userEvent.type(screen.getByLabelText("Confirm password"), "new-password-123");
    await userEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(updatePassword).toHaveBeenCalledWith("new-password-123");
    expect(
      await screen.findByText(
        "Your password has been updated. You can continue to your account or sign in again."
      )
    ).toBeInTheDocument();
  });

  it("shows a recovery error when the link is not valid anymore", async () => {
    const authProviderModule = await import("@/auth/AuthProvider");
    authProviderModule.__setAuthMockState({
      session: null,
      user: null,
      isRecoveryMode: false,
      isLoading: false,
    });

    window.history.pushState({}, "", "/reset-password");
    renderApp();

    expect(
      await screen.findByText(
        /This recovery link is invalid or has expired\./i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Request a new link" })
    ).toHaveAttribute("href", "/forgot-password");
  });
});
