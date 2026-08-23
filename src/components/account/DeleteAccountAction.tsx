import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { useUsername } from "@/contexts/UsernameContext";
import { deleteCurrentUser, ME_QUERY_KEY } from "@/lib/me";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type DeleteAccountActionProps = {
  disabled?: boolean;
  triggerVariant?: "button" | "text";
};

export function DeleteAccountAction({
  disabled = false,
  triggerVariant = "button",
}: DeleteAccountActionProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearUsername } = useUsername();
  const [open, setOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: deleteCurrentUser,
    onSuccess: async () => {
      await supabase.auth.signOut({ scope: "local" });
      clearUsername();
      queryClient.removeQueries({ queryKey: ME_QUERY_KEY });
      navigate("/", { replace: true });
    },
  });

  const trigger =
    triggerVariant === "button" ? (
      <Button type="button" variant="destructive" disabled={disabled}>
        Delete account
      </Button>
    ) : (
      <button
        type="button"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "h-auto justify-start px-0 py-0 text-sm font-medium text-destructive hover:bg-transparent hover:text-destructive hover:underline",
        )}
        disabled={disabled}
      >
        Delete account and remove my data
      </button>
    );

  const errorMessage =
    deleteMutation.error instanceof Error
      ? deleteMutation.error.message
      : "Unable to delete your account.";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (deleteMutation.isPending) {
          return;
        }

        if (!nextOpen) {
          deleteMutation.reset();
        }

        setOpen(nextOpen);
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your RSMethods account, linked profile
            data, likes, and related backend records. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {deleteMutation.isError ? (
          <p className="text-[13px] font-medium leading-[18px] text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel type="button" disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            className={buttonVariants({ variant: "destructive" })}
            disabled={deleteMutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (deleteMutation.isPending) {
                return;
              }

              deleteMutation.mutate();
            }}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
