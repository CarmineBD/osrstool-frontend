import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { ItemIconField } from "@/components/ItemIconField";
import { RequiredMark } from "@/components/RequiredMark";
import { VariantTabLabel } from "@/components/VariantTabLabel";
import { VariantForm } from "@/components/VariantForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { fetchItems, type Item } from "@/lib/api";
import type {
  AchievementDiaryOption,
  QuestOption,
  SkillOption,
  Variant,
} from "@/lib/api";
import {
  METHOD_CATEGORY_OPTIONS,
  type MethodUpsertFormValues,
} from "@/features/method-upsert/useMethodUpsert";
import { getItemsQueryKey } from "@/lib/queryKeys";
import { QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";

interface MethodUpsertFormProps {
  isEditMode: boolean;
  form: UseFormReturn<MethodUpsertFormValues>;
  enabled: boolean;
  onEnabledChange: (checked: boolean) => void;
  onSubmit: (values: MethodUpsertFormValues) => void | Promise<void>;
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
  const variantIconIds = useMemo(
    () =>
      Array.from(
        new Set(
          variants
            .map((variant) => variant.icon_id)
            .filter((iconId): iconId is number => Number.isInteger(iconId)),
        ),
      ).sort((a, b) => a - b),
    [variants],
  );

  const { data: variantIcons = {} } = useQuery<Record<number, Item>>({
    queryKey: getItemsQueryKey(variantIconIds),
    queryFn: () => fetchItems(variantIconIds),
    enabled: variantIconIds.length > 0,
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
            <Card className="gap-0 border-border/70 bg-muted/[0.18] shadow-sm">
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-col gap-3 border-b border-border/60 pb-4 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Method basics
                  </p>

                  <Badge variant="outline" size="sm">
                    {isEditMode ? "Editing" : "Creating"}
                  </Badge>
                </div>

                <div className="grid gap-x-3 gap-y-4 lg:grid-cols-[max-content_minmax(0,1.6fr)_minmax(0,11rem)_minmax(0,8rem)]">
                  <FormField
                    control={form.control}
                    name="icon_id"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <ItemIconField
                          label="Icon"
                          value={field.value}
                          onChange={field.onChange}
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
                        <FormLabel className="mb-2 block">
                          Name
                          <RequiredMark />
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Method name"
                            className="bg-background/90"
                            {...field}
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
                        <FormLabel className="mb-2 block">
                          Category
                          <RequiredMark />
                        </FormLabel>
                        <Select
                          key={field.value}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full bg-background/90">
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

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Enabled</label>
                    <div className="flex h-10 items-center gap-3">
                      <Switch
                        checked={enabled}
                        onCheckedChange={onEnabledChange}
                      />
                      <span className="text-sm font-medium">
                        {enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="space-y-0 lg:col-span-4">
                        <FormLabel className="mb-2 block">Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the method"
                            className="min-h-[150px] bg-background/90"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="mt-2" />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="gap-0 border-border/70 bg-muted/[0.18] shadow-sm">
              <CardHeader className="gap-4 border-b border-border/60 pb-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <CardTitle>Variants</CardTitle>
                    <CardDescription>
                      Split the method into actionable variants with their own
                      requirements, loot and XP profile.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" size="sm">
                    {variants.length}{" "}
                    {variants.length === 1 ? "variant" : "variants"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-6">
                {selectorCatalogLoading ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-background/70 p-3">
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

                    <div className="rounded-xl border border-border/60 bg-background/70 p-4">
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
                  </div>
                ) : variants.length > 0 ? (
                  <div className="space-y-4">
                    <Tabs
                      value={getVariantTabValue(activeVariantIndex)}
                      onValueChange={(value) => {
                        const nextIndex = Number(value.replace("variant-", ""));
                        if (!Number.isNaN(nextIndex)) {
                          setActiveVariantIndex(nextIndex);
                        }
                      }}
                      className="w-full gap-4"
                    >
                      <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/70 p-1">
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
                                  ? variantIcons[variant.icon_id]?.iconUrl
                                  : undefined
                              }
                            />
                          </TabsTrigger>
                        ))}

                        <button
                          type="button"
                          onClick={handleAddVariant}
                          className="inline-flex h-9 flex-none items-center justify-center gap-2 rounded-md border border-dashed border-border/70 px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                        >
                          <IconPlus size={16} />
                          <span>Add variant</span>
                        </button>
                      </TabsList>

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
                    </Tabs>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/70 p-1">
                      <button
                        type="button"
                        onClick={handleAddVariant}
                        className="inline-flex h-9 flex-none items-center justify-center gap-2 rounded-md border border-dashed border-border/70 px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                      >
                        <IconPlus size={16} />
                        <span>Add variant</span>
                      </button>
                    </div>

                    <div className="rounded-xl border border-dashed border-border/70 bg-background/65 p-6 text-center">
                      <p className="text-sm font-medium">No variants yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Add the first variant to define inputs, outputs, XP and
                        requirements.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <Card className="gap-0 border-border/70 bg-background shadow-sm">
              <CardHeader className="gap-1 border-b border-border/60 pb-4">
                <CardTitle>Actions</CardTitle>
                <CardDescription>
                  Save after reviewing labels, requirements and loot.
                </CardDescription>
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
                  <p className="text-sm text-destructive">
                    Resolve duplicate variant labels before saving.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Keep each variant focused and named by the exact scenario it
                    represents.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="gap-0 border-border/60 bg-muted/[0.14] shadow-none">
              <CardHeader className="gap-1 pb-3">
                <CardTitle>Flow</CardTitle>
                <CardDescription>
                  A simpler order for completing the form.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 text-sm text-muted-foreground">
                <p>1. Define the method name, icon and category.</p>
                <p>2. Create variants with clear labels and specific loot.</p>
                <p>
                  3. Review requirements and save only when each variant is
                  distinct.
                </p>
                <p>
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
