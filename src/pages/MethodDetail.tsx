import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  EDITOR_PAGE_EYEBROW_CLASS,
  EmptySelectionState,
} from "@/components/method-editor/MethodEditorPrimitives";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useUsername } from "@/contexts/UsernameContext";
import { MethodDetailHeader } from "@/features/method-detail/MethodDetailHeader";
import { MethodDetailSkeleton } from "@/features/method-detail/MethodDetailSkeleton";
import {
  MethodVariantContent,
  MethodVariantMetricsPanel,
} from "@/features/method-detail/MethodVariantContent";
import { MethodVariantSelector } from "@/features/method-detail/MethodVariantSelector";
import {
  DEFAULT_VARIANT_SORT_MODE,
  getVariantGpPerXpHigh,
  getOrderedVariants,
  getVariantSortMetricValue,
  type VariantSortMode,
} from "@/features/method-detail/variantOrdering";
import { useMethodDetail } from "@/features/method-detail/useMethodDetail";
import {
  getIconReferenceKey,
  normalizeIconSource,
  type Variant,
} from "@/lib/api";

export type Props = Record<string, never>;

function getVariantTabValue(variant: Variant, fallbackIndex: number): string {
  return variant.slug ?? (variant.id ?? fallbackIndex.toString()).toString();
}

export function MethodDetail(_props: Props) {
  void _props;

  const navigate = useNavigate();
  const { username } = useUsername();
  const state = useMethodDetail();
  const [variantSortMode, setVariantSortMode] = useState<VariantSortMode>(
    DEFAULT_VARIANT_SORT_MODE,
  );

  if (state.isLoading) return <MethodDetailSkeleton />;

  if (state.error) {
    return (
      <div className="min-h-screen bg-surface-page">
        <div className="container mx-auto rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          Error: {`${state.error}`}
        </div>
      </div>
    );
  }

  if (!state.method) {
    return (
      <div className="min-h-screen bg-surface-page">
        <div className="container mx-auto rounded-xl border border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
          Method not found.
        </div>
      </div>
    );
  }

  const activeVariantIndex = state.method.variants.findIndex(
    (variant, index) => getVariantTabValue(variant, index) === state.activeSlug,
  );
  const resolvedVariantIndex = activeVariantIndex >= 0 ? activeVariantIndex : 0;
  const activeVariant = state.method.variants[resolvedVariantIndex];
  const activeValue = activeVariant
    ? getVariantTabValue(activeVariant, resolvedVariantIndex)
    : "";
  const variantSelectorItems = getOrderedVariants(
    state.method.variants,
    variantSortMode,
  ).map(({ variant, originalIndex, isNotViable }) => ({
    value: getVariantTabValue(variant, originalIndex),
    label: variant.label,
    iconUrl: variant.icon_id
      ? state.iconMap[
          getIconReferenceKey({
            id: variant.icon_id,
            source: normalizeIconSource(variant.iconSource),
          })
        ]?.iconUrl
      : undefined,
    sortMetricValue: getVariantSortMetricValue(variant, variantSortMode),
    gpPerXpHigh: getVariantGpPerXpHigh(variant),
    isNotViable,
  }));

  return (
    <div className="min-h-screen bg-surface-page">
      <div className="container mx-auto space-y-6 pt-6">
        <section className="space-y-3">
          <p className={EDITOR_PAGE_EYEBROW_CLASS}>Money making method</p>
          <MethodDetailHeader
            method={state.method}
            isSuperAdmin={state.isSuperAdmin}
            onEditClick={() =>
              navigate(`/moneyMakingMethod/${state.methodSlug}/edit`)
            }
          />
        </section>

        <Tabs
          value={activeValue}
          onValueChange={(value) =>
            navigate(
              `/moneyMakingMethod/${state.methodSlug}${
                state.hasMultipleVariants ? `/${value}` : ""
              }`,
            )
          }
          orientation={state.hasMultipleVariants ? "vertical" : "horizontal"}
          className="w-full gap-6"
        >
          {activeVariant ? (
            <div
              className={
                state.hasMultipleVariants
                  ? "grid items-start gap-6 lg:grid-cols-[max-content_minmax(0,1fr)]"
                  : "min-w-0"
              }
            >
              {state.hasMultipleVariants ? (
                <MethodVariantSelector
                  items={variantSelectorItems}
                  variantCount={state.method.variants.length}
                  sortMode={variantSortMode}
                  onSortModeChange={setVariantSortMode}
                />
              ) : null}

              <div className="min-w-0">
                <TabsContent
                  key={activeValue}
                  value={activeValue}
                  className="min-w-0"
                >
                  <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
                    <div className="order-2 min-w-0 lg:order-1">
                      <MethodVariantContent
                        method={state.method}
                        methodId={state.method.id}
                        variant={activeVariant}
                        itemsMap={state.itemsMap}
                        username={username}
                        creatorAvatarUrl={state.creatorAvatarUrl}
                        iconUrl={
                          activeVariant.icon_id
                            ? state.iconMap[
                                getIconReferenceKey({
                                  id: activeVariant.icon_id,
                                  source: normalizeIconSource(
                                    activeVariant.iconSource,
                                  ),
                                })
                              ]?.iconUrl
                            : undefined
                        }
                        inputsTotal={
                          state.isItemsLoading
                            ? undefined
                            : state.getItemsTotal(activeVariant.inputs)
                        }
                        outputsTotal={
                          state.isItemsLoading
                            ? undefined
                            : state.getItemsTotal(activeVariant.outputs)
                        }
                        isItemsLoading={state.isItemsLoading}
                      />
                    </div>

                    <div className="order-1 lg:sticky lg:top-24 lg:order-2 lg:self-start">
                      <MethodVariantMetricsPanel variant={activeVariant} />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </div>
          ) : (
            <EmptySelectionState description="No variants are configured for this method yet." />
          )}
        </Tabs>
      </div>
    </div>
  );
}
