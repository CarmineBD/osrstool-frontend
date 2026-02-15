import type { KeyboardEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import type {
  AchievementDiaryOption,
  QuestOption,
  SkillOption,
  Variant,
} from "@/lib/api";
import { VariantForm } from "@/components/VariantForm";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  METHOD_CATEGORY_OPTIONS,
  type MethodUpsertFormValues,
} from "@/features/method-upsert/useMethodUpsert";

interface MethodUpsertFormProps {
  isEditMode: boolean;
  form: UseFormReturn<MethodUpsertFormValues>;
  enabled: boolean;
  onEnabledChange: (checked: boolean) => void;
  onSubmit: (values: MethodUpsertFormValues) => void | Promise<void>;
  onFormKeyDown: (event: KeyboardEvent<HTMLFormElement>) => void;
  selectorCatalogLoading: boolean;
  selectorCatalogError: unknown;
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
  isSaving: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onRequestDelete: () => void;
}

function SelectorStatus({
  selectorCatalogLoading,
  selectorCatalogError,
  skillOptions,
  questOptions,
  achievementDiaryOptions,
}: Pick<
  MethodUpsertFormProps,
  | "selectorCatalogLoading"
  | "selectorCatalogError"
  | "skillOptions"
  | "questOptions"
  | "achievementDiaryOptions"
>) {
  if (selectorCatalogLoading) {
    return (
      <p className="mb-2 text-xs text-muted-foreground">
        Loading selector options...
      </p>
    );
  }

  if (selectorCatalogError) {
    return (
      <p className="mb-2 text-xs text-destructive">
        Failed to load selector options.
      </p>
    );
  }

  return (
    <p className="mb-2 text-xs text-muted-foreground">
      Selector options ready: {skillOptions.length} skills, {questOptions.length}{" "}
      quests, {achievementDiaryOptions.length} achievement diaries.
    </p>
  );
}

export function MethodUpsertForm({
  isEditMode,
  form,
  enabled,
  onEnabledChange,
  onSubmit,
  onFormKeyDown,
  selectorCatalogLoading,
  selectorCatalogError,
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
  isSaving,
  isDeleting,
  onCancel,
  onRequestDelete,
}: MethodUpsertFormProps) {
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={onFormKeyDown}
        className="space-y-6"
      >
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
          <span className="text-sm">enabled</span>
        </div>

        <section>
          <h2 className="mb-2 font-semibold">Method details</h2>
          <div className="mb-4 flex flex-col gap-4 md:flex-row">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Method name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    key={field.value}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        {METHOD_CATEGORY_OPTIONS.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Method description"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-semibold">Variants details</h2>
          <SelectorStatus
            selectorCatalogLoading={selectorCatalogLoading}
            selectorCatalogError={selectorCatalogError}
            skillOptions={skillOptions}
            questOptions={questOptions}
            achievementDiaryOptions={achievementDiaryOptions}
          />

          {variants.map((variant, index) => (
            <VariantForm
              key={index}
              onRemove={() => onRemoveVariant(index)}
              onDuplicate={() => onDuplicateVariant(index)}
              isLabelDuplicate={isVariantLabelDuplicate(variant.label ?? "")}
              skillOptions={skillOptions}
              questOptions={questOptions}
              achievementDiaryOptions={achievementDiaryOptions}
              variant={variant}
              onChange={(value) => onUpdateVariant(index, value)}
            />
          ))}

          <Button
            onClick={onAddVariant}
            type="button"
            variant="outline"
            className="mt-4 w-full"
          >
            Add variant +
          </Button>
        </section>

        <div
          className={`flex gap-2 ${
            isEditMode ? "justify-between" : "justify-end"
          }`}
        >
          {isEditMode ? (
            <Button
              type="button"
              variant="destructive"
              onClick={onRequestDelete}
              disabled={isSaving || isDeleting}
            >
              Delete method
            </Button>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={hasDuplicateVariantLabels || isSaving || isDeleting}
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving || isDeleting}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
