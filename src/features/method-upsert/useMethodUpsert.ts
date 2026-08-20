import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useUsername } from "@/contexts/UsernameContext";
import { getMethodDetailQueryKey, normalizeMethodSlug } from "@/lib/queryKeys";
import {
  ApiRequestError,
  createMethodWithVariants,
  deleteMethod,
  fetchAchievementDiaries,
  fetchMethodDetailBySlug,
  fetchQuests,
  fetchSkills,
  F2P_VARIANT_CONTAINS_MEMBERS_ITEMS_CODE,
  VARIANT_ACTION_TYPE_OPTIONS,
  type FreeToPlayVariantConflict,
  getVariantsSignature,
  updateMethodBasic,
  updateMethodWithVariants,
  type Method,
  type MethodDetailResponse,
  type Variant,
} from "@/lib/api";
import { QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";
import {
  countRequirementEntries,
  DESCRIPTION_MAX_LENGTH,
  hasAtMostDecimalPlaces,
  INPUTS_MAX_COUNT,
  MAX_ACTIONS_PER_HOUR,
  MAX_ACTIONS_PER_HOUR_DECIMAL_PLACES,
  MAX_COMBAT_LEVEL,
  MAX_AFKINESS,
  MAX_CLICK_INTENSITY,
  MAX_ITEM_QUANTITY,
  MAX_ITEM_QUANTITY_DECIMAL_PLACES,
  MAX_SKILL_LEVEL,
  MAX_XP_HOUR_SKILLS,
  MAX_XP_PER_HOUR,
  METHOD_NAME_MAX_LENGTH,
  MIN_COMBAT_LEVEL,
  OUTPUTS_MAX_COUNT,
  REASON_MAX_LENGTH,
  REQUIREMENT_ENTRIES_MAX_COUNT,
  VARIANT_LABEL_MAX_LENGTH,
} from "@/lib/validation";

export type MethodUpsertMode = "create" | "edit";

export const METHOD_CATEGORY_OPTIONS = [
  "skilling",
  "collecting",
  "combat",
  "processing",
] as const;

export const methodFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Name is required" })
      .max(METHOD_NAME_MAX_LENGTH, {
        message: `Name must be ${METHOD_NAME_MAX_LENGTH} characters or fewer`,
      }),
    category: z
      .union([z.enum(METHOD_CATEGORY_OPTIONS), z.literal("")])
      .refine((value) => value !== "", {
        message: "Category is required",
      }),
    description: z
      .string()
      .max(DESCRIPTION_MAX_LENGTH, {
        message: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer`,
      })
      .optional(),
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

export type MethodUpsertFormValues = z.input<typeof methodFormSchema>;
export type MethodUpsertSubmitValues = z.output<typeof methodFormSchema>;

const createEmptyVariant = (label = "New variant"): Variant => ({
  label,
  members: false,
  description: "",
  actionsPerHour: undefined,
  actionType: undefined,
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
  while (existingLabels.has(normalizeVariantLabel(`${baseLabel} ${suffix}`))) {
    suffix += 1;
  }

  return `${baseLabel} ${suffix}`;
}

function normalizeIconId(value: number | null | undefined): number | undefined {
  return Number.isInteger(value) && (value as number) > 0
    ? (value as number)
    : undefined;
}

function normalizeMethodCategory(
  value: string | undefined,
): MethodUpsertFormValues["category"] {
  const normalized = value?.toLowerCase().trim() ?? "";
  return METHOD_CATEGORY_OPTIONS.includes(
    normalized as (typeof METHOD_CATEGORY_OPTIONS)[number],
  )
    ? (normalized as (typeof METHOD_CATEGORY_OPTIONS)[number])
    : "";
}

function isCombatRequirementSkill(skill: string): boolean {
  return skill.trim().toLowerCase() === "combat";
}

function validateVariant(variant: Variant, index: number): string | null {
  const variantLabel = variant.label?.trim() || `Variant ${index + 1}`;

  if (!variant.label?.trim()) {
    return `${variantLabel}: name is required.`;
  }
  if (variant.label.trim().length > VARIANT_LABEL_MAX_LENGTH) {
    return `${variantLabel}: name must be ${VARIANT_LABEL_MAX_LENGTH} characters or fewer.`;
  }
  if ((variant.description ?? "").length > DESCRIPTION_MAX_LENGTH) {
    return `${variantLabel}: description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }
  if (!normalizeIconId(variant.icon_id)) {
    return `${variantLabel}: icon is required.`;
  }
  if (variant.actionsPerHour === undefined) {
    return `${variantLabel}: actions/hr is required.`;
  }
  if (
    variant.actionsPerHour < 0 ||
    variant.actionsPerHour > MAX_ACTIONS_PER_HOUR ||
    !hasAtMostDecimalPlaces(
      variant.actionsPerHour,
      MAX_ACTIONS_PER_HOUR_DECIMAL_PLACES,
    )
  ) {
    return `${variantLabel}: actions/hr must be between 0 and ${MAX_ACTIONS_PER_HOUR} with up to ${MAX_ACTIONS_PER_HOUR_DECIMAL_PLACES} decimal places.`;
  }
  if (!variant.actionType) {
    return `${variantLabel}: action type is required.`;
  }
  if (!VARIANT_ACTION_TYPE_OPTIONS.includes(variant.actionType)) {
    return `${variantLabel}: action type must be one of ${VARIANT_ACTION_TYPE_OPTIONS.join(", ")}.`;
  }
  if (
    variant.clickIntensity !== undefined &&
    (!Number.isInteger(variant.clickIntensity) ||
      variant.clickIntensity < 0 ||
      variant.clickIntensity > MAX_CLICK_INTENSITY)
  ) {
    return `${variantLabel}: clicks/hr must be an integer between 0 and ${MAX_CLICK_INTENSITY}.`;
  }
  if (
    variant.afkiness !== undefined &&
    (!Number.isInteger(variant.afkiness) ||
      variant.afkiness < 0 ||
      variant.afkiness > MAX_AFKINESS)
  ) {
    return `${variantLabel}: % AFK must be an integer between 0 and ${MAX_AFKINESS}.`;
  }
  if ((variant.xpHour?.length ?? 0) > MAX_XP_HOUR_SKILLS) {
    return `${variantLabel}: XP per hour supports at most ${MAX_XP_HOUR_SKILLS} skills.`;
  }
  for (const entry of variant.xpHour ?? []) {
    if (
      !Number.isInteger(entry.experience) ||
      entry.experience < 0 ||
      entry.experience > MAX_XP_PER_HOUR
    ) {
      return `${variantLabel}: XP per hour must be an integer between 0 and ${MAX_XP_PER_HOUR}.`;
    }
  }
  if ((variant.inputs?.length ?? 0) > INPUTS_MAX_COUNT) {
    return `${variantLabel}: inputs can contain at most ${INPUTS_MAX_COUNT} items.`;
  }
  if ((variant.outputs?.length ?? 0) > OUTPUTS_MAX_COUNT) {
    return `${variantLabel}: outputs can contain at most ${OUTPUTS_MAX_COUNT} items.`;
  }

  const ioEntries = [
    ...(variant.inputs ?? []).map((entry) => ({ ...entry, bucket: "input" })),
    ...(variant.outputs ?? []).map((entry) => ({ ...entry, bucket: "output" })),
  ];
  for (const entry of ioEntries) {
    if (
      !Number.isFinite(entry.quantity) ||
      entry.quantity < 0 ||
      entry.quantity > MAX_ITEM_QUANTITY ||
      !hasAtMostDecimalPlaces(entry.quantity, MAX_ITEM_QUANTITY_DECIMAL_PLACES)
    ) {
      return `${variantLabel}: each ${entry.bucket} quantity must be between 0 and ${MAX_ITEM_QUANTITY} with at most ${MAX_ITEM_QUANTITY_DECIMAL_PLACES} decimal places.`;
    }
    if ((entry.reason ?? "").length > REASON_MAX_LENGTH) {
      return `${variantLabel}: each ${entry.bucket} reason must be ${REASON_MAX_LENGTH} characters or fewer.`;
    }
  }

  if (
    countRequirementEntries(variant.requirements) >
    REQUIREMENT_ENTRIES_MAX_COUNT
  ) {
    return `${variantLabel}: requirements can contain at most ${REQUIREMENT_ENTRIES_MAX_COUNT} entries.`;
  }
  if (
    countRequirementEntries(variant.recommendations) >
    REQUIREMENT_ENTRIES_MAX_COUNT
  ) {
    return `${variantLabel}: recommendations can contain at most ${REQUIREMENT_ENTRIES_MAX_COUNT} entries.`;
  }

  for (const item of variant.requirements?.items ?? []) {
    if (
      !Number.isFinite(item.quantity) ||
      item.quantity < 0 ||
      item.quantity > MAX_ITEM_QUANTITY ||
      !hasAtMostDecimalPlaces(item.quantity, MAX_ITEM_QUANTITY_DECIMAL_PLACES)
    ) {
      return `${variantLabel}: each required item quantity must be between 0 and ${MAX_ITEM_QUANTITY} with at most ${MAX_ITEM_QUANTITY_DECIMAL_PLACES} decimal places.`;
    }
    if ((item.reason ?? "").length > REASON_MAX_LENGTH) {
      return `${variantLabel}: each required item reason must be ${REASON_MAX_LENGTH} characters or fewer.`;
    }
  }

  for (const item of variant.recommendations?.items ?? []) {
    if (
      !Number.isFinite(item.quantity) ||
      item.quantity < 0 ||
      item.quantity > MAX_ITEM_QUANTITY ||
      !hasAtMostDecimalPlaces(item.quantity, MAX_ITEM_QUANTITY_DECIMAL_PLACES)
    ) {
      return `${variantLabel}: each recommended item quantity must be between 0 and ${MAX_ITEM_QUANTITY} with at most ${MAX_ITEM_QUANTITY_DECIMAL_PLACES} decimal places.`;
    }
    if ((item.reason ?? "").length > REASON_MAX_LENGTH) {
      return `${variantLabel}: each recommended item reason must be ${REASON_MAX_LENGTH} characters or fewer.`;
    }
  }

  const levelGroups = [
    ...(variant.requirements?.levels ?? []).map((entry) => ({
      ...entry,
      bucket: "required",
    })),
    ...(variant.recommendations?.levels ?? []).map((entry) => ({
      ...entry,
      bucket: "recommended",
    })),
  ];
  for (const entry of levelGroups) {
    const maxLevel = isCombatRequirementSkill(entry.skill)
      ? MAX_COMBAT_LEVEL
      : MAX_SKILL_LEVEL;
    const minLevel = isCombatRequirementSkill(entry.skill)
      ? MIN_COMBAT_LEVEL
      : 1;
    if (
      !Number.isInteger(entry.level) ||
      entry.level < minLevel ||
      entry.level > maxLevel
    ) {
      return `${variantLabel}: each ${entry.bucket} level must be an integer between ${minLevel} and ${maxLevel}.`;
    }
    if ((entry.reason ?? "").length > REASON_MAX_LENGTH) {
      return `${variantLabel}: each ${entry.bucket} level reason must be ${REASON_MAX_LENGTH} characters or fewer.`;
    }
  }

  const questGroups = [
    ...(variant.requirements?.quests ?? []).map((entry) => ({
      ...entry,
      bucket: "required",
    })),
    ...(variant.recommendations?.quests ?? []).map((entry) => ({
      ...entry,
      bucket: "recommended",
    })),
  ];
  for (const entry of questGroups) {
    if ((entry.reason ?? "").length > REASON_MAX_LENGTH) {
      return `${variantLabel}: each ${entry.bucket} quest reason must be ${REASON_MAX_LENGTH} characters or fewer.`;
    }
  }

  const diaryGroups = [
    ...(variant.requirements?.achievement_diaries ?? []).map((entry) => ({
      ...entry,
      bucket: "required",
    })),
    ...(variant.recommendations?.achievement_diaries ?? []).map((entry) => ({
      ...entry,
      bucket: "recommended",
    })),
  ];
  for (const entry of diaryGroups) {
    if ((entry.reason ?? "").length > REASON_MAX_LENGTH) {
      return `${variantLabel}: each ${entry.bucket} achievement diary reason must be ${REASON_MAX_LENGTH} characters or fewer.`;
    }
  }

  return null;
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
    normalizeVariantKey(variant.slug) ===
      normalizeVariantKey(conflict.variantSlug)
  ) {
    return true;
  }

  return (
    normalizeVariantKey(variant.label) ===
    normalizeVariantKey(conflict.variantLabel)
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
  const { player, setUserError } = useUsername();
  const normalizedMethodSlug = normalizeMethodSlug(methodParam);

  const { data, error, isLoading } = useQuery<MethodDetailResponse, Error>({
    queryKey: getMethodDetailQueryKey(
      normalizedMethodSlug,
      player ?? undefined,
    ),
    queryFn: () =>
      fetchMethodDetailBySlug(normalizedMethodSlug, player ?? undefined),
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
    isEditMode ? [] : initialCreateVariants,
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
    useState<MethodUpsertSubmitValues | null>(null);
  const [submitValidationMessage, setSubmitValidationMessage] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showVariantValidationErrors, setShowVariantValidationErrors] =
    useState(false);
  const isSavingRef = useRef(false);
  const isDeletingRef = useRef(false);

  const method = data?.method;

  const form = useForm<
    MethodUpsertFormValues,
    unknown,
    MethodUpsertSubmitValues
  >({
    resolver: zodResolver(methodFormSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      icon_id: undefined,
    },
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
      category: normalizeMethodCategory(method.category),
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
    [labelCounts],
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
          .filter((slug): slug is string => Boolean(slug)),
      ),
    );

    const invalidations: Array<Promise<unknown>> = [
      queryClient.invalidateQueries({ queryKey: ["methods"] }),
    ];

    for (const slug of uniqueSlugs) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: ["methodDetail", normalizeMethodSlug(slug)],
        }),
      );
    }

    await Promise.all(invalidations);
  };

  const submitWithEnabled = async (
    values: MethodUpsertSubmitValues,
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
    values: MethodUpsertSubmitValues,
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
      submitError instanceof Error
        ? submitError.message
        : "Failed to save method",
    );
  };

  const runSubmit = async (
    values: MethodUpsertSubmitValues,
    variantsToSubmit: Variant[] = variants,
  ) => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);
    setUserError(null);

    try {
      setSubmitValidationMessage(null);
      await submitWithEnabled(values, enabled, variantsToSubmit);
    } catch (submitError) {
      handleSubmitError(submitError, values);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const onSubmit = async (values: MethodUpsertSubmitValues) => {
    setShowVariantValidationErrors(true);
    setSubmitValidationMessage(null);
    if (hasVariantIconErrors) return;

    for (const [index, variant] of variants.entries()) {
      const validationError = validateVariant(variant, index);
      if (validationError) {
        setSubmitValidationMessage(validationError);
        return;
      }
    }

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
          : "Failed to delete method",
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
      currentVariants.filter((_, itemIndex) => itemIndex !== index),
    );

  const updateVariantAt = (index: number, updated: Variant) =>
    setVariants((currentVariants) =>
      currentVariants.map((item, itemIndex) =>
        itemIndex === index ? updated : item,
      ),
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
    submitValidationMessage,
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
