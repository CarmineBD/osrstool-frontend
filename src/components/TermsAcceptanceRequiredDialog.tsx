import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import {
  subscribeToTermsAcceptanceRequired,
  TERMS_ACCEPTANCE_REQUIRED_FALLBACK_MESSAGE,
} from "@/lib/termsAcceptanceRequirement";

export function TermsAcceptanceRequiredDialog() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(
    TERMS_ACCEPTANCE_REQUIRED_FALLBACK_MESSAGE,
  );

  useEffect(() => {
    return subscribeToTermsAcceptanceRequired((payload) => {
      if (
        location.pathname === "/account/onboarding" ||
        location.pathname === "/accept-terms"
      ) {
        return;
      }

      setMessage(payload.message || TERMS_ACCEPTANCE_REQUIRED_FALLBACK_MESSAGE);
      setOpen(true);
    });
  }, [location.pathname]);

  const handleReviewTerms = () => {
    setOpen(false);
    navigate("/account/onboarding", {
      state: { from: location },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Terms acceptance required</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline">
              Maybe later
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button type="button" onClick={handleReviewTerms}>
              Review terms
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
