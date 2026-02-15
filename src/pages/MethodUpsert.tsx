import { MethodUpsertDialogs } from "@/features/method-upsert/MethodUpsertDialogs";
import { MethodUpsertForm } from "@/features/method-upsert/MethodUpsertForm";
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
    return <p>Cargando metodo...</p>;
  }

  if (state.isEditMode && state.error) {
    return <p className="text-red-500">Error: {`${state.error}`}</p>;
  }

  if (state.isEditMode && !state.method) {
    return <p>No se encontro el metodo.</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <h1 className="text-3xl font-bold">
        {state.isEditMode ? "Edit method" : "Add new method"}
      </h1>

      <MethodUpsertForm
        isEditMode={state.isEditMode}
        form={state.form}
        enabled={state.enabled}
        onEnabledChange={state.setEnabled}
        onSubmit={state.onSubmit}
        onFormKeyDown={state.handleFormKeyDown}
        selectorCatalogLoading={state.selectorCatalogLoading}
        selectorCatalogError={state.selectorCatalogError}
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
