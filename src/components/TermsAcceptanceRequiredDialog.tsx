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
import { useAuth } from "@/auth/AuthProvider";

export function TermsAcceptanceRequiredDialog() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [notificationUserId, setNotificationUserId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState(
    TERMS_ACCEPTANCE_REQUIRED_FALLBACK_MESSAGE,
  );

  useEffect(() => {
    return subscribeToTermsAcceptanceRequired((payload) => {
      const activeUserId = session?.user?.id ?? null;
      if (payload.userId && payload.userId !== activeUserId) {
        return;
      }

      if (
        location.pathname === "/account/onboarding" ||
        location.pathname === "/accept-terms"
      ) {
        return;
      }

      setMessage(payload.message || TERMS_ACCEPTANCE_REQUIRED_FALLBACK_MESSAGE);
      setNotificationUserId(payload.userId ?? activeUserId);
      setOpen(true);
    });
  }, [location.pathname, session?.user?.id]);

  useEffect(() => {
    setOpen(false);
    setNotificationUserId(null);
    setMessage(TERMS_ACCEPTANCE_REQUIRED_FALLBACK_MESSAGE);
  }, [session?.user?.id]);

  const handleReviewTerms = () => {
    setOpen(false);
    navigate("/account/onboarding", {
      state: { from: location },
    });
  };

  return (
    <AlertDialog
      open={open && notificationUserId === (session?.user?.id ?? null)}
      onOpenChange={setOpen}
    >
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
