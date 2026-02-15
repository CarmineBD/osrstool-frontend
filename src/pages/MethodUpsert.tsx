import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  type MethodDetailResponse,
  type Method,
  type Variant,
} from "@/lib/api";
import { useUsername } from "@/contexts/UsernameContext";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { VariantForm } from "@/components/VariantForm";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  category: z.string().min(1, { message: "Category is required" }),
  description: z.string().optional(),
});

const createEmptyVariant = (): Variant => ({
  label: "New variant",
  description: "",
  requirements: {},
  inputs: [],
  outputs: [],
});

type MethodUpsertMode = "create" | "edit";

type Props = {
  mode: MethodUpsertMode;
};

export function MethodUpsert({ mode }: Props) {
  const isEditMode = mode === "edit";
  const navigate = useNavigate();
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
    enabled: true,
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
    enabled: true,
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
    enabled: true,
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
  const [enabled, setEnabled] = useState<boolean>(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isSavingRef = useRef(false);
  const isDeletingRef = useRef(false);

  useEffect(() => {
    if (!isEditMode) return;

    const method = data?.method;
    if (!method) return;

    const nextVariants = method.variants ?? [];
    setVariants(nextVariants);
    setInitialVariantsSignature(getVariantsSignature(nextVariants));
    setEnabled(method.enabled ?? true);
  }, [data?.method, isEditMode]);

  const addVariant = () =>
    setVariants((current) => [...current, createEmptyVariant()]);

  const removeVariant = (index: number) =>
    setVariants((current) => current.filter((_, i) => i !== index));

  const updateVariantAt = (index: number, updated: Variant) =>
    setVariants((current) =>
      current.map((item, i) => (i === index ? updated : item))
    );

  const duplicateVariantAt = (index: number) =>
    setVariants((current) => {
      const original = current[index];
      if (!original) return current;
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
        ...current.slice(0, index + 1),
        nextVariant,
        ...current.slice(index + 1),
      ];
    });

  const normalizeVariantLabel = (label: string) => label.trim().toLowerCase();

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

  const isVariantLabelDuplicate = (label: string) => {
    const key = normalizeVariantLabel(label ?? "");
    if (!key) return false;
    return (labelCounts.get(key) ?? 0) > 1;
  };

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

  const method = data?.method;

  type FormValues = z.infer<typeof formSchema>;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", category: "", description: "" },
  });

  useEffect(() => {
    if (!isEditMode || !method) return;

    form.reset({
      name: method.name,
      category: (method.category ?? "").toLowerCase().trim(),
      description: method.description ?? "",
    });
  }, [method, form, isEditMode]);

  const navigateToMethodDetail = (savedMethod: Method) => {
    navigate(`/moneyMakingMethod/${savedMethod.slug}`, {
      state: { methodId: savedMethod.id },
    });
  };

  const submitWithEnabled = async (values: FormValues, enabledValue: boolean) => {
    if (!isEditMode) {
      const createdMethod = await createMethodWithVariants(
        { ...values, enabled: enabledValue },
        variants
      );
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

    navigateToMethodDetail(updatedMethod);
  };

  const onSubmit = async (values: FormValues) => {
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

  if (isEditMode && isLoading) {
    return <p>Cargando metodo...</p>;
  }

  if (isEditMode && error) {
    return <p className="text-red-500">Error: {`${error}`}</p>;
  }

  if (isEditMode && !method) {
    return <p>No se encontro el metodo.</p>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">
        {isEditMode ? "Edit method" : "Add new method"}
      </h1>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          onKeyDown={handleFormKeyDown}
          className="space-y-6"
        >
          <div className="flex items-center gap-2">
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(checked)}
            />
            <span className="text-sm">enabled</span>
          </div>

          <section>
            <h2 className="font-semibold mb-2">Method details</h2>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
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
                          <SelectItem value="skilling">skilling</SelectItem>
                          <SelectItem value="collecting">collecting</SelectItem>
                          <SelectItem value="combat">combat</SelectItem>
                          <SelectItem value="processing">processing</SelectItem>
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
            <h2 className="font-semibold mb-2">Variants details</h2>
            {selectorCatalogLoading ? (
              <p className="mb-2 text-xs text-muted-foreground">
                Loading selector options...
              </p>
            ) : selectorCatalogError ? (
              <p className="mb-2 text-xs text-destructive">
                Failed to load selector options.
              </p>
            ) : (
              <p className="mb-2 text-xs text-muted-foreground">
                Selector options ready: {skillOptions.length} skills, {" "}
                {questOptions.length} quests, {" "}
                {achievementDiaryOptions.length} achievement diaries.
              </p>
            )}

            {variants.map((variant, index) => (
              <VariantForm
                key={index}
                onRemove={() => removeVariant(index)}
                onDuplicate={() => duplicateVariantAt(index)}
                isLabelDuplicate={isVariantLabelDuplicate(variant.label ?? "")}
                skillOptions={skillOptions}
                questOptions={questOptions}
                achievementDiaryOptions={achievementDiaryOptions}
                variant={variant}
                onChange={(value) => updateVariantAt(index, value)}
              />
            ))}

            <Button
              onClick={addVariant}
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
                onClick={() => setDeleteConfirmOpen(true)}
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
                onClick={handleCancel}
                disabled={isSaving || isDeleting}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </form>
      </Form>

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (isDeleting) return;
          setDeleteConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this method?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              method and all of its variants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleDeleteMethod();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Estas seguro de salir sin guardar los cambios?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>
              No
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                if (isEditMode && method) {
                  navigateToMethodDetail(method);
                } else {
                  navigate("/");
                }
              }}
            >
              Si
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
