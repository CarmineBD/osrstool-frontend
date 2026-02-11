import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  fetchAchievementDiaries,
  fetchMethodDetailBySlug,
  fetchQuests,
  fetchSkills,
  getVariantsSignature,
  updateMethodBasic,
  updateMethodWithVariants,
  type MethodDetailResponse,
  type Variant,
} from "@/lib/api";
import { useUsername } from "@/contexts/UsernameContext";
import { fetchMe } from "@/lib/me";
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
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { VariantForm } from "@/components/VariantForm";

export type Props = Record<string, never>;

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  category: z.string().min(1, { message: "Category is required" }),
  description: z.string().optional(),
});

export function MethodEdit(_props: Props) {
  void _props;
  const navigate = useNavigate();
  const { slug: methodParam = "" } = useParams<{ slug: string }>();
  const { username, setUserError } = useUsername();
  const {
    data: meData,
    isLoading: isMeLoading,
    error: meError,
  } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    retry: false,
  });
  const { data, error, isLoading } = useQuery<MethodDetailResponse, Error>({
    queryKey: ["methodDetail", methodParam, username],
    queryFn: () => fetchMethodDetailBySlug(methodParam, username),
    enabled: !!methodParam,
    retry: false,
  });
  const isSuperAdmin = meData?.data?.role === "super_admin";
  const shouldFetchSelectorCatalogs = !!methodParam && isSuperAdmin;
  const {
    data: achievementDiaryOptions = [],
    isLoading: isAchievementDiariesLoading,
    error: achievementDiariesError,
  } = useQuery({
    queryKey: ["methodEditCatalog", "achievement-diaries"],
    queryFn: fetchAchievementDiaries,
    enabled: shouldFetchSelectorCatalogs,
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
    enabled: shouldFetchSelectorCatalogs,
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
    enabled: shouldFetchSelectorCatalogs,
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
  const [variants, setVariants] = useState<Variant[]>([] as Variant[]);
  const [initialVariantsSignature, setInitialVariantsSignature] = useState<
    string | null
  >(null);
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    const m = data?.method;
    if (m) {
      const nextVariants = m.variants ?? [];
      setVariants(nextVariants);
      setInitialVariantsSignature(getVariantsSignature(nextVariants));
      setEnabled(m.enabled ?? true);
    }
  }, [data?.method]);

  const addVariant = () => setVariants((v) => [...v, {
    label: "New variant",
    description: "",
    requirements: {},
    inputs: [],
    outputs: [],
  }]);
  const removeVariant = (index: number) =>
    setVariants((v) => v.filter((_, i) => i !== index));
  const updateVariantAt = (index: number, updated: Variant) =>
    setVariants((v) => v.map((it, i) => (i === index ? updated : it)));
  const duplicateVariantAt = (index: number) =>
    setVariants((v) => {
      const original = v[index];
      if (!original) return v;
      const cloned =
        typeof structuredClone === "function"
          ? structuredClone(original)
          : (JSON.parse(JSON.stringify(original)) as Variant);
      const nextLabel = `copy of ${original.label ?? ""}`;
      // Duplicated variants must not keep persisted identity fields.
      // Otherwise backend treats the copy as an update of the original variant.
      const nextVariant: Variant = {
        ...cloned,
        id: undefined,
        slug: undefined,
        label: nextLabel,
      };
      return [...v.slice(0, index + 1), nextVariant, ...v.slice(index + 1)];
    });

  const normalizeVariantLabel = (label: string) =>
    label.trim().toLowerCase();
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
    if (error) {
      setUserError("Failed to fetch user");
    }
  }, [error, setUserError]);
  useEffect(() => {
    if (selectorCatalogError) {
      setUserError("Failed to fetch method edit selector options");
    }
  }, [selectorCatalogError, setUserError]);
  const method = data?.method;
  type FormValues = z.infer<typeof formSchema>;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", category: "", description: "" },
  });
  useEffect(() => {
    if (method) {
      form.reset({
        name: method.name,
        // Normaliza para coincidir con los values del Select
        category: (method.category ?? "").toLowerCase().trim(),
        description: method.description ?? "",
      });
    }
  }, [method, form]);
  const submitWithEnabled = async (values: FormValues, enabledValue: boolean) => {
    if (!method) return;
    const baselineSignature =
      initialVariantsSignature ?? getVariantsSignature(method.variants ?? []);
    const variantsChanged =
      baselineSignature !== getVariantsSignature(variants);
    if (variantsChanged) {
      await updateMethodWithVariants(
        method.id,
        { ...values, enabled: enabledValue },
        variants
      );
    } else {
      await updateMethodBasic(method.id, { ...values, enabled: enabledValue });
    }
    navigate(`/moneyMakingMethod/${method.slug}`, {
      state: { methodId: method.id },
    });
  };
  const onSubmit = async (values: FormValues) => {
    await submitWithEnabled(values, enabled);
  };
  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter") return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.tagName === "TEXTAREA" || target.isContentEditable) return;
    event.preventDefault();
  };
  const [confirmOpen, setConfirmOpen] = useState(false);
  const handleCancel = () => {
    if (form.formState.isDirty) {
      setConfirmOpen(true);
    } else if (method) {
      navigate(`/moneyMakingMethod/${method.slug}`, {
        state: { methodId: method.id },
      });
    } else {
      navigate(-1);
    }
  };
  if (isMeLoading || isLoading) return <p>Cargando método…</p>;
  if (meError || !isSuperAdmin) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <p className="text-red-500">No tienes permisos para editar métodos.</p>
      </div>
    );
  }
  if (error) return <p className="text-red-500">❌ {`${error}`}</p>;
  if (!method) return <p>No se encontró el método.</p>;
  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Edit method</h1>
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
          {/* <section>
            <h2 className="font-semibold mb-2">Variants details</h2>
            <pre className="rounded bg-muted p-4 overflow-auto text-sm">
              {JSON.stringify(method.variants, null, 2)}
            </pre>
          </section> */}
          <section>
            <h2 className="font-semibold mb-2">Variants details</h2>
            {selectorCatalogLoading ? (
              <p className="mb-2 text-xs text-muted-foreground">
                Loading selector options…
              </p>
            ) : selectorCatalogError ? (
              <p className="mb-2 text-xs text-destructive">
                Failed to load selector options.
              </p>
            ) : (
              <p className="mb-2 text-xs text-muted-foreground">
                Selector options ready: {skillOptions.length} skills,{" "}
                {questOptions.length} quests,{" "}
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
                onChange={(v) => updateVariantAt(index, v)}
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
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={hasDuplicateVariantLabels}>
              Guardar
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Estás seguro de salir sin guardar los cambios?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>
              No
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                if (method) {
                  navigate(`/moneyMakingMethod/${method.slug}`, {
                    state: { methodId: method.id },
                  });
                } else {
                  navigate(-1);
                }
              }}
            >
              Sí
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MethodEdit;
