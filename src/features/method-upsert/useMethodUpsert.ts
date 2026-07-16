import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useUsername } from "@/contexts/UsernameContext";
import {
  getMethodDetailQueryKey,
  normalizeMethodSlug,
  normalizeUsername,
} from "@/lib/queryKeys";
import {
  ApiRequestError,
  createMethodWithVariants,
  deleteMethod,
  fetchAchievementDiaries,
  fetchMethodDetailBySlug,
  fetchQuests,
  fetchSkills,
  F2P_VARIANT_CONTAINS_MEMBERS_ITEMS_CODE,
  type FreeToPlayVariantConflict,
  getVariantsSignature,
  updateMethodBasic,
  updateMethodWithVariants,
  type Method,
  type MethodDetailResponse,
  type Variant,
} from "@/lib/api";
import { QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";

export type MethodUpsertMode = "create" | "edit";

export const methodFormSchema = z
  .object({
    name: z.string().min(1, { message: "Name is required" }),
    category: z.string().min(1, { message: "Category is required" }),
    description: z.string().optional(),
    icon_id: z.number().int().positive().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.icon_id !== undefined) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["icon_id"],
      message: "Method icon is required",
    });
  });

export type MethodUpsertFormValues = z.infer<typeof methodFormSchema>;

export const METHOD_CATEGORY_OPTIONS = [
  "skilling",
  "collecting",
  "combat",
  "processing",
] as const;

const createEmptyVariant = (label = "New variant"): Variant => ({
  label,
  members: false,
  description: "",
  xpHour: [],
  requirements: {},
  inputs: [],
  outputs: [],
});

function normalizeVariantLabel(label: string): string {
  return label.trim().toLowerCase();
}

function getNextAvailableVariantLabel(baseLabel: string, variants: Variant[]) {
  const normalizedBaseLabel = normalizeVariantLabel(baseLabel);
  const existingLabels = new Set(
    variants.map((variant) => normalizeVariantLabel(variant.label ?? "")),
  );

  if (!existingLabels.has(normalizedBaseLabel)) {
    return baseLabel;
  }

  let suffix = 2;
  while (
    existingLabels.has(normalizeVariantLabel(`${baseLabel} ${suffix}`))
  ) {
    suffix += 1;
  }

  return `${baseLabel} ${suffix}`;
}

function normalizeIconId(value: number | null | undefined): number | undefined {
  return Number.isInteger(value) && (value as number) > 0
    ? (value as number)
    : undefined;
}

function normalizeVariantKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function variantMatchesConflict(
  variant: Variant,
  conflict: FreeToPlayVariantConflict,
): boolean {
  if (conflict.variantId && variant.id === conflict.variantId) {
    return true;
  }

  if (
    conflict.variantSlug &&
    normalizeVariantKey(variant.slug) === normalizeVariantKey(conflict.variantSlug)
  ) {
    return true;
  }

  return (
    normalizeVariantKey(variant.label) === normalizeVariantKey(conflict.variantLabel)
  );
}

function forceConflictingVariantsToMembers(
  variants: Variant[],
  conflicts: FreeToPlayVariantConflict[],
) {
  let changedCount = 0;

  const nextVariants = variants.map((variant) => {
    const shouldConvert = conflicts.some((conflict) =>
      variantMatchesConflict(variant, conflict),
    );

    if (!shouldConvert || variant.members) {
      return variant;
    }

    changedCount += 1;
    return {
      ...variant,
      members: true,
    };
  });

  return { nextVariants, changedCount };
}

export function useMethodUpsert(mode: MethodUpsertMode) {
  const isEditMode = mode === "edit";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { slug: methodParam = "" } = useParams<{ slug: string }>();
  const { username, setUserError } = useUsername();
  const normalizedMethodSlug = normalizeMethodSlug(methodParam);
  const normalizedUsername = normalizeUsername(username);

  const {
    data,
    error,
    isLoading,
  } = useQuery<MethodDetailResponse, Error>({
    queryKey: getMethodDetailQueryKey(normalizedMethodSlug, normalizedUsername),
    queryFn: () =>
      fetchMethodDetailBySlug(normalizedMethodSlug, normalizedUsername),
    enabled: isEditMode && !!normalizedMethodSlug,
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });

  const {
    data: achievementDiaryOptions = [],
    isLoading: isAchievementDiariesLoading,
    error: achievementDiariesError,
  } = useQuery({
    queryKey: ["methodEditCatalog", "achievement-diaries"],
    queryFn: fetchAchievementDiaries,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: false,
  });

  const {
    data: questOptions = [],
    isLoading: isQuestsLoading,
    error: questsError,
  } = useQuery({
    queryKey: ["methodEditCatalog", "quests"],
    queryFn: fetchQuests,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: false,
  });

  const {
    data: skillOptions = [],
    isLoading: isSkillsLoading,
    error: skillsError,
  } = useQuery({
    queryKey: ["methodEditCatalog", "skills"],
    queryFn: fetchSkills,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: false,
  });

  const selectorCatalogError =
    achievementDiariesError ?? questsError ?? skillsError;
  const selectorCatalogLoading =
    isAchievementDiariesLoading || isQuestsLoading || isSkillsLoading;

  const initialCreateVariants = useMemo(() => [createEmptyVariant()], []);
  const [variants, setVariants] = useState<Variant[]>(
    isEditMode ? [] : initialCreateVariants
  );
  const [initialVariantsSignature, setInitialVariantsSignature] = useState<
    string | null
  >(isEditMode ? null : getVariantsSignature(initialCreateVariants));
  const [enabled, setEnabled] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [membershipConflictOpen, setMembershipConflictOpen] = useState(false);
  const [membershipConflicts, setMembershipConflicts] = useState<
    FreeToPlayVariantConflict[]
  >([]);
  const [membershipConflictMessage, setMembershipConflictMessage] =
    useState<string>("");
  const [pendingSubmitValues, setPendingSubmitValues] =
    useState<MethodUpsertFormValues | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showVariantValidationErrors, setShowVariantValidationErrors] =
    useState(false);
  const isSavingRef = useRef(false);
  const isDeletingRef = useRef(false);

  const method = data?.method;

  const form = useForm<MethodUpsertFormValues>({
    resolver: zodResolver(methodFormSchema),
    defaultValues: { name: "", category: "", description: "", icon_id: undefined },
  });

  useEffect(() => {
    if (!isEditMode) return;
    if (!method) return;

    const nextVariants = method.variants ?? [];
    setVariants(nextVariants);
    setInitialVariantsSignature(getVariantsSignature(nextVariants));
    setEnabled(method.enabled ?? true);
  }, [isEditMode, method]);

  useEffect(() => {
    if (!isEditMode || !method) return;

    form.reset({
      name: method.name,
      category: (method.category ?? "").toLowerCase().trim(),
      description: method.description ?? "",
      icon_id: normalizeIconId(method.icon_id),
    });
  }, [form, isEditMode, method]);

  useEffect(() => {
    const warning = data?.warnings?.[0];
    setUserError(warning?.message ?? null);
  }, [data, setUserError]);

  useEffect(() => {
    if (!error) return;
    setUserError("Unable to load this method.");
  }, [error, setUserError]);

  useEffect(() => {
    if (!selectorCatalogError) return;
    setUserError("Unable to load the editor options.");
  }, [selectorCatalogError, setUserError]);

  const labelCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const variant of variants) {
      const key = normalizeVariantLabel(variant.label ?? "");
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [variants]);

  const hasDuplicateVariantLabels = useMemo(
    () => Array.from(labelCounts.values()).some((count) => count > 1),
    [labelCounts]
  );

  const isVariantLabelDuplicate = (label: string): boolean => {
    const key = normalizeVariantLabel(label ?? "");
    if (!key) return false;
    return (labelCounts.get(key) ?? 0) > 1;
  };

  const hasVariantIconErrors = useMemo(
    () => variants.some((variant) => !normalizeIconId(variant.icon_id)),
    [variants],
  );

  const navigateToMethodDetail = (savedMethod: Method) => {
    navigate(`/moneyMakingMethod/${savedMethod.slug}`);
  };

  const invalidateMethodCaches = async (
    ...maybeSlugs: Array<string | undefined>
  ) => {
    const uniqueSlugs = Array.from(
      new Set(
        maybeSlugs
          .map((slug) => slug?.trim())
          .filter((slug): slug is string => Boolean(slug))
      )
    );

    const invalidations: Array<Promise<unknown>> = [
      queryClient.invalidateQueries({ queryKey: ["methods"] }),
    ];

    for (const slug of uniqueSlugs) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: ["methodDetail", normalizeMethodSlug(slug)],
        })
      );
    }

    await Promise.all(invalidations);
  };

  const submitWithEnabled = async (
    values: MethodUpsertFormValues,
    enabledValue: boolean,
    variantsToSubmit: Variant[] = variants,
  ) => {
    const methodIconId = normalizeIconId(values.icon_id);
    if (!methodIconId) {
      throw new Error("Method icon is required");
    }

    if (!isEditMode) {
      const createdMethod = await createMethodWithVariants(
        { ...values, icon_id: methodIconId, enabled: enabledValue },
        variantsToSubmit,
      );
      await invalidateMethodCaches(createdMethod.slug);
      navigateToMethodDetail(createdMethod);
      return;
    }

    if (!method) return;

    const baselineSignature =
      initialVariantsSignature ?? getVariantsSignature(method.variants ?? []);
    const variantsChanged =
      baselineSignature !== getVariantsSignature(variantsToSubmit);
    const methodIconChanged =
      normalizeIconId(method.icon_id) !== normalizeIconId(values.icon_id);

    let updatedMethod: Method;
    if (variantsChanged || methodIconChanged) {
      updatedMethod = await updateMethodWithVariants(
        method.id,
        { ...values, icon_id: methodIconId, enabled: enabledValue },
        variantsToSubmit,
      );
    } else {
      updatedMethod = await updateMethodBasic(method.id, {
        name: values.name,
        category: values.category,
        description: values.description,
        enabled: enabledValue,
      });
    }

    await invalidateMethodCaches(normalizedMethodSlug, updatedMethod.slug);
    navigateToMethodDetail(updatedMethod);
  };

  const handleSubmitError = (
    submitError: unknown,
    values: MethodUpsertFormValues,
  ) => {
    if (
      submitError instanceof ApiRequestError &&
      submitError.code === F2P_VARIANT_CONTAINS_MEMBERS_ITEMS_CODE &&
      submitError.freeToPlayVariantConflicts &&
      submitError.freeToPlayVariantConflicts.length > 0
    ) {
      setUserError(null);
      setPendingSubmitValues({ ...values });
      setMembershipConflicts(submitError.freeToPlayVariantConflicts);
      setMembershipConflictMessage(submitError.message);
      setMembershipConflictOpen(true);
      return;
    }

    setUserError(
      submitError instanceof Error ? submitError.message : "Failed to save method",
    );
  };

  const runSubmit = async (
    values: MethodUpsertFormValues,
    variantsToSubmit: Variant[] = variants,
  ) => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);
    setUserError(null);

    try {
      await submitWithEnabled(values, enabled, variantsToSubmit);
    } catch (submitError) {
      handleSubmitError(submitError, values);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const onSubmit = async (values: MethodUpsertFormValues) => {
    setShowVariantValidationErrors(true);
    if (hasVariantIconErrors) return;

    await runSubmit(values);
  };

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter") return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "SELECT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }
    event.preventDefault();
  };

  const handleCancel = () => {
    if (form.formState.isDirty) {
      setConfirmOpen(true);
      return;
    }

    if (isEditMode && method) {
      navigateToMethodDetail(method);
      return;
    }

    navigate("/");
  };

  const handleDeleteMethod = async () => {
    if (!isEditMode || !method || isDeletingRef.current) return;

    isDeletingRef.current = true;
    setIsDeleting(true);
    try {
      await deleteMethod(method.id);
      await invalidateMethodCaches(normalizedMethodSlug, method.slug);
      setDeleteConfirmOpen(false);
      navigate("/");
    } catch (deleteError) {
      setUserError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete method"
      );
    } finally {
      isDeletingRef.current = false;
      setIsDeleting(false);
    }
  };

  const handleDiscardConfirmed = () => {
    setConfirmOpen(false);
    if (isEditMode && method) {
      navigateToMethodDetail(method);
      return;
    }
    navigate("/");
  };

  const addVariant = () =>
    setVariants((currentVariants) => [
      ...currentVariants,
      createEmptyVariant(
        getNextAvailableVariantLabel("New variant", currentVariants),
      ),
    ]);

  const removeVariant = (index: number) =>
    setVariants((currentVariants) =>
      currentVariants.filter((_, itemIndex) => itemIndex !== index)
    );

  const updateVariantAt = (index: number, updated: Variant) =>
    setVariants((currentVariants) =>
      currentVariants.map((item, itemIndex) =>
        itemIndex === index ? updated : item
      )
    );

  const duplicateVariantAt = (index: number) =>
    setVariants((currentVariants) => {
      const original = currentVariants[index];
      if (!original) return currentVariants;
      const cloned =
        typeof structuredClone === "function"
          ? structuredClone(original)
          : (JSON.parse(JSON.stringify(original)) as Variant);
      const nextLabel = getNextAvailableVariantLabel(
        `Copy of ${original.label ?? "variant"}`.trim(),
        currentVariants,
      );
      const nextVariant: Variant = {
        ...cloned,
        id: undefined,
        slug: undefined,
        label: nextLabel,
      };
      return [
        ...currentVariants.slice(0, index + 1),
        nextVariant,
        ...currentVariants.slice(index + 1),
      ];
    });

  const handleRetryAsMembers = async () => {
    if (!pendingSubmitValues || membershipConflicts.length === 0) return;

    const { nextVariants, changedCount } = forceConflictingVariantsToMembers(
      variants,
      membershipConflicts,
    );

    if (changedCount === 0) {
      setUserError("Unable to match the affected variants in the editor.");
      setMembershipConflictOpen(false);
      return;
    }

    setVariants(nextVariants);
    setMembershipConflictOpen(false);
    await runSubmit(pendingSubmitValues, nextVariants);
  };

  return {
    isEditMode,
    isLoading,
    error,
    method,
    form,
    enabled,
    setEnabled,
    selectorCatalogLoading,
    selectorCatalogError,
    skillOptions,
    questOptions,
    achievementDiaryOptions,
    variants,
    addVariant,
    removeVariant,
    updateVariantAt,
    duplicateVariantAt,
    hasDuplicateVariantLabels,
    isVariantLabelDuplicate,
    isSaving,
    isDeleting,
    confirmOpen,
    setConfirmOpen,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    membershipConflictOpen,
    setMembershipConflictOpen,
    membershipConflicts,
    membershipConflictMessage,
    showVariantValidationErrors,
    setShowVariantValidationErrors,
    onSubmit,
    handleFormKeyDown,
    handleCancel,
    handleDeleteMethod,
    handleDiscardConfirmed,
    handleRetryAsMembers,
  };
}
