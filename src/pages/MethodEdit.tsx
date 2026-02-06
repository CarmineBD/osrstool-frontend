import { useEffect, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  fetchMethods,
  fetchMethodDetail,
  getVariantsSignature,
  updateMethodBasic,
  updateMethodWithVariants,
  type MethodDetailResponse,
  type MethodsResponse,
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
  const state = useLocation().state as { methodId?: string } | undefined;
  const { username, setUserError } = useUsername();
  const isNumericId = /^\d+$/.test(methodParam);
  const { data: methodsData } = useQuery<MethodsResponse>({
    queryKey: ["methods", username],
    queryFn: () => fetchMethods(username),
    enabled: !state?.methodId && !isNumericId,
  });
  const methodId =
    state?.methodId ??
    (isNumericId
      ? methodParam
      : methodsData?.methods.find((m) => m.slug === methodParam)?.id);
  const { data, error, isLoading } = useQuery<MethodDetailResponse, Error>({
    queryKey: ["methodDetail", methodId, username],
    queryFn: () => fetchMethodDetail(methodId!, username),
    enabled: !!methodId,
    retry: false,
  });
  const [variants, setVariants] = useState<Variant[]>([] as Variant[]);
  const [initialVariantsSignature, setInitialVariantsSignature] = useState<
    string | null
  >(null);

  useEffect(() => {
    const m = data?.method;
    if (m) {
      const nextVariants = m.variants ?? [];
      setVariants(nextVariants);
      setInitialVariantsSignature(getVariantsSignature(nextVariants));
    }
  }, [data?.method]);

  const addVariant = () => setVariants((v) => [...v, {
    label: "New variant",
    description: "",
    requirements: {},
    inputs: [],
    outputs: [],
  }]);
  const normalizeVariantLabel = (value: string) => value.trim().toLowerCase();
  const getDuplicateLabelCounts = (list: Variant[]) => {
    const counts = new Map<string, number>();
    list.forEach((entry) => {
      const key = normalizeVariantLabel(entry.label ?? "");
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  };
  const getDuplicateLabelError = (
    counts: Map<string, number>,
    label: string
  ) => {
    const key = normalizeVariantLabel(label ?? "");
    if (!key) return null;
    return (counts.get(key) ?? 0) > 1
      ? "Ya existe un variant con ese nombre."
      : null;
  };
  const makeDuplicateLabel = (sourceLabel: string, existing: Set<string>) => {
    const baseLabel = `copy of ${sourceLabel.trim() || "variant"}`;
    let candidate = baseLabel;
    let index = 2;
    while (existing.has(normalizeVariantLabel(candidate))) {
      candidate = `${baseLabel} (${index})`;
      index += 1;
    }
    return candidate;
  };
  const cloneRequirement = (
    req: Variant["requirements"] | Variant["recommendations"]
  ) => ({
    items: req?.items?.map((item) => ({ ...item })),
    levels: req?.levels?.map((level) => ({ ...level })),
    quests: req?.quests?.map((quest) => ({ ...quest })),
    achievement_diaries: req?.achievement_diaries?.map((diary) => ({
      ...diary,
    })),
  });
  const cloneVariantForDuplicate = (source: Variant, label: string): Variant => ({
    ...source,
    id: undefined,
    slug: undefined,
    label,
    xpHour: Array.isArray(source.xpHour)
      ? source.xpHour.map((entry) => ({ ...entry }))
      : source.xpHour,
    requirements: cloneRequirement(source.requirements),
    recommendations: source.recommendations
      ? cloneRequirement(source.recommendations)
      : source.recommendations,
    inputs: Array.isArray(source.inputs)
      ? source.inputs.map((item) => ({ ...item }))
      : [],
    outputs: Array.isArray(source.outputs)
      ? source.outputs.map((item) => ({ ...item }))
      : [],
  });
  const duplicateVariantAt = (index: number) =>
    setVariants((v) => {
      const source = v[index];
      if (!source) return v;
      const existingLabels = new Set(
        v.map((entry) => normalizeVariantLabel(entry.label ?? ""))
      );
      const nextLabel = makeDuplicateLabel(source.label, existingLabels);
      const copy = cloneVariantForDuplicate(source, nextLabel);
      return [...v.slice(0, index + 1), copy, ...v.slice(index + 1)];
    });
  const removeVariant = (index: number) =>
    setVariants((v) => v.filter((_, i) => i !== index));
  const updateVariantAt = (index: number, updated: Variant) =>
    setVariants((v) => v.map((it, i) => (i === index ? updated : it)));

  useEffect(() => {
    const warning = data?.warnings?.[0];
    setUserError(warning?.message ?? null);
  }, [data, setUserError]);
  useEffect(() => {
    if (error) {
      setUserError("Failed to fetch user");
    }
  }, [error, setUserError]);
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
  const onSubmit = async (values: FormValues) => {
    if (!method) return;
    const duplicateLabelCounts = getDuplicateLabelCounts(variants);
    const hasDuplicateLabels = Array.from(duplicateLabelCounts.values()).some(
      (count) => count > 1
    );
    if (hasDuplicateLabels) {
      setUserError("Hay variants con nombres repetidos.");
      return;
    }
    const baselineSignature =
      initialVariantsSignature ?? getVariantsSignature(method.variants ?? []);
    const variantsChanged =
      baselineSignature !== getVariantsSignature(variants);
    if (variantsChanged) {
      await updateMethodWithVariants(method.id, values, variants);
    } else {
      await updateMethodBasic(method.id, values);
    }
    navigate(`/moneyMakingMethod/${method.slug}`, {
      state: { methodId: method.id },
    });
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
  const duplicateLabelCounts = getDuplicateLabelCounts(variants);
  const hasDuplicateLabels = Array.from(duplicateLabelCounts.values()).some(
    (count) => count > 1
  );
  if (isLoading) return <p>Cargando mÃ©todoâ€¦</p>;
  if (error) return <p className="text-red-500">âŒ {`${error}`}</p>;
  if (!method) return <p>No se encontrÃ³ el mÃ©todo.</p>;
  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Edit method</h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          onKeyDown={handleFormKeyDown}
          className="space-y-6"
        >
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
            {variants.map((variant, index) => (
              <VariantForm
                key={index}
                onRemove={() => removeVariant(index)}
                onDuplicate={() => duplicateVariantAt(index)}
                variant={variant}
                labelError={getDuplicateLabelError(
                  duplicateLabelCounts,
                  variant.label
                )}
                onChange={(v) => updateVariantAt(index, v)}
              />
            ))}
            <Button
              onClick={addVariant}
              variant="outline"
              className="mt-4 w-full"
            >
              Add variant +
            </Button>
          </section>
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={hasDuplicateLabels}>
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
              Â¿EstÃ¡s seguro de salir sin guardar los cambios?
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
              SÃ­
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MethodEdit;

