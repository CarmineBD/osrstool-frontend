import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/auth/AuthProvider";
import { fetchPlayerInfo, type PlayerInfo } from "@/lib/api";
import { normalizeBoundedText, USERNAME_MAX_LENGTH } from "@/lib/validation";

const PLAYER_STORAGE_KEY = "rsmethods-osrs-player";
const PLAYER_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MANUAL_LOOKUP_COOLDOWN_MS = 60 * 1000;

export interface StoredOsrsPlayer {
  username: string;
  player: PlayerInfo;
  fetchedAt: number;
}

export interface UsernameContextValue {
  username: string;
  player: PlayerInfo | null;
  fetchedAt: number | null;
  lookupPlayer: (username: string) => Promise<PlayerInfo | null>;
  refreshPlayer: () => Promise<PlayerInfo | null>;
  isPlayerLookupPending: boolean;
  manualLookupCooldownRemaining: number;
  clearUsername: () => void;
  userError: string | null;
  setUserError: (value: string | null) => void;
}

const UsernameContext = createContext<UsernameContextValue | undefined>(
  undefined,
);
export type Props = { children: ReactNode };

function readStoredPlayer(): StoredOsrsPlayer | null {
  try {
    const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredOsrsPlayer>;
    const player = value.player as Partial<PlayerInfo> | undefined;
    if (
      typeof value.username !== "string" ||
      typeof value.fetchedAt !== "number" ||
      !player ||
      typeof player.levels !== "object" ||
      player.levels === null ||
      typeof player.experience !== "object" ||
      player.experience === null ||
      typeof player.quests !== "object" ||
      player.quests === null ||
      typeof player.achievement_diaries !== "object" ||
      player.achievement_diaries === null
    ) {
      return null;
    }
    return value as StoredOsrsPlayer;
  } catch {
    return null;
  }
}

export function UsernameProvider({ children }: Props) {
  const { session } = useAuth();
  const [storedPlayer, setStoredPlayer] = useState<StoredOsrsPlayer | null>(
    readStoredPlayer,
  );
  const [userError, setUserError] = useState<string | null>(null);
  const [isPlayerLookupPending, setIsPlayerLookupPending] = useState(false);
  const [manualLookupUntil, setManualLookupUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const savePlayer = (next: StoredOsrsPlayer) => {
    setStoredPlayer(next);
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem("username", next.username);
  };

  const fetchAndStore = async (
    candidate: string,
    manual: boolean,
  ): Promise<PlayerInfo | null> => {
    const username = normalizeBoundedText(
      candidate.trim(),
      USERNAME_MAX_LENGTH,
    );
    if (!username) {
      setUserError("Enter an OSRS username.");
      return null;
    }
    if (!session) {
      setUserError("Sign in to fetch OSRS player data.");
      return null;
    }
    if (manual && Date.now() < manualLookupUntil) return null;

    if (manual) setManualLookupUntil(Date.now() + MANUAL_LOOKUP_COOLDOWN_MS);
    setIsPlayerLookupPending(true);
    setUserError(null);
    try {
      const player = await fetchPlayerInfo(username);
      savePlayer({ username, player, fetchedAt: Date.now() });
      return player;
    } catch (error) {
      setUserError(
        error instanceof Error
          ? error.message
          : "Unable to fetch OSRS player data.",
      );
      return null;
    } finally {
      setIsPlayerLookupPending(false);
    }
  };

  useEffect(() => {
    if (
      !session ||
      !storedPlayer ||
      Date.now() - storedPlayer.fetchedAt < PLAYER_MAX_AGE_MS
    )
      return;
    void fetchAndStore(storedPlayer.username, false);
  }, [session, storedPlayer?.fetchedAt, storedPlayer?.username]);

  const clearUsername = () => {
    setStoredPlayer(null);
    setUserError(null);
    localStorage.removeItem("username");
    localStorage.removeItem(PLAYER_STORAGE_KEY);
  };

  const manualLookupCooldownRemaining = Math.max(0, manualLookupUntil - now);
  const value = useMemo<UsernameContextValue>(
    () => ({
      username: storedPlayer?.username ?? "",
      player: storedPlayer?.player ?? null,
      fetchedAt: storedPlayer?.fetchedAt ?? null,
      lookupPlayer: (username) => fetchAndStore(username, true),
      refreshPlayer: () => fetchAndStore(storedPlayer?.username ?? "", true),
      isPlayerLookupPending,
      manualLookupCooldownRemaining,
      clearUsername,
      userError,
      setUserError,
    }),
    [
      storedPlayer,
      isPlayerLookupPending,
      manualLookupCooldownRemaining,
      userError,
    ],
  );

  return (
    <UsernameContext.Provider value={value}>
      {children}
    </UsernameContext.Provider>
  );
}

export function useUsername(): UsernameContextValue {
  const ctx = useContext(UsernameContext);
  if (!ctx) throw new Error("useUsername must be used within UsernameProvider");
  return ctx;
}
