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

interface MethodUpsertDialogsProps {
  deleteConfirmOpen: boolean;
  confirmOpen: boolean;
  isDeleting: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  onConfirmOpenChange: (open: boolean) => void;
  onDeleteMethod: () => void | Promise<void>;
  onDiscardConfirmed: () => void;
}

export function MethodUpsertDialogs({
  deleteConfirmOpen,
  confirmOpen,
  isDeleting,
  onDeleteOpenChange,
  onConfirmOpenChange,
  onDeleteMethod,
  onDiscardConfirmed,
}: MethodUpsertDialogsProps) {
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

      <AlertDialog open={confirmOpen} onOpenChange={onConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Estas seguro de salir sin guardar los cambios?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onConfirmOpenChange(false)}>
              No
            </AlertDialogCancel>
            <AlertDialogAction onClick={onDiscardConfirmed}>Si</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
