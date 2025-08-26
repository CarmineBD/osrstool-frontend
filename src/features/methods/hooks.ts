import { useEffect } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchMethods, type MethodsResponse } from "../../lib/api";
import { useUsername } from "@/contexts/UsernameContext";

export function useMethods(
  username?: string,
  page = 1
): UseQueryResult<MethodsResponse, Error> {
  const { setUserError } = useUsername();
  const query = useQuery<MethodsResponse, Error>({
    queryKey: ["methods", username, page],
    queryFn: () => fetchMethods(username, page),
    staleTime: 30 * 1000,
    retry: false,
  });

  useEffect(() => {
    const warning = query.data?.warnings?.[0];
    setUserError(warning?.message ?? null);
  }, [query.data, setUserError]);

  useEffect(() => {
    if (query.error) {
      setUserError("Failed to fetch user");
    }
  }, [query.error, setUserError]);

  return query;
}
