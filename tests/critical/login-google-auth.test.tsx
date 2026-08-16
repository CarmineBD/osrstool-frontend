import { render, screen, waitFor } from "@testing-library/react";
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

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;

  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

describe("critical flow: Google auth entrypoint", () => {
  it("renders the Google button and starts the OAuth flow from login", async () => {
    const signInWithGoogle = vi.fn(async () => null);
    const authProviderModule = await import("@/auth/AuthProvider");
    authProviderModule.__setAuthMockState({
      signInWithGoogle,
      session: null,
      user: null,
      isLoading: false,
    });

    window.history.pushState({}, "", "/login");
    renderApp();

    const googleButton = await screen.findByRole("button", {
      name: "Continue with Google",
    });

    expect(screen.getByText("Or continue with email")).toBeInTheDocument();

    await userEvent.click(googleButton);

    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it("disables auth actions while Google OAuth is starting", async () => {
    const deferred = createDeferredPromise<string | null>();
    const signInWithGoogle = vi.fn(() => deferred.promise);
    const authProviderModule = await import("@/auth/AuthProvider");
    authProviderModule.__setAuthMockState({
      signInWithGoogle,
      session: null,
      user: null,
      isLoading: false,
    });

    window.history.pushState({}, "", "/login");
    renderApp();

    const googleButton = await screen.findByRole("button", {
      name: "Continue with Google",
    });

    await userEvent.click(googleButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Connecting..." })).toBeDisabled();
    });

    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create account" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Connecting..." }));

    expect(signInWithGoogle).toHaveBeenCalledTimes(1);

    deferred.resolve(null);
  });

  it("shows Google OAuth errors without leaving the page", async () => {
    const signInWithGoogle = vi.fn(async () => "Google OAuth is unavailable.");
    const authProviderModule = await import("@/auth/AuthProvider");
    authProviderModule.__setAuthMockState({
      signInWithGoogle,
      session: null,
      user: null,
      isLoading: false,
    });

    window.history.pushState({}, "", "/login");
    renderApp();

    await userEvent.click(
      await screen.findByRole("button", { name: "Continue with Google" })
    );

    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText("Google OAuth is unavailable.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue with Google" })
    ).toBeEnabled();
  });
});
