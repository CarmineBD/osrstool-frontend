import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { getGoogleAuthRedirectTo } from "@/lib/authRedirect";

const RECOVERY_MODE_STORAGE_KEY = "rsmethods-recovery-mode";
const LEGACY_RECOVERY_MODE_STORAGE_KEY = "gp-now-recovery-mode";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isRecoveryMode: boolean;
  signUp: (email: string, password: string, termsVersion: string) => Promise<{
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

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const syncRecoveryMode = useCallback((nextValue: boolean) => {
    setIsRecoveryMode(nextValue);

    if (typeof window === "undefined") return;

    if (nextValue) {
      window.sessionStorage.setItem(RECOVERY_MODE_STORAGE_KEY, "1");
      window.sessionStorage.removeItem(LEGACY_RECOVERY_MODE_STORAGE_KEY);
      return;
    }

    window.sessionStorage.removeItem(RECOVERY_MODE_STORAGE_KEY);
    window.sessionStorage.removeItem(LEGACY_RECOVERY_MODE_STORAGE_KEY);
  }, []);

  const hasRecoveryParams = useCallback(() => {
    if (typeof window === "undefined") return false;

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("type") === "recovery") {
      return true;
    }

    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );
    return hashParams.get("type") === "recovery";
  }, []);

  const isRecoveryModeStored = useCallback(() => {
    if (typeof window === "undefined") return false;
    return (
      window.sessionStorage.getItem(RECOVERY_MODE_STORAGE_KEY) === "1" ||
      window.sessionStorage.getItem(LEGACY_RECOVERY_MODE_STORAGE_KEY) === "1"
    );
  }, []);

  const resolveRecoveryMode = useCallback(
    (event: AuthChangeEvent | null, nextSession: Session | null) => {
      if (!nextSession) {
        return false;
      }

      if (event === "PASSWORD_RECOVERY") {
        return true;
      }

      if (hasRecoveryParams()) {
        return true;
      }

      return isRecoveryModeStored();
    },
    [hasRecoveryParams, isRecoveryModeStored],
  );

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (!error) {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        syncRecoveryMode(resolveRecoveryMode(null, data.session));
      }
      setIsLoading(false);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      syncRecoveryMode(resolveRecoveryMode(event, nextSession));
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [resolveRecoveryMode, syncRecoveryMode]);

  const signUp = useCallback(
    async (email: string, password: string, termsVersion: string) => {
      const redirectTo = getGoogleAuthRedirectTo();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
          data: {
            termsOfUseVersion: termsVersion,
          },
        },
      });
      if (error) {
        return { needsEmailConfirmation: false, error: error.message };
      }

      const needsEmailConfirmation =
        !data.session && Boolean(data.user?.identities?.length);
      return { needsEmailConfirmation, error: null };
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error ? error.message : null;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = getGoogleAuthRedirectTo();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: redirectTo ? { redirectTo } : undefined,
    });

    return error ? error.message : null;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      syncRecoveryMode(false);
    }
    return error ? error.message : null;
  }, [syncRecoveryMode]);

  const requestPasswordReset = useCallback(
    async (email: string, redirectTo?: string) => {
      const fallbackRedirectTo =
        typeof window === "undefined"
          ? undefined
          : `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo?.trim() || fallbackRedirectTo,
      });

      return error ? error.message : null;
    },
    [],
  );

  const updatePassword = useCallback(
    async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) {
        syncRecoveryMode(false);
      }

      return error ? error.message : null;
    },
    [syncRecoveryMode],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isLoading,
      isRecoveryMode,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [
      isLoading,
      isRecoveryMode,
      requestPasswordReset,
      session,
      signIn,
      signInWithGoogle,
      signOut,
      signUp,
      updatePassword,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
