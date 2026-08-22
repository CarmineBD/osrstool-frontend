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
  ACCOUNT_USERNAME_REQUIRED_FALLBACK_MESSAGE,
  subscribeToAccountUsernameRequired,
} from "@/lib/accountUsernameRequirement";
import { useAuth } from "@/auth/AuthProvider";

export function AccountUsernameRequiredDialog() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [notificationUserId, setNotificationUserId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState(
    ACCOUNT_USERNAME_REQUIRED_FALLBACK_MESSAGE,
  );

  useEffect(() => {
    return subscribeToAccountUsernameRequired((payload) => {
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

      setMessage(payload.message || ACCOUNT_USERNAME_REQUIRED_FALLBACK_MESSAGE);
      setNotificationUserId(payload.userId ?? activeUserId);
      setOpen(true);
    });
  }, [location.pathname, session?.user?.id]);

  useEffect(() => {
    setOpen(false);
    setNotificationUserId(null);
    setMessage(ACCOUNT_USERNAME_REQUIRED_FALLBACK_MESSAGE);
  }, [session?.user?.id]);

  const handleChooseUsername = () => {
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
          <AlertDialogTitle>Account username required</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline">
              Maybe later
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button type="button" onClick={handleChooseUsername}>
              Choose account username
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
