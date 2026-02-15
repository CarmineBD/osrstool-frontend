import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./msw/server";

type AuthSession = {
  access_token?: string;
  user?: {
    id?: string;
    email?: string;
  };
};

type AuthState = {
  session: AuthSession | null;
  user: AuthSession["user"] | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{
    needsEmailConfirmation: boolean;
    error: string | null;
  }>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<string | null>;
};

const defaultAuthState: AuthState = {
  session: null,
  user: null,
  isLoading: false,
  signUp: async () => ({ needsEmailConfirmation: false, error: null }),
  signIn: async () => null,
  signOut: async () => null,
};

const authState: AuthState = {
  ...defaultAuthState,
};

type UsernameState = {
  username: string;
  userError: string | null;
};

const usernameState: UsernameState = {
  username: "",
  userError: null,
};

const setUsernameSpy = vi.fn((value: string) => {
  usernameState.username = value.trim();
});

const clearUsernameSpy = vi.fn(() => {
  usernameState.username = "";
  usernameState.userError = null;
});

const setUserErrorSpy = vi.fn((value: string | null) => {
  usernameState.userError = value;
});

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
    signUp: vi.fn(async () => ({ data: { session: null, user: null }, error: null })),
    signInWithPassword: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
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
    setUsername: setUsernameSpy,
    clearUsername: clearUsernameSpy,
    userError: usernameState.userError,
    setUserError: setUserErrorSpy,
  }),
  UsernameProvider: ({ children }: { children: ReactNode }) => children,
  __setUsernameMockState: (partial: Partial<UsernameState>) => {
    Object.assign(usernameState, partial);
  },
  __resetUsernameMockState: () => {
    usernameState.username = "";
    usernameState.userError = null;
    setUsernameSpy.mockClear();
    clearUsernameSpy.mockClear();
    setUserErrorSpy.mockClear();
  },
  __getUsernameMockSpies: () => ({
    setUsernameSpy,
    clearUsernameSpy,
    setUserErrorSpy,
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

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(async () => {
  cleanup();
  server.resetHandlers();

  const authProviderModule = await import("@/auth/AuthProvider");
  authProviderModule.__resetAuthMockState();

  const usernameContextModule = await import("@/contexts/UsernameContext");
  usernameContextModule.__resetUsernameMockState();
});

afterAll(() => {
  server.close();
});
