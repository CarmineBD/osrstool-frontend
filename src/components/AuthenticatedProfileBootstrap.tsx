import { useLayoutEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { useMe } from "@/hooks/useMe";

export function AuthenticatedProfileBootstrap() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useMe();

  useLayoutEffect(() => {
    const userId = session?.user?.id ?? null;
    const previousUserId = previousUserIdRef.current;

    if (previousUserId !== undefined && previousUserId !== userId) {
      queryClient.clear();
    }

    previousUserIdRef.current = userId;
  }, [queryClient, session?.user?.id]);

  return null;
}
