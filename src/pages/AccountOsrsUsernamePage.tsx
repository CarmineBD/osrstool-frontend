import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AUTH_ACTION_ROW_CLASS,
  AUTH_CARD_CLASS,
  AUTH_CONTROL_CLASS,
  AuthPageHeader,
  AuthPageShell,
  AuthSection,
} from "@/components/auth/AuthPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useUsername } from "@/contexts/UsernameContext";
import {
  resolveAccountSetupRedirectPath,
  type AccountSetupLocationState,
} from "@/lib/accountSetupFlow";
import { normalizeBoundedText, USERNAME_MAX_LENGTH } from "@/lib/validation";

export function AccountOsrsUsernamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as AccountSetupLocationState | null;
  const redirectPath = resolveAccountSetupRedirectPath(locationState);
  const { username, lookupPlayer, isPlayerLookupPending, userError } =
    useUsername();
  const [usernameInput, setUsernameInput] = useState(username);

  const handleContinue = () => {
    navigate(redirectPath, { replace: true });
  };

  const handleSave = async () => {
    const normalizedUsername = normalizeBoundedText(
      usernameInput.trim(),
      USERNAME_MAX_LENGTH,
    );
    const player = await lookupPlayer(normalizedUsername);
    if (player) handleContinue();
  };

  return (
    <AuthPageShell>
      <Card className={`w-full ${AUTH_CARD_CLASS}`}>
        <AuthPageHeader
          eyebrow="Optional setup"
          title="Add your OSRS username"
          description="This step is optional for now. Add it if you want RSMethods to personalize filters and roadmap calculations."
        />
        <CardContent className="space-y-6 px-6">
          <AuthSection
            title="Character username"
            description="Use the username from the OSRS account you want to sync. You can skip this now and add it later."
          >
            <Field>
              <FieldLabel htmlFor="osrs-username" className="leading-5">
                OSRS username
              </FieldLabel>
              <FieldContent>
                <Input
                  id="osrs-username"
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  maxLength={USERNAME_MAX_LENGTH}
                  placeholder="Enter OSRS username"
                  value={usernameInput}
                  onChange={(event) =>
                    setUsernameInput(
                      normalizeBoundedText(
                        event.target.value,
                        USERNAME_MAX_LENGTH,
                      ),
                    )
                  }
                  className={AUTH_CONTROL_CLASS}
                />
              </FieldContent>
            </Field>
          </AuthSection>

          {userError ? (
            <p role="alert" className="text-sm text-destructive">
              {userError}
            </p>
          ) : null}

          <div className={AUTH_ACTION_ROW_CLASS}>
            <Button
              type="button"
              className="h-10"
              disabled={
                usernameInput.trim().length === 0 || isPlayerLookupPending
              }
              onClick={handleSave}
            >
              Save username
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={handleContinue}
            >
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
