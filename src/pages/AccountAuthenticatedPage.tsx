import { CheckCircle2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AUTH_CARD_CLASS,
  AuthPageHeader,
  AuthPageShell,
  AuthSection,
  AuthStatusMessage,
} from "@/components/auth/AuthPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMe } from "@/hooks/useMe";
import type { AccountSetupLocationState } from "@/lib/accountSetupFlow";

function getNextStepCopy(
  needsAccountUsername: boolean,
  needsTermsAcceptance: boolean,
) {
  if (needsAccountUsername && needsTermsAcceptance) {
    return "Choose your RSMethods username to finish the required account setup.";
  }

  if (needsAccountUsername) {
    return "Next, choose your RSMethods username so your account setup is fully ready.";
  }

  return "Next, review the current terms so your account setup is fully ready.";
}

export function AccountAuthenticatedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as AccountSetupLocationState | null;
  const meQuery = useMe();
  const termsAccepted = meQuery.data?.data?.terms?.accepted === true;
  const hasAccountUsername = Boolean(meQuery.data?.data?.username);
  const needsTermsAcceptance = !termsAccepted;
  const needsAccountUsername = !hasAccountUsername;

  return (
    <AuthPageShell>
      <Card className={`w-full ${AUTH_CARD_CLASS}`}>
        <AuthPageHeader
          eyebrow="Account authenticated"
          title="Your account is ready to continue"
          description="Authentication completed successfully. Continue to finish the remaining setup steps."
        />
        <CardContent className="space-y-6 px-6">
          {meQuery.isLoading ? (
            <AuthStatusMessage tone="info">
              Checking your account setup...
            </AuthStatusMessage>
          ) : null}

          {meQuery.error ? (
            <AuthStatusMessage tone="error">
              {meQuery.error instanceof Error
                ? meQuery.error.message
                : "Unable to load your account setup right now."}
            </AuthStatusMessage>
          ) : null}

          {!meQuery.isLoading && !meQuery.error ? (
            <>
              <div className="flex justify-center">
                <div className="flex size-16 items-center justify-center rounded-full border border-success/30 bg-success-soft text-success-foreground">
                  <CheckCircle2 className="size-8" aria-hidden="true" />
                </div>
              </div>

              <AuthSection
                title="Next step"
                description={getNextStepCopy(
                  needsAccountUsername,
                  needsTermsAcceptance,
                )}
              >
                <p className="text-sm leading-5 text-muted-foreground">
                  After that, you can optionally add your OSRS username to
                  personalize filters and roadmaps.
                </p>
              </AuthSection>

              <Button
                type="button"
                className="h-10 w-full"
                onClick={() =>
                  navigate("/account/onboarding", {
                    replace: true,
                    state: locationState,
                  })
                }
              >
                Continue setup
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
