import { useQuery } from "@tanstack/react-query";
import { fetchMethods } from "../../lib/api";

export function useMethods(username: string) {
  return useQuery({
    queryKey: ["methods", username],
    queryFn: () => fetchMethods(username),
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
    enabled: !!username,
    retry: false,
  });
}
