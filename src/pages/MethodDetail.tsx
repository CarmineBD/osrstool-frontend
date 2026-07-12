import { useNavigate } from "react-router-dom";
import {
  EDITOR_PAGE_EYEBROW_CLASS,
  EDITOR_PAGE_SHELL_CLASS,
  EDITOR_TAB_LIST_CLASS,
  SectionHeader,
} from "@/components/method-editor/MethodEditorPrimitives";
import { VariantTabLabel } from "@/components/VariantTabLabel";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <div className="container mx-auto rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        Error: {`${state.error}`}
      </div>
    );
  }

  if (!state.method) {
    return (
      <div className="container mx-auto rounded-xl border border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
        No se encontro el metodo.
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6">
      <section className={`${EDITOR_PAGE_SHELL_CLASS} p-6`}>
        <div className="space-y-3">
          <p className={EDITOR_PAGE_EYEBROW_CLASS}>Money making method</p>
          <MethodDetailHeader
            method={state.method}
            isSuperAdmin={state.isSuperAdmin}
            onEditClick={() =>
              navigate(`/moneyMakingMethod/${state.methodSlug}/edit`)
            }
          />
        </div>
      </section>

      <section className={`${EDITOR_PAGE_SHELL_CLASS} p-6`}>
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
          <SectionHeader
            eyebrow="Details"
            title={state.hasMultipleVariants ? "Variants" : "Variant"}
            description={
              state.hasMultipleVariants
                ? "Select a variant to compare requirements, loot, metrics, and history without leaving the page."
                : "Review the active scenario, its requirements, and the performance data for this method."
            }
            level="h2"
            actions={
              state.hasMultipleVariants ? (
                <Badge variant="outline" size="sm">
                  {state.method.variants.length} variants
                </Badge>
              ) : undefined
            }
          />

          {state.hasMultipleVariants ? (
            <TabsList className={EDITOR_TAB_LIST_CLASS}>
              {state.method.variants.map((variant, index) => (
                <TabsTrigger
                  key={getVariantTabValue(variant, index)}
                  value={getVariantTabValue(variant, index)}
                  className="h-10 max-w-full flex-none px-3"
                >
                  <VariantTabLabel
                    label={variant.label}
                    iconUrl={
                      variant.icon_id
                        ? state.itemsMap[variant.icon_id]?.iconUrl
                        : undefined
                    }
                  />
                </TabsTrigger>
              ))}
            </TabsList>
          ) : null}

          {state.method.variants.map((variant, index) => (
            <TabsContent
              key={getVariantTabValue(variant, index)}
              value={getVariantTabValue(variant, index)}
            >
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
                <div className="order-2 min-w-0 lg:order-1">
                  <MethodVariantContent
                    variant={variant}
                    itemsMap={state.itemsMap}
                    username={username}
                    iconUrl={
                      variant.icon_id
                        ? state.itemsMap[variant.icon_id]?.iconUrl
                        : undefined
                    }
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
