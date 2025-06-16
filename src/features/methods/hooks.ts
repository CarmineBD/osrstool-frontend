// src/features/methods/hooks.ts
import { useQuery } from "@tanstack/react-query";
import { fetchMethods } from "../../lib/api";
export function useMethods() {
  return useQuery({
    queryKey: ["methods"],
    queryFn: fetchMethods,
    refetchInterval: 60 * 1000, // 60 s
    staleTime: 30 * 1000, // 30 s
  });
}
