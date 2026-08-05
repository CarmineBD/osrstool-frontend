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

export function AccountUsernameRequiredDialog() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(
    ACCOUNT_USERNAME_REQUIRED_FALLBACK_MESSAGE,
  );

  useEffect(() => {
    return subscribeToAccountUsernameRequired((payload) => {
      if (location.pathname === "/account/onboarding") {
        return;
      }

      setMessage(payload.message || ACCOUNT_USERNAME_REQUIRED_FALLBACK_MESSAGE);
      setOpen(true);
    });
  }, [location.pathname]);

  const handleChooseUsername = () => {
    setOpen(false);
    navigate("/account/onboarding", {
      state: { from: location },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Account username required</AlertDialogTitle>
          <AlertDialogDescription>
            {message}
          </AlertDialogDescription>
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
