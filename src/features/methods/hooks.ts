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
  likeVariant,
  unlikeVariant,
  type Method,
  type MethodDetailResponse,
  type MethodsFilters,
  type MethodsResponse,
  type Variant,
} from "../../lib/api";
import { useUsername } from "@/contexts/UsernameContext";
import type { MeResponse } from "@/lib/me";
import {
  QUERY_REFETCH_INTERVAL_MS,
  QUERY_STALE_TIME_MS,
} from "@/lib/queryRefresh";

type ToggleLikeInput = {
  methodId: string;
  variantId: string;
  likedByMe?: boolean;
};

type ToggleLikeContext = {
  previousMethodDetails: Array<[QueryKey, MethodDetailResponse | undefined]>;
  previousMe: MeResponse | undefined;
};

function updateVariantLikeState(
  variant: Variant,
  variantId: string,
  nextLikedByMe: boolean,
  likesDelta: number,
): Variant {
  if (variant.id !== variantId) return variant;

  const nextLikes =
    typeof variant.likes === "number"
      ? Math.max(0, variant.likes + likesDelta)
      : variant.likes;

  return {
    ...variant,
    likedByMe: nextLikedByMe,
    ...(typeof nextLikes === "number" ? { likes: nextLikes } : {}),
  };
}

function updateMethodVariantLikeState(
  method: Method,
  methodId: string,
  variantId: string,
  nextLikedByMe: boolean,
  likesDelta: number,
): Method {
  if (method.id !== methodId) return method;

  const nextLikes =
    typeof method.likes === "number"
      ? Math.max(0, method.likes + likesDelta)
      : method.likes;

  return {
    ...method,
    ...(typeof nextLikes === "number" ? { likes: nextLikes } : {}),
    variants: method.variants.map((variant) =>
      updateVariantLikeState(variant, variantId, nextLikedByMe, likesDelta),
    ),
  };
}

export function useMethods(
  username?: string,
  page = 1,
  name?: string,
  filters?: MethodsFilters,
  cursor?: string,
): UseQueryResult<MethodsResponse, Error> {
  const { setUserError } = useUsername();
  const query = useQuery<MethodsResponse, Error>({
    queryKey: ["methods", username, name, page, filters, cursor],
    queryFn: () => fetchMethods(username, page, name, filters, cursor),
    placeholderData: (previousData) => previousData,
    staleTime: QUERY_STALE_TIME_MS,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
    retry: false,
  });

  useEffect(() => {
    const warning = query.data?.warnings?.[0];
    setUserError(warning?.message ?? null);
  }, [query.data, setUserError]);

  useEffect(() => {
    if (query.error) {
      setUserError(
        query.error instanceof Error
          ? query.error.message
          : "Unable to load methods.",
      );
    }
  }, [query.error, setUserError]);

  return query;
}

export function useToggleVariantLike(): UseMutationResult<
  void,
  Error,
  ToggleLikeInput,
  ToggleLikeContext
> {
  const queryClient = useQueryClient();
  const { setUserError } = useUsername();

  return useMutation<void, Error, ToggleLikeInput, ToggleLikeContext>({
    mutationFn: async ({ variantId, likedByMe }) => {
      const nextLikedByMe = !likedByMe;
      if (nextLikedByMe) {
        await likeVariant(variantId);
        return;
      }

      await unlikeVariant(variantId);
    },
    onMutate: async ({ methodId, variantId, likedByMe }) => {
      const nextLikedByMe = !likedByMe;
      const likesDelta = nextLikedByMe ? 1 : -1;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["methodDetail"] }),
        queryClient.cancelQueries({ queryKey: ["me"] }),
      ]);

      const previousMethodDetails = queryClient.getQueriesData<MethodDetailResponse>({
        queryKey: ["methodDetail"],
      });
      const previousMe = queryClient.getQueryData<MeResponse>(["me"]);

      for (const [queryKey, detail] of previousMethodDetails) {
        if (!detail?.method || detail.method.id !== methodId) {
          continue;
        }

        queryClient.setQueryData<MethodDetailResponse>(queryKey, {
          ...detail,
          method: updateMethodVariantLikeState(
            detail.method,
            methodId,
            variantId,
            nextLikedByMe,
            likesDelta,
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

      return { previousMethodDetails, previousMe };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;

      for (const [queryKey, detail] of context.previousMethodDetails) {
        queryClient.setQueryData(queryKey, detail);
      }

      if (context.previousMe) {
        queryClient.setQueryData(["me"], context.previousMe);
      }

      setUserError("Could not update the like. Please try again.");
    },
    onSettled: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["methods"] }),
        queryClient.invalidateQueries({ queryKey: ["methodDetail"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
      ]);
    },
  });
}
