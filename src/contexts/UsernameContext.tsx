import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface UsernameContextValue {
  username: string;
  setUsername: (value: string) => void;
  userError: string | null;
  setUserError: (value: string | null) => void;
}

const UsernameContext = createContext<UsernameContextValue | undefined>(undefined);

export type Props = { children: ReactNode };

export function UsernameProvider({ children }: Props) {
  const [username, setUsernameState] = useState<string>("");
  const [userError, setUserError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) {
      setUsernameState(stored);
    }
  }, []);

  const setUsername = (value: string) => {
    setUsernameState(value);
    localStorage.setItem("username", value);
  };

  return (
    <UsernameContext.Provider value={{ username, setUsername, userError, setUserError }}>
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
