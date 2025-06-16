// src/features/methods/hooks.ts
import { useQuery } from "@tanstack/react-query";
import { fetchMethods } from "../../lib/api";

export function useMethods(username?: string) {
  return useQuery({
    queryKey: ["methods", username],
    queryFn: () => fetchMethods(username),
    refetchInterval: 60 * 1000, // 60 s
    staleTime: 30 * 1000, // 30 s
  });
}
