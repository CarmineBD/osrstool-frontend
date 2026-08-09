import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { fetchMe, ME_QUERY_KEY, type MeResponse } from "@/lib/me";
import { QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";

export function useMe() {
  const { session } = useAuth();

  return useQuery<MeResponse, Error>({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    enabled: !!session,
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });
}
