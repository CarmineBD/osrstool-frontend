import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/auth/AuthProvider";

export interface UsernameContextValue {
  username: string;
  setUsername: (value: string) => void;
  clearUsername: () => void;
  userError: string | null;
  setUserError: (value: string | null) => void;
}

const UsernameContext = createContext<UsernameContextValue | undefined>(undefined);

export type Props = { children: ReactNode };

export function UsernameProvider({ children }: Props) {
  const { session, isLoading } = useAuth();
  const [username, setUsernameState] = useState<string>("");
  const [userError, setUserError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) {
      setUsernameState(stored);
    }
  }, []);

  useEffect(() => {
    if (isLoading || session) return;
    setUsernameState("");
    setUserError(null);
    localStorage.removeItem("username");
  }, [isLoading, session]);

  const setUsername = (value: string) => {
    const normalizedValue = value.trim();
    setUsernameState(normalizedValue);
    if (normalizedValue) {
      localStorage.setItem("username", normalizedValue);
      return;
    }
    localStorage.removeItem("username");
  };

  const clearUsername = () => {
    setUsernameState("");
    setUserError(null);
    localStorage.removeItem("username");
  };

  return (
    <UsernameContext.Provider
      value={{ username, setUsername, clearUsername, userError, setUserError }}
    >
      {children}
    </UsernameContext.Provider>
  );
}

export function useUsername(): UsernameContextValue {
  const ctx = useContext(UsernameContext);
  if (!ctx) {
    throw new Error("useUsername must be used within UsernameProvider");
  }
  return ctx;
}
