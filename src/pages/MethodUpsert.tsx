import { MethodUpsertDialogs } from "@/features/method-upsert/MethodUpsertDialogs";
import { MethodUpsertForm } from "@/features/method-upsert/MethodUpsertForm";
import { MethodUpsertSkeleton } from "@/features/method-upsert/MethodUpsertSkeleton";
import {
  type MethodUpsertMode,
  useMethodUpsert,
} from "@/features/method-upsert/useMethodUpsert";

type Props = {
  mode: MethodUpsertMode;
};

export function MethodUpsert({ mode }: Props) {
  const state = useMethodUpsert(mode);

  if (state.isEditMode && state.isLoading) {
    return <MethodUpsertSkeleton />;
  }

  if (state.isEditMode && state.error) {
    return <p className="text-red-500">Error: {`${state.error}`}</p>;
  }

  if (state.isEditMode && !state.method) {
    return <p>Method not found.</p>;
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-4 md:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Method editor
      </p>
      <h1 className="mt-1 text-3xl font-bold">
        {state.isEditMode ? "Edit method" : "Create method"}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Organize the core method details first, then structure each variant so
        the form is easier to scan and maintain.
      </p>

      <MethodUpsertForm
        isEditMode={state.isEditMode}
        form={state.form}
        enabled={state.enabled}
        onEnabledChange={state.setEnabled}
        onSubmit={state.onSubmit}
        onSubmitAttempt={() => state.setShowVariantValidationErrors(true)}
        onFormKeyDown={state.handleFormKeyDown}
        selectorCatalogLoading={state.selectorCatalogLoading}
        skillOptions={state.skillOptions}
        questOptions={state.questOptions}
        achievementDiaryOptions={state.achievementDiaryOptions}
        variants={state.variants}
        onAddVariant={state.addVariant}
        onRemoveVariant={state.removeVariant}
        onDuplicateVariant={state.duplicateVariantAt}
        onUpdateVariant={state.updateVariantAt}
        isVariantLabelDuplicate={state.isVariantLabelDuplicate}
        hasDuplicateVariantLabels={state.hasDuplicateVariantLabels}
        showVariantValidationErrors={state.showVariantValidationErrors}
        isSaving={state.isSaving}
        isDeleting={state.isDeleting}
        onCancel={state.handleCancel}
        onRequestDelete={() => state.setDeleteConfirmOpen(true)}
      />

      <MethodUpsertDialogs
        deleteConfirmOpen={state.deleteConfirmOpen}
        confirmOpen={state.confirmOpen}
        isDeleting={state.isDeleting}
        onDeleteOpenChange={(open) => {
          if (state.isDeleting) return;
          state.setDeleteConfirmOpen(open);
        }}
        onConfirmOpenChange={state.setConfirmOpen}
        onDeleteMethod={state.handleDeleteMethod}
        onDiscardConfirmed={state.handleDiscardConfirmed}
      />
    </div>
  );
}
