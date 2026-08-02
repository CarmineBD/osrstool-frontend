import { render, waitFor } from "@testing-library/react";
import { AuthApiError } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

describe("AuthProvider", () => {
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
