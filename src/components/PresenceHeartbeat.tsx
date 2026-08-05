import { useEffect, useRef } from "react";
import {
  getOrCreatePresenceVisitorId,
  PRESENCE_HEARTBEAT_INTERVAL_MS,
  sendPresenceHeartbeat,
} from "@/lib/presence";

export function PresenceHeartbeat() {
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    if (import.meta.env.MODE === "test") {
      return undefined;
    }

    const stopHeartbeatLoop = () => {
      if (intervalRef.current === null) {
        return;
      }

      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };

    const sendHeartbeat = async () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      if ("onLine" in navigator && !navigator.onLine) {
        return;
      }

      try {
        const visitorId = getOrCreatePresenceVisitorId();
        await sendPresenceHeartbeat(visitorId);
      } catch {
        // Best-effort client heartbeat. Temporary failures should stay invisible to users.
      }
    };

    const startHeartbeatLoop = () => {
      if (document.visibilityState === "hidden") {
        stopHeartbeatLoop();
        return;
      }

      if (intervalRef.current !== null) {
        return;
      }

      void sendHeartbeat();
      intervalRef.current = window.setInterval(() => {
        void sendHeartbeat();
      }, PRESENCE_HEARTBEAT_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startHeartbeatLoop();
        return;
      }

      stopHeartbeatLoop();
    };

    const handleForegroundHeartbeat = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void sendHeartbeat();
    };

    handleVisibilityChange();
    window.addEventListener("focus", handleForegroundHeartbeat);
    window.addEventListener("online", handleForegroundHeartbeat);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleForegroundHeartbeat);
      window.removeEventListener("online", handleForegroundHeartbeat);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopHeartbeatLoop();
    };
  }, []);

  return null;
}
