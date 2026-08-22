import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { ItemIconField } from "@/components/ItemIconField";
import {
  EDITOR_BODY_TEXT_CLASS,
  EDITOR_CARD_CONTENT_CLASS,
  EDITOR_CARD_HEADER_CLASS,
  EDITOR_DASHED_ACTION_CLASS,
  EDITOR_ERROR_TEXT_CLASS,
  EDITOR_FIELD_LABEL_CLASS,
  EDITOR_META_TEXT_CLASS,
  EDITOR_NESTED_SURFACE_CLASS,
  EDITOR_PRIMARY_CARD_CLASS,
  EDITOR_SECONDARY_CARD_CLASS,
  EDITOR_TAB_LIST_CLASS,
  EmptySelectionState,
  InlineSwitchField,
  SectionHeader,
} from "@/components/method-editor/MethodEditorPrimitives";
import { RequiredMark } from "@/components/RequiredMark";
import { VariantTabLabel } from "@/components/VariantTabLabel";
import { VariantForm } from "@/components/VariantForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchIconRecords,
  getIconReferenceKey,
  normalizeIconSource,
  type IconRecord,
} from "@/lib/api";
import type {
  AchievementDiaryOption,
  QuestOption,
  SkillOption,
  Variant,
} from "@/lib/api";
import {
  METHOD_CATEGORY_OPTIONS,
  type MethodUpsertFormValues,
  type MethodUpsertSubmitValues,
} from "@/features/method-upsert/useMethodUpsert";
import { QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";
import { cn } from "@/lib/utils";
import {
  DESCRIPTION_MAX_LENGTH,
  METHOD_NAME_MAX_LENGTH,
  normalizeBoundedText,
} from "@/lib/validation";

interface MethodUpsertFormProps {
  isEditMode: boolean;
  form: UseFormReturn<
    MethodUpsertFormValues,
    unknown,
    MethodUpsertSubmitValues
  >;
  enabled: boolean;
  onEnabledChange: (checked: boolean) => void;
  onSubmit: (values: MethodUpsertSubmitValues) => void | Promise<void>;
  onSubmitAttempt: () => void;
  onFormKeyDown: (event: KeyboardEvent<HTMLFormElement>) => void;
  selectorCatalogLoading: boolean;
  skillOptions: SkillOption[];
  questOptions: QuestOption[];
  achievementDiaryOptions: AchievementDiaryOption[];
  variants: Variant[];
  onAddVariant: () => void;
  onRemoveVariant: (index: number) => void;
  onDuplicateVariant: (index: number) => void;
  onUpdateVariant: (index: number, value: Variant) => void;
  isVariantLabelDuplicate: (label: string) => boolean;
  hasDuplicateVariantLabels: boolean;
  showVariantValidationErrors: boolean;
  submitValidationMessage?: string | null;
  isSaving: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onRequestDelete: () => void;
}

function formatCategoryLabel(category: string) {
  return category
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getVariantTabValue(index: number) {
  return `variant-${index}`;
}

export function MethodUpsertForm({
  isEditMode,
  form,
  enabled,
  onEnabledChange,
  onSubmit,
  onSubmitAttempt,
  onFormKeyDown,
  selectorCatalogLoading,
  skillOptions,
  questOptions,
  achievementDiaryOptions,
  variants,
  onAddVariant,
  onRemoveVariant,
  onDuplicateVariant,
  onUpdateVariant,
  isVariantLabelDuplicate,
  hasDuplicateVariantLabels,
  showVariantValidationErrors,
  submitValidationMessage,
  isSaving,
  isDeleting,
  onCancel,
  onRequestDelete,
}: MethodUpsertFormProps) {
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const methodIconError =
    submitAttempted && !form.getValues("icon_id")
      ? "Method icon is required"
      : undefined;
  const variantIconReferences = useMemo(
    () =>
      variants
        .filter((variant): variant is Variant & { icon_id: number } =>
          Number.isInteger(variant.icon_id),
        )
        .map((variant) => ({
          id: variant.icon_id,
          source: normalizeIconSource(variant.iconSource),
        })),
    [variants],
  );

  const { data: variantIcons = {} } = useQuery<Record<string, IconRecord>>({
    queryKey: [
      "iconRecords",
      variantIconReferences.map(getIconReferenceKey).sort(),
    ],
    queryFn: () => fetchIconRecords(variantIconReferences),
    enabled: variantIconReferences.length > 0,
    staleTime: QUERY_STALE_TIME_MS,
  });

  useEffect(() => {
    setActiveVariantIndex((currentIndex) => {
      if (variants.length === 0) return 0;
      return Math.min(currentIndex, variants.length - 1);
    });
  }, [variants.length]);

  const handleAddVariant = () => {
    onAddVariant();
    setActiveVariantIndex(variants.length);
  };

  const handleDuplicateVariant = (index: number) => {
    onDuplicateVariant(index);
    setActiveVariantIndex(index + 1);
  };

  const handleRemoveVariant = (index: number) => {
    onRemoveVariant(index);
    setActiveVariantIndex((currentIndex) => {
      if (variants.length <= 1) return 0;
      if (currentIndex > index) return currentIndex - 1;
      if (currentIndex === index) {
        return Math.max(0, Math.min(index, variants.length - 2));
      }
      return currentIndex;
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          setSubmitAttempted(true);
          onSubmitAttempt();
          void form.handleSubmit(onSubmit)(event);
        }}
        onKeyDown={onFormKeyDown}
        className="space-y-6"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6">
            <Card className={EDITOR_PRIMARY_CARD_CLASS}>
              <CardHeader className={EDITOR_CARD_HEADER_CLASS}>
                <SectionHeader
                  title="Method details"
                  description="Set the shared identity and metadata used across every variant."
                  actions={
                    <Badge variant="outline" size="sm">
                      {isEditMode ? "Editing" : "Creating"}
                    </Badge>
                  }
                />
              </CardHeader>

              <CardContent className={EDITOR_CARD_CONTENT_CLASS}>
                <div className="grid gap-4 lg:grid-cols-[max-content_minmax(0,1.6fr)_minmax(0,11rem)_minmax(0,8rem)]">
                  <FormField
                    control={form.control}
                    name="icon_id"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <ItemIconField
                          label="Icon"
                          value={field.value}
                          source={form.watch("iconSource")}
                          onChange={(next) => {
                            field.onChange(next?.id);
                            form.setValue(
                              "iconSource",
                              next?.source ?? "item",
                              { shouldDirty: true },
                            );
                          }}
                          error={fieldState.error?.message ?? methodIconError}
                          required
                          searchAriaLabel="Method icon search"
                          optionsAriaLabel="Method icon search options"
                        />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className={EDITOR_FIELD_LABEL_CLASS}>
                          Name
                          <RequiredMark />
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Method name"
                            className="bg-background"
                            maxLength={METHOD_NAME_MAX_LENGTH}
                            {...field}
                            onChange={(event) =>
                              field.onChange(
                                normalizeBoundedText(
                                  event.target.value,
                                  METHOD_NAME_MAX_LENGTH,
                                ),
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage className="mt-2" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className={EDITOR_FIELD_LABEL_CLASS}>
                          Category
                          <RequiredMark />
                        </FormLabel>
                        <Select
                          key={field.value}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full bg-background">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              {METHOD_CATEGORY_OPTIONS.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {formatCategoryLabel(category)}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage className="mt-2" />
                      </FormItem>
                    )}
                  />

                  <InlineSwitchField
                    label="Enabled"
                    checked={enabled}
                    stateLabel={enabled ? "Enabled" : "Disabled"}
                    onCheckedChange={onEnabledChange}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="space-y-0 lg:col-span-4">
                        <FormLabel className={EDITOR_FIELD_LABEL_CLASS}>
                          Description
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the method"
                            className="min-h-[150px] bg-background"
                            maxLength={DESCRIPTION_MAX_LENGTH}
                            {...field}
                            onChange={(event) =>
                              field.onChange(
                                normalizeBoundedText(
                                  event.target.value,
                                  DESCRIPTION_MAX_LENGTH,
                                ),
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage className="mt-2" />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className={EDITOR_PRIMARY_CARD_CLASS}>
              {selectorCatalogLoading ? (
                <>
                  <CardHeader
                    className={cn(EDITOR_CARD_HEADER_CLASS, "space-y-4")}
                  >
                    <SectionHeader
                      title="Variants"
                      description="Split the method into clear scenarios with distinct requirements, loot, and XP profiles."
                      actions={
                        <Badge variant="outline" size="sm">
                          {variants.length}{" "}
                          {variants.length === 1 ? "variant" : "variants"}
                        </Badge>
                      }
                    />

                    <div
                      className={cn(
                        "flex flex-wrap gap-2 p-3",
                        EDITOR_NESTED_SURFACE_CLASS,
                      )}
                    >
                      {Array.from({ length: Math.max(variants.length, 2) }).map(
                        (_, index) => (
                          <Skeleton
                            key={`variant-tab-skeleton-${index}`}
                            className="h-9 w-32 rounded-md"
                          />
                        ),
                      )}
                      <Skeleton className="h-9 w-40 rounded-md" />
                    </div>
                  </CardHeader>

                  <CardContent className={EDITOR_CARD_CONTENT_CLASS}>
                    <div className={cn("p-4", EDITOR_NESTED_SURFACE_CLASS)}>
                      <div className="mb-4 flex items-center justify-between">
                        <Skeleton className="h-5 w-28" />
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-28 rounded-full" />
                          <Skeleton className="h-8 w-28 rounded-full" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <Skeleton className="h-20 w-20 rounded-xl" />
                        <Skeleton className="h-10 w-full lg:col-span-1" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-32 w-full md:col-span-2 lg:col-span-4" />
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : variants.length > 0 ? (
                <Tabs
                  value={getVariantTabValue(activeVariantIndex)}
                  onValueChange={(value) => {
                    const nextIndex = Number(value.replace("variant-", ""));
                    if (!Number.isNaN(nextIndex)) {
                      setActiveVariantIndex(nextIndex);
                    }
                  }}
                  className="w-full gap-0"
                >
                  <CardHeader
                    className={cn(EDITOR_CARD_HEADER_CLASS, "space-y-4")}
                  >
                    <SectionHeader
                      title="Variants"
                      description="Split the method into clear scenarios with distinct requirements, loot, and XP profiles."
                      actions={
                        <Badge variant="outline" size="sm">
                          {variants.length}{" "}
                          {variants.length === 1 ? "variant" : "variants"}
                        </Badge>
                      }
                    />

                    <TabsList className={EDITOR_TAB_LIST_CLASS}>
                      {variants.map((variant, index) => (
                        <TabsTrigger
                          key={getVariantTabValue(index)}
                          value={getVariantTabValue(index)}
                          className="h-10 max-w-full flex-none px-3"
                        >
                          <VariantTabLabel
                            label={
                              variant.label?.trim() || `Variant ${index + 1}`
                            }
                            iconUrl={
                              variant.icon_id
                                ? variantIcons[
                                    getIconReferenceKey({
                                      id: variant.icon_id,
                                      source: normalizeIconSource(
                                        variant.iconSource,
                                      ),
                                    })
                                  ]?.iconUrl
                                : undefined
                            }
                          />
                        </TabsTrigger>
                      ))}

                      <button
                        type="button"
                        onClick={handleAddVariant}
                        className={EDITOR_DASHED_ACTION_CLASS}
                      >
                        <IconPlus size={16} />
                        <span>Add variant</span>
                      </button>
                    </TabsList>
                  </CardHeader>

                  <CardContent className={EDITOR_CARD_CONTENT_CLASS}>
                    {variants.map((variant, index) => (
                      <TabsContent
                        key={getVariantTabValue(index)}
                        value={getVariantTabValue(index)}
                      >
                        <VariantForm
                          onRemove={() => handleRemoveVariant(index)}
                          onDuplicate={() => handleDuplicateVariant(index)}
                          isLabelDuplicate={isVariantLabelDuplicate(
                            variant.label ?? "",
                          )}
                          index={index}
                          skillOptions={skillOptions}
                          questOptions={questOptions}
                          achievementDiaryOptions={achievementDiaryOptions}
                          variant={variant}
                          showValidationErrors={showVariantValidationErrors}
                          onChange={(value) => onUpdateVariant(index, value)}
                        />
                      </TabsContent>
                    ))}
                  </CardContent>
                </Tabs>
              ) : (
                <>
                  <CardHeader
                    className={cn(EDITOR_CARD_HEADER_CLASS, "space-y-4")}
                  >
                    <SectionHeader
                      title="Variants"
                      description="Split the method into clear scenarios with distinct requirements, loot, and XP profiles."
                      actions={
                        <Badge variant="outline" size="sm">
                          {variants.length}{" "}
                          {variants.length === 1 ? "variant" : "variants"}
                        </Badge>
                      }
                    />

                    <div
                      className={cn(
                        "flex flex-wrap gap-2 p-1",
                        EDITOR_NESTED_SURFACE_CLASS,
                      )}
                    >
                      <button
                        type="button"
                        onClick={handleAddVariant}
                        className={EDITOR_DASHED_ACTION_CLASS}
                      >
                        <IconPlus size={16} />
                        <span>Add variant</span>
                      </button>
                    </div>
                  </CardHeader>

                  <CardContent className={EDITOR_CARD_CONTENT_CLASS}>
                    <EmptySelectionState
                      title="No variants yet"
                      description="Add the first variant to define inputs, outputs, XP, and requirements."
                    />
                  </CardContent>
                </>
              )}
            </Card>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <Card className={EDITOR_PRIMARY_CARD_CLASS}>
              <CardHeader className={EDITOR_CARD_HEADER_CLASS}>
                <SectionHeader
                  title="Actions"
                  description="Save after reviewing labels, requirements, and loot."
                  level="h2"
                />
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={hasDuplicateVariantLabels || isSaving || isDeleting}
                >
                  {isSaving
                    ? "Saving..."
                    : isEditMode
                      ? "Save changes"
                      : "Create method"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onCancel}
                  disabled={isSaving || isDeleting}
                >
                  Cancel
                </Button>
                {isEditMode ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    onClick={onRequestDelete}
                    disabled={isSaving || isDeleting}
                  >
                    Delete method
                  </Button>
                ) : null}

                {hasDuplicateVariantLabels ? (
                  <p className={EDITOR_ERROR_TEXT_CLASS}>
                    Resolve duplicate variant labels before saving.
                  </p>
                ) : submitValidationMessage ? (
                  <p className={EDITOR_ERROR_TEXT_CLASS}>
                    {submitValidationMessage}
                  </p>
                ) : (
                  <p className={EDITOR_META_TEXT_CLASS}>
                    Keep each variant focused and named by the exact scenario it
                    represents.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className={EDITOR_SECONDARY_CARD_CLASS}>
              <CardHeader className={EDITOR_CARD_HEADER_CLASS}>
                <SectionHeader
                  title="Flow"
                  description="A simple order for completing the form."
                  level="h2"
                />
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <p className={EDITOR_BODY_TEXT_CLASS}>
                  1. Define the method name, icon, and category.
                </p>
                <p className={EDITOR_BODY_TEXT_CLASS}>
                  2. Create variants with clear labels and specific loot.
                </p>
                <p className={EDITOR_BODY_TEXT_CLASS}>
                  3. Review requirements and save only when each variant is
                  distinct.
                </p>
                <p className={EDITOR_META_TEXT_CLASS}>
                  <span className="text-destructive">*</span> Required fields
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </form>
    </Form>
  );
}
