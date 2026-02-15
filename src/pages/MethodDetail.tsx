import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUsername } from "@/contexts/UsernameContext";
import { MethodDetailHeader } from "@/features/method-detail/MethodDetailHeader";
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

  if (state.isLoading) return <p>Cargando m&eacute;todo&hellip;</p>;
  if (state.error) return <p className="text-red-500">❌ {`${state.error}`}</p>;
  if (!state.method) return <p>No se encontr&oacute; el m&eacute;todo.</p>;

  return (
    <div className="relative mx-auto max-w-5xl rounded bg-white p-6 shadow">
      <MethodDetailHeader
        method={state.method}
        itemsMap={state.itemsMap}
        isSuperAdmin={state.isSuperAdmin}
        onEditClick={() => navigate(`/moneyMakingMethod/${state.methodSlug}/edit`)}
      />

      {state.hasMultipleVariants ? <h3 className="mb-2 font-semibold">Variants:</h3> : null}

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
              inputsTotal={state.getItemsTotal(variant.inputs)}
              outputsTotal={state.getItemsTotal(variant.outputs)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
