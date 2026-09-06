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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [isFirstDialogOpen, setIsFirstDialogOpen] = useState(false);
  const [isFinalDialogOpen, setIsFinalDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

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

  const closeFinalDialog = () => {
    if (deleteMutation.isPending) {
      return;
    }

    deleteMutation.reset();
    setConfirmationText("");
    setIsFinalDialogOpen(false);
  };

  return (
    <>
      <AlertDialog
        open={isFirstDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            deleteMutation.reset();
          }

          setIsFirstDialogOpen(nextOpen);
        }}
      >
        <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your RSMethods account and all related data will be permanently
              deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className={buttonVariants({ variant: "destructive" })}
              onClick={(event) => {
                event.preventDefault();
                setIsFirstDialogOpen(false);
                setIsFinalDialogOpen(true);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isFinalDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeFinalDialog();
            return;
          }

          setIsFinalDialogOpen(true);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Final account deletion confirmation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Type "RSMethods" below to permanently delete your account, linked
              profile data, likes, and related backend records.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="delete-account-confirmation">
              Type "RSMethods" to confirm
            </Label>
            <Input
              id="delete-account-confirmation"
              value={confirmationText}
              autoComplete="off"
              disabled={deleteMutation.isPending}
              onChange={(event) => {
                setConfirmationText(event.target.value);
                deleteMutation.reset();
              }}
            />
          </div>

          {deleteMutation.isError ? (
            <p className="text-[13px] font-medium leading-[18px] text-destructive">
              {errorMessage}
            </p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel
              type="button"
              disabled={deleteMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className={buttonVariants({ variant: "destructive" })}
              disabled={
                deleteMutation.isPending || confirmationText !== "RSMethods"
              }
              onClick={(event) => {
                event.preventDefault();
                if (
                  deleteMutation.isPending ||
                  confirmationText !== "RSMethods"
                ) {
                  return;
                }

                deleteMutation.mutate();
              }}
            >
              {deleteMutation.isPending
                ? "Deleting..."
                : "Delete account permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
