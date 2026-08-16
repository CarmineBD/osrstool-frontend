import { render, waitFor } from "@testing-library/react";
import { AuthApiError } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { CURRENT_TERMS_VERSION } from "@/lib/termsOfUse";

describe("AuthProvider", () => {
  it("stores the accepted terms version in Supabase Auth metadata during sign-up", async () => {
    const authProviderModule =
      await vi.importActual<typeof import("@/auth/AuthProvider")>(
        "@/auth/AuthProvider"
      );
    const { AuthProvider, useAuth } = authProviderModule;
    const supabaseClientModule = await import("@/lib/supabaseClient");
    const signUp = vi.mocked(supabaseClientModule.supabase.auth.signUp);
    let registerWithEmail: ((email: string, password: string, termsVersion: string) => Promise<{
      needsEmailConfirmation: boolean;
      error: string | null;
    }>) | undefined;

    signUp.mockClear();

    function Consumer() {
      registerWithEmail = useAuth().signUp;
      return null;
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(registerWithEmail).toBeTypeOf("function"));
    if (!registerWithEmail) {
      throw new Error("Sign-up method was not exposed.");
    }

    const result = await registerWithEmail(
      "user@example.com",
      "hunter2",
      CURRENT_TERMS_VERSION
    );

    expect(result).toEqual({
      needsEmailConfirmation: false,
      error: null,
    });
    expect(signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "hunter2",
      options: {
        data: {
          termsOfUseVersion: CURRENT_TERMS_VERSION,
        },
      },
    });
  });

  it("starts Google OAuth with the current origin as callback", async () => {
    const authProviderModule =
      await vi.importActual<typeof import("@/auth/AuthProvider")>(
        "@/auth/AuthProvider"
      );
    const { AuthProvider, useAuth } = authProviderModule;
    const supabaseClientModule = await import("@/lib/supabaseClient");
    const signInWithOAuth = vi.mocked(supabaseClientModule.supabase.auth.signInWithOAuth);
    let signInWithGoogle: (() => Promise<string | null>) | undefined;

    signInWithOAuth.mockClear();

    function Consumer() {
      signInWithGoogle = useAuth().signInWithGoogle;
      return null;
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(signInWithGoogle).toBeTypeOf("function"));
    if (!signInWithGoogle) {
      throw new Error("Google sign-in method was not exposed.");
    }

    const result = await signInWithGoogle();

    expect(result).toBeNull();
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
  });

  it("returns the Supabase error message when Google OAuth cannot start", async () => {
    const authProviderModule =
      await vi.importActual<typeof import("@/auth/AuthProvider")>(
        "@/auth/AuthProvider"
      );
    const { AuthProvider, useAuth } = authProviderModule;
    const supabaseClientModule = await import("@/lib/supabaseClient");
    const signInWithOAuth = vi.mocked(supabaseClientModule.supabase.auth.signInWithOAuth);
    let signInWithGoogle: (() => Promise<string | null>) | undefined;

    signInWithOAuth.mockClear();
    const oauthError = new AuthApiError(
      "Google OAuth is unavailable.",
      500,
      "unexpected_failure"
    );
    signInWithOAuth.mockResolvedValueOnce({
      data: { provider: "google", url: null },
      error: oauthError,
    });

    function Consumer() {
      signInWithGoogle = useAuth().signInWithGoogle;
      return null;
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(signInWithGoogle).toBeTypeOf("function"));
    if (!signInWithGoogle) {
      throw new Error("Google sign-in method was not exposed.");
    }

    await expect(signInWithGoogle()).resolves.toBe("Google OAuth is unavailable.");
  });
});
