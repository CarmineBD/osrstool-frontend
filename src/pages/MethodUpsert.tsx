import { MethodUpsertDialogs } from "@/features/method-upsert/MethodUpsertDialogs";
import { MethodUpsertForm } from "@/features/method-upsert/MethodUpsertForm";
import { MethodUpsertSkeleton } from "@/features/method-upsert/MethodUpsertSkeleton";
import { SectionHeader } from "@/components/method-editor/MethodEditorPrimitives";
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
    return (
      <div className="min-h-screen bg-surface-page">
        <div className="container mx-auto px-4 py-6 md:px-6">
          <p className="text-destructive">Error: {`${state.error}`}</p>
        </div>
      </div>
    );
  }

  if (state.isEditMode && !state.method) {
    return (
      <div className="min-h-screen bg-surface-page">
        <div className="container mx-auto px-4 py-6 md:px-6">
          <p>Method not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <div className="container mx-auto space-y-6 px-4 py-6 md:px-6">
        <SectionHeader
          eyebrow="Method editor"
          title={state.isEditMode ? "Edit method" : "Create method"}
          description="Organize the shared method details first, then define each variant with clear requirements, loot, and XP data."
          level="h1"
          bodyClassName="max-w-3xl"
        />

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
          membershipConflictOpen={state.membershipConflictOpen}
          membershipConflicts={state.membershipConflicts}
          membershipConflictMessage={state.membershipConflictMessage}
          isDeleting={state.isDeleting}
          isSaving={state.isSaving}
          onDeleteOpenChange={(open) => {
            if (state.isDeleting) return;
            state.setDeleteConfirmOpen(open);
          }}
          onConfirmOpenChange={state.setConfirmOpen}
          onMembershipConflictOpenChange={(open) => {
            if (state.isSaving) return;
            state.setMembershipConflictOpen(open);
          }}
          onDeleteMethod={state.handleDeleteMethod}
          onDiscardConfirmed={state.handleDiscardConfirmed}
          onRetryAsMembers={state.handleRetryAsMembers}
        />
      </div>
    </div>
  );
}
