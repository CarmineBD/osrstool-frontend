import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import type { PlayerInfo } from "@/lib/api";
import { server } from "./msw/server";

type AuthSession = {
  access_token?: string;
  user?: {
    id?: string;
    email?: string;
    user_metadata?: {
      avatar_url?: string;
    };
  };
};

type AuthState = {
  session: AuthSession | null;
  user: AuthSession["user"] | null;
  isLoading: boolean;
  isRecoveryMode: boolean;
  signUp: (
    email: string,
    password: string,
    termsVersion: string,
  ) => Promise<{
    needsEmailConfirmation: boolean;
    error: string | null;
  }>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<string | null>;
  requestPasswordReset: (
    email: string,
    redirectTo?: string,
  ) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
};

const defaultAuthState: AuthState = {
  session: null,
  user: null,
  isLoading: false,
  isRecoveryMode: false,
  signUp: async () => ({ needsEmailConfirmation: false, error: null }),
  signIn: async () => null,
  signInWithGoogle: async () => null,
  signOut: async () => null,
  requestPasswordReset: async () => null,
  updatePassword: async () => null,
};

const authState: AuthState = {
  ...defaultAuthState,
};

type UsernameState = {
  username: string;
  player: PlayerInfo | null;
  userError: string | null;
};

const usernameState: UsernameState = {
  username: "",
  player: null,
  userError: null,
};

const clearUsernameSpy = vi.fn(() => {
  usernameState.username = "";
  usernameState.userError = null;
});

const setUserErrorSpy = vi.fn((value: string | null) => {
  usernameState.userError = value;
});
const lookupPlayerSpy = vi.fn(async (): Promise<PlayerInfo> => ({
  levels: {},
  experience: {},
  quests: {},
  achievement_diaries: {},
}));

vi.mock("@/lib/supabaseClient", () => {
  const sessionRef: { current: AuthSession | null } = { current: null };

  const auth = {
    getSession: vi.fn(async () => ({
      data: { session: sessionRef.current },
      error: null,
    })),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: () => undefined } },
    })),
    signUp: vi.fn(async () => ({
      data: { session: null, user: null },
      error: null,
    })),
    signInWithPassword: vi.fn(async () => ({ error: null })),
    signInWithOAuth: vi.fn(async () => ({
      data: { provider: "google", url: null },
      error: null,
    })),
    signOut: vi.fn(async () => ({ error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    updateUser: vi.fn(async () => ({ error: null })),
  };

  return {
    supabase: { auth },
    __setSupabaseSession: (session: AuthSession | null) => {
      sessionRef.current = session;
    },
  };
});

vi.mock("@/auth/AuthProvider", () => ({
  useAuth: () => authState,
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  __setAuthMockState: (partial: Partial<AuthState>) => {
    Object.assign(authState, partial);
  },
  __resetAuthMockState: () => {
    Object.assign(authState, defaultAuthState);
  },
}));

vi.mock("@/contexts/UsernameContext", () => ({
  useUsername: () => ({
    username: usernameState.username,
    player: usernameState.player,
    fetchedAt: null,
    lookupPlayer: lookupPlayerSpy,
    refreshPlayer: lookupPlayerSpy,
    isPlayerLookupPending: false,
    manualLookupCooldownRemaining: 0,
    manualLookupCooldownUsername: null,
    clearUsername: clearUsernameSpy,
    userError: usernameState.userError,
    setUserError: setUserErrorSpy,
  }),
  UsernameProvider: ({ children }: { children: ReactNode }) => children,
  __setUsernameMockState: (partial: Partial<UsernameState>) => {
    Object.assign(usernameState, partial);
    if (partial.username && partial.player === undefined) {
      usernameState.player = {
        levels: {},
        experience: {},
        quests: {},
        achievement_diaries: {},
      };
    }
  },
  __resetUsernameMockState: () => {
    usernameState.username = "";
    usernameState.player = null;
    usernameState.userError = null;
    clearUsernameSpy.mockClear();
    setUserErrorSpy.mockClear();
    lookupPlayerSpy.mockClear();
  },
  __getUsernameMockSpies: () => ({
    clearUsernameSpy,
    setUserErrorSpy,
    lookupPlayerSpy,
  }),
}));

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (!globalThis.ResizeObserver) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserver;
}

if (!globalThis.IntersectionObserver) {
  class IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds = [];

    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  globalThis.IntersectionObserver = IntersectionObserver;
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(async () => {
  cleanup();
  server.resetHandlers();
  window.localStorage.clear();
  window.sessionStorage.clear();

  const authProviderModule = await import("@/auth/AuthProvider");
  authProviderModule.__resetAuthMockState();

  const usernameContextModule = await import("@/contexts/UsernameContext");
  usernameContextModule.__resetUsernameMockState();

  const accountUsernameRequirementModule =
    await import("@/lib/accountUsernameRequirement");
  accountUsernameRequirementModule.__resetAccountUsernameRequiredNotifications();

  const termsAcceptanceRequirementModule =
    await import("@/lib/termsAcceptanceRequirement");
  termsAcceptanceRequirementModule.__resetTermsAcceptanceRequiredNotifications();
});

afterAll(() => {
  server.close();
});
