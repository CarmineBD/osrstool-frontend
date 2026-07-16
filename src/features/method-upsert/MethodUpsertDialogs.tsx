import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PixelArtIcon } from "@/components/method-editor/MethodEditorPrimitives";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fetchItems, type FreeToPlayVariantConflict, type Item } from "@/lib/api";
import { getItemsQueryKey } from "@/lib/queryKeys";
import { QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";

interface MethodUpsertDialogsProps {
  deleteConfirmOpen: boolean;
  confirmOpen: boolean;
  membershipConflictOpen: boolean;
  membershipConflicts: FreeToPlayVariantConflict[];
  membershipConflictMessage: string;
  isDeleting: boolean;
  isSaving: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  onConfirmOpenChange: (open: boolean) => void;
  onMembershipConflictOpenChange: (open: boolean) => void;
  onDeleteMethod: () => void | Promise<void>;
  onDiscardConfirmed: () => void;
  onRetryAsMembers: () => void | Promise<void>;
}

export function MethodUpsertDialogs({
  deleteConfirmOpen,
  confirmOpen,
  membershipConflictOpen,
  membershipConflicts,
  membershipConflictMessage,
  isDeleting,
  isSaving,
  onDeleteOpenChange,
  onConfirmOpenChange,
  onMembershipConflictOpenChange,
  onDeleteMethod,
  onDiscardConfirmed,
  onRetryAsMembers,
}: MethodUpsertDialogsProps) {
  const conflictItemIds = useMemo(
    () =>
      Array.from(
        new Set(
          membershipConflicts.flatMap((conflict) =>
            conflict.items
              .map((item) => item.id)
              .filter(
                (id): id is number =>
                  typeof id === "number" && Number.isInteger(id) && id > 0,
              ),
          ),
        ),
      ).sort((a, b) => a - b),
    [membershipConflicts],
  );

  const { data: conflictItemsMap = {} } = useQuery<Record<number, Item>>({
    queryKey: getItemsQueryKey(conflictItemIds),
    queryFn: () => fetchItems(conflictItemIds),
    enabled: conflictItemIds.length > 0,
    staleTime: QUERY_STALE_TIME_MS,
  });

  return (
    <>
      <AlertDialog open={deleteConfirmOpen} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this method?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              method and all of its variants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void onDeleteMethod();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={membershipConflictOpen}
        onOpenChange={onMembershipConflictOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Some free-to-play variants use members items
            </AlertDialogTitle>
            <AlertDialogDescription>
              {membershipConflictMessage ||
                "The backend rejected this save because the affected variants are marked as free-to-play but include members-only items."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-72 space-y-3 overflow-y-auto">
            {membershipConflicts.map((conflict) => (
              <div
                key={[
                  conflict.variantId ?? "",
                  conflict.variantSlug ?? "",
                  conflict.variantLabel,
                ].join("::")}
                className="rounded-lg border bg-muted/30 p-4"
              >
                <p className="text-sm font-semibold text-foreground">
                  {conflict.variantLabel}
                </p>
                <p className="mt-3 text-xs font-medium leading-4 text-muted-foreground">
                  Blocking items
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {conflict.items.map((item) => {
                    const iconUrl =
                      item.id !== undefined
                        ? conflictItemsMap[item.id]?.iconUrl
                        : undefined;

                    return (
                      <div
                        key={`${item.id ?? item.name}::${item.name}`}
                        className="inline-flex items-center gap-2 rounded-md border bg-background/80 px-3 py-2"
                        title={item.name}
                      >
                        {iconUrl ? (
                          <PixelArtIcon
                            src={iconUrl}
                            alt={item.name}
                            title={item.name}
                            size="native"
                          />
                        ) : null}
                        <span className="text-sm leading-5 text-foreground">
                          {item.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void onRetryAsMembers();
              }}
              disabled={isSaving}
            >
              {isSaving ? "Retrying..." : "Retry as P2P variants"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={onConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Any edits you made on this screen will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onConfirmOpenChange(false)}>
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={onDiscardConfirmed}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
