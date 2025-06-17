// src/features/methods/hooks.ts
import { useQuery } from "@tanstack/react-query";
import { fetchMethods } from "./api";

export function useMethods(username?: string, page = 1) {
  return useQuery({
    queryKey: ["methods", username, page],
    queryFn: () => fetchMethods({ username, page }),
    keepPreviousData: true,
  });
}
