import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useUsername } from "@/contexts/UsernameContext";
import { MethodDetailHeader } from "@/features/method-detail/MethodDetailHeader";
import { MethodDetailSkeleton } from "@/features/method-detail/MethodDetailSkeleton";
import {
  MethodVariantContent,
  MethodVariantMetricsPanel,
} from "@/features/method-detail/MethodVariantContent";
import { useMethodDetail } from "@/features/method-detail/useMethodDetail";
import type { Variant } from "@/lib/api";

export type Props = Record<string, never>;

function getVariantTabValue(variant: Variant, fallbackIndex: number): string {
  return variant.slug ?? (variant.id ?? fallbackIndex.toString()).toString();
}

export function MethodDetail(_props: Props) {
  void _props;

  const navigate = useNavigate();
  const { username } = useUsername();
  const state = useMethodDetail();

  if (state.isLoading) return <MethodDetailSkeleton />;

  if (state.error) {
    return (
      <div className="container mx-auto rounded border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        Error: {`${state.error}`}
      </div>
    );
  }

  if (!state.method) {
    return (
      <div className="container mx-auto rounded border p-6 text-sm text-muted-foreground">
        No se encontro el metodo.
      </div>
    );
  }

  return (
    <div className="relative container mx-auto rounded bg-white p-6 shadow">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Money making method
        </p>
        <MethodDetailHeader
          method={state.method}
          isSuperAdmin={state.isSuperAdmin}
          onEditClick={() =>
            navigate(`/moneyMakingMethod/${state.methodSlug}/edit`)
          }
        />
      </div>

      <Separator className="my-8" />

      <section className="space-y-6">
        {state.hasMultipleVariants ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Details
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Variants</h1>
            <p className="text-sm text-muted-foreground">
              This method has multiple variants. Select a variant to see its
              details and metrics.
            </p>
          </div>
        ) : null}

        <Tabs
          value={state.activeSlug}
          onValueChange={(value) =>
            navigate(
              `/moneyMakingMethod/${state.methodSlug}${
                state.hasMultipleVariants ? `/${value}` : ""
              }`,
            )
          }
          className="w-full gap-6"
        >
          {state.hasMultipleVariants ? (
            <TabsList className="h-10">
              {state.method.variants.map((variant, index) => (
                <TabsTrigger
                  key={getVariantTabValue(variant, index)}
                  value={getVariantTabValue(variant, index)}
                >
                  {variant.label}
                </TabsTrigger>
              ))}
            </TabsList>
          ) : null}

          {state.method.variants.map((variant, index) => (
            <TabsContent
              key={getVariantTabValue(variant, index)}
              value={getVariantTabValue(variant, index)}
            >
              <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="order-2 min-w-0 lg:order-1">
                  <MethodVariantContent
                    variant={variant}
                    itemsMap={state.itemsMap}
                    username={username}
                    inputsTotal={
                      state.isItemsLoading
                        ? undefined
                        : state.getItemsTotal(variant.inputs)
                    }
                    outputsTotal={
                      state.isItemsLoading
                        ? undefined
                        : state.getItemsTotal(variant.outputs)
                    }
                    isItemsLoading={state.isItemsLoading}
                  />
                </div>

                <div className="order-1 lg:sticky lg:top-24 lg:order-2 lg:self-start">
                  <MethodVariantMetricsPanel variant={variant} />
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </div>
  );
}
