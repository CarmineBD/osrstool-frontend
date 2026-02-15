import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  fetchMethods,
  likeMethod,
  unlikeMethod,
  type Method,
  type MethodDetailResponse,
  type MethodsFilters,
  type MethodsResponse,
} from "../../lib/api";
import { useUsername } from "@/contexts/UsernameContext";
import type { MeResponse } from "@/lib/me";
import { QUERY_REFETCH_INTERVAL_MS } from "@/lib/queryRefresh";

type ToggleLikeInput = {
  methodId: string;
  likedByMe?: boolean;
};

type ToggleLikeContext = {
  previousMethods: Array<[QueryKey, MethodsResponse | undefined]>;
  previousMethodDetails: Array<[QueryKey, MethodDetailResponse | undefined]>;
  previousMe: MeResponse | undefined;
};

function updateMethodLikeState(
  method: Method,
  methodId: string,
  nextLikedByMe: boolean,
  likesDelta: number
): Method {
  if (method.id !== methodId) return method;

  const nextLikes =
    typeof method.likes === "number"
      ? Math.max(0, method.likes + likesDelta)
      : method.likes;

  return {
    ...method,
    likedByMe: nextLikedByMe,
    ...(typeof nextLikes === "number" ? { likes: nextLikes } : {}),
  };
}

function getMethodsFiltersFromQueryKey(queryKey: QueryKey): MethodsFilters | undefined {
  if (!Array.isArray(queryKey) || queryKey[0] !== "methods") {
    return undefined;
  }

  const maybeFilters = queryKey[4];
  if (!maybeFilters || typeof maybeFilters !== "object") {
    return undefined;
  }

  return maybeFilters as MethodsFilters;
}

function updateMethodsResponseLikeState(
  response: MethodsResponse | undefined,
  queryFilters: MethodsFilters | undefined,
  methodId: string,
  nextLikedByMe: boolean,
  likesDelta: number,
  sourceMethod?: Method
): MethodsResponse | undefined {
  if (!response) return response;

  let hasTargetMethod = false;
  const nextMethods = response.methods.map((method) => {
    if (method.id !== methodId) return method;
    hasTargetMethod = true;
    return updateMethodLikeState(method, methodId, nextLikedByMe, likesDelta);
  });

  if (!hasTargetMethod) {
    if (queryFilters?.likedByMe === true && nextLikedByMe && sourceMethod) {
      return {
        ...response,
        methods: [
          updateMethodLikeState(sourceMethod, methodId, nextLikedByMe, likesDelta),
          ...response.methods,
        ],
      };
    }
    return response;
  }

  return {
    ...response,
    methods: nextMethods,
  };
}

export function useMethods(
  username?: string,
  page = 1,
  name?: string,
  filters?: MethodsFilters
): UseQueryResult<MethodsResponse, Error> {
  const { setUserError } = useUsername();
  const query = useQuery<MethodsResponse, Error>({
    queryKey: ["methods", username, name, page, filters],
    queryFn: () => fetchMethods(username, page, name, filters),
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
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

export function useToggleMethodLike(): UseMutationResult<
  void,
  Error,
  ToggleLikeInput,
  ToggleLikeContext
> {
  const queryClient = useQueryClient();
  const { setUserError } = useUsername();

  return useMutation<void, Error, ToggleLikeInput, ToggleLikeContext>({
    mutationFn: async ({ methodId, likedByMe }) => {
      const nextLikedByMe = !likedByMe;
      if (nextLikedByMe) {
        await likeMethod(methodId);
        return;
      }
      await unlikeMethod(methodId);
    },
    onMutate: async ({ methodId, likedByMe }) => {
      const nextLikedByMe = !likedByMe;
      const likesDelta = nextLikedByMe ? 1 : -1;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["methods"] }),
        queryClient.cancelQueries({ queryKey: ["methodDetail"] }),
        queryClient.cancelQueries({ queryKey: ["me"] }),
      ]);

      const previousMethods = queryClient.getQueriesData<MethodsResponse>({
        queryKey: ["methods"],
      });
      const previousMethodDetails = queryClient.getQueriesData<MethodDetailResponse>(
        {
          queryKey: ["methodDetail"],
        }
      );
      const previousMe = queryClient.getQueryData<MeResponse>(["me"]);
      const sourceMethod =
        previousMethods
          .flatMap(([, response]) => response?.methods ?? [])
          .find((method) => method.id === methodId) ??
        previousMethodDetails
          .map(([, detail]) => detail?.method)
          .find((method): method is Method => !!method && method.id === methodId);

      for (const [queryKey, response] of previousMethods) {
        const queryFilters = getMethodsFiltersFromQueryKey(queryKey);
        const nextResponse = updateMethodsResponseLikeState(
          response,
          queryFilters,
          methodId,
          nextLikedByMe,
          likesDelta,
          sourceMethod
        );
        if (nextResponse !== response) {
          queryClient.setQueryData(queryKey, nextResponse);
        }
      }

      for (const [queryKey, detail] of previousMethodDetails) {
        if (!detail?.method || detail.method.id !== methodId) {
          continue;
        }

        queryClient.setQueryData<MethodDetailResponse>(queryKey, {
          ...detail,
          method: updateMethodLikeState(
            detail.method,
            methodId,
            nextLikedByMe,
            likesDelta
          ),
        });
      }

      if (previousMe?.data) {
        const currentLikes =
          typeof previousMe.data.likesCount === "number"
            ? previousMe.data.likesCount
            : typeof previousMe.data.likes === "number"
              ? previousMe.data.likes
              : undefined;

        if (typeof currentLikes === "number") {
          const nextLikes = Math.max(0, currentLikes + likesDelta);
          queryClient.setQueryData<MeResponse>(["me"], {
            ...previousMe,
            data: {
              ...previousMe.data,
              likes: nextLikes,
              likesCount: nextLikes,
            },
          });
        }
      }

      setUserError(null);

      return { previousMethods, previousMethodDetails, previousMe };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;

      for (const [queryKey, response] of context.previousMethods) {
        queryClient.setQueryData(queryKey, response);
      }

      for (const [queryKey, detail] of context.previousMethodDetails) {
        queryClient.setQueryData(queryKey, detail);
      }

      if (context.previousMe) {
        queryClient.setQueryData(["me"], context.previousMe);
      }

      setUserError("No se pudo actualizar el like. Intenta nuevamente.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["methods"],
        refetchType: "inactive",
        predicate: (query) => {
          const queryFilters = getMethodsFiltersFromQueryKey(query.queryKey);
          return queryFilters?.likedByMe === true;
        },
      });
    },
  });
}
