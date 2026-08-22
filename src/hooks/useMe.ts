import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { fetchMe, getMeQueryKey, type MeResponse } from "@/lib/me";
import { QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";

export function useMe() {
  const { session } = useAuth();

  return useQuery<MeResponse, Error>({
    queryKey: getMeQueryKey(session?.user?.id),
    queryFn: fetchMe,
    enabled: !!session,
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });
}
