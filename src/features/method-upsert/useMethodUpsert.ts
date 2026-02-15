import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useUsername } from "@/contexts/UsernameContext";
import {
  createMethodWithVariants,
  deleteMethod,
  fetchAchievementDiaries,
  fetchMethodDetailBySlug,
  fetchQuests,
  fetchSkills,
  getVariantsSignature,
  updateMethodBasic,
  updateMethodWithVariants,
  type Method,
  type MethodDetailResponse,
  type Variant,
} from "@/lib/api";

export type MethodUpsertMode = "create" | "edit";

export const methodFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  category: z.string().min(1, { message: "Category is required" }),
  description: z.string().optional(),
});

export type MethodUpsertFormValues = z.infer<typeof methodFormSchema>;

export const METHOD_CATEGORY_OPTIONS = [
  "skilling",
  "collecting",
  "combat",
  "processing",
] as const;

const createEmptyVariant = (): Variant => ({
  label: "New variant",
  description: "",
  requirements: {},
  inputs: [],
  outputs: [],
});

function normalizeVariantLabel(label: string): string {
  return label.trim().toLowerCase();
}

export function useMethodUpsert(mode: MethodUpsertMode) {
  const isEditMode = mode === "edit";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { slug: methodParam = "" } = useParams<{ slug: string }>();
  const { username, setUserError } = useUsername();

  const {
    data,
    error,
    isLoading,
  } = useQuery<MethodDetailResponse, Error>({
    queryKey: ["methodDetail", methodParam, username],
    queryFn: () => fetchMethodDetailBySlug(methodParam, username),
    enabled: isEditMode && !!methodParam,
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
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isSavingRef = useRef(false);
  const isDeletingRef = useRef(false);

  const method = data?.method;

  const form = useForm<MethodUpsertFormValues>({
    resolver: zodResolver(methodFormSchema),
    defaultValues: { name: "", category: "", description: "" },
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
    });
  }, [form, isEditMode, method]);

  useEffect(() => {
    const warning = data?.warnings?.[0];
    setUserError(warning?.message ?? null);
  }, [data, setUserError]);

  useEffect(() => {
    if (!error) return;
    setUserError("Failed to fetch user");
  }, [error, setUserError]);

  useEffect(() => {
    if (!selectorCatalogError) return;
    setUserError("Failed to fetch method edit selector options");
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
        queryClient.invalidateQueries({ queryKey: ["methodDetail", slug] })
      );
    }

    await Promise.all(invalidations);
  };

  const submitWithEnabled = async (
    values: MethodUpsertFormValues,
    enabledValue: boolean
  ) => {
    if (!isEditMode) {
      const createdMethod = await createMethodWithVariants(
        { ...values, enabled: enabledValue },
        variants
      );
      await invalidateMethodCaches(createdMethod.slug);
      navigateToMethodDetail(createdMethod);
      return;
    }

    if (!method) return;

    const baselineSignature =
      initialVariantsSignature ?? getVariantsSignature(method.variants ?? []);
    const variantsChanged =
      baselineSignature !== getVariantsSignature(variants);

    let updatedMethod: Method;
    if (variantsChanged) {
      updatedMethod = await updateMethodWithVariants(
        method.id,
        { ...values, enabled: enabledValue },
        variants
      );
    } else {
      updatedMethod = await updateMethodBasic(method.id, {
        ...values,
        enabled: enabledValue,
      });
    }

    await invalidateMethodCaches(methodParam, updatedMethod.slug);
    navigateToMethodDetail(updatedMethod);
  };

  const onSubmit = async (values: MethodUpsertFormValues) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await submitWithEnabled(values, enabled);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter") return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.tagName === "TEXTAREA" || target.isContentEditable) return;
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
      await invalidateMethodCaches(methodParam, method.slug);
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
    setVariants((currentVariants) => [...currentVariants, createEmptyVariant()]);

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
      const nextLabel = `copy of ${original.label ?? ""}`;
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
    onSubmit,
    handleFormKeyDown,
    handleCancel,
    handleDeleteMethod,
    handleDiscardConfirmed,
  };
}
