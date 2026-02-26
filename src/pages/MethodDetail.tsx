import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUsername } from "@/contexts/UsernameContext";
import { MethodDetailHeader } from "@/features/method-detail/MethodDetailHeader";
import { MethodDetailSkeleton } from "@/features/method-detail/MethodDetailSkeleton";
import { MethodVariantContent } from "@/features/method-detail/MethodVariantContent";
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
      <div className="mx-auto max-w-5xl rounded border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        Error: {`${state.error}`}
      </div>
    );
  }

  if (!state.method) {
    return (
      <div className="mx-auto max-w-5xl rounded border p-6 text-sm text-muted-foreground">
        No se encontro el metodo.
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-5xl rounded bg-white p-6 shadow">
      <MethodDetailHeader
        method={state.method}
        itemsMap={state.itemsMap}
        isSuperAdmin={state.isSuperAdmin}
        onEditClick={() => navigate(`/moneyMakingMethod/${state.methodSlug}/edit`)}
      />

      {state.hasMultipleVariants ? (
        <h3 className="mb-2 font-semibold">Variants:</h3>
      ) : null}

      <Tabs
        value={state.activeSlug}
        onValueChange={(value) =>
          navigate(
            `/moneyMakingMethod/${state.methodSlug}${
              state.hasMultipleVariants ? `/${value}` : ""
            }`
          )
        }
        className="w-full"
      >
        {state.hasMultipleVariants ? (
          <TabsList>
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
            className="p-4"
          >
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
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
