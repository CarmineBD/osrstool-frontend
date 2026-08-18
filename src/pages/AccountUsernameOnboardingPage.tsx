import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DeleteAccountAction } from "@/components/account/DeleteAccountAction";
import { TermsAcceptanceField } from "@/components/account-setup/TermsAcceptanceField";
import {
  AUTH_ACTION_ROW_CLASS,
  AUTH_CARD_CLASS,
  AUTH_CONTROL_CLASS,
  AUTH_INLINE_LINK_CLASS,
  AUTH_OUTLINE_BUTTON_CLASS,
  AuthPageHeader,
  AuthPageShell,
  AuthSection,
  AuthStatusMessage,
} from "@/components/auth/AuthPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/auth/AuthProvider";
import { useMe } from "@/hooks/useMe";
import {
  ACCOUNT_USERNAME_ALLOWED_CHARACTERS_MESSAGE,
  ACCOUNT_USERNAME_MAX_LENGTH,
  hasDisallowedAccountUsernameCharacters,
  normalizeAccountUsername,
  validateAccountUsername,
} from "@/lib/accountUsername";
import {
  acceptCurrentTerms,
  completeAccountUsername,
  ME_QUERY_KEY,
  MeRequestError,
} from "@/lib/me";

type LocationState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

function resolveRedirectPath(state: LocationState | null): string {
  if (!state?.from?.pathname) {
    return "/account";
  }

  return `${state.from.pathname}${state.from.search ?? ""}${state.from.hash ?? ""}`;
}

function getPageCopy(
  needsAccountUsername: boolean,
  needsTermsAcceptance: boolean,
) {
  if (needsAccountUsername && needsTermsAcceptance) {
    return {
      eyebrow: "Account setup",
      title: "Complete your account setup",
      description: "Complete these steps to continue.",
    };
  }

  if (needsAccountUsername) {
    return {
      eyebrow: "Account setup",
      title: "Choose your RSMethods username",
      description: "Set your account username to continue.",
    };
  }

  return {
    eyebrow: "Account setup",
    title: "Accept the current Terms of Use",
    description: "Accept the terms to continue.",
  };
}

export function AccountUsernameOnboardingPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const meQuery = useMe();
  const [accountUsernameInput, setAccountUsernameInput] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const locationState = location.state as LocationState | null;
  const redirectPath = resolveRedirectPath(locationState);
  const termsAccepted = meQuery.data?.data?.terms?.accepted === true;
  const hasAccountUsername = Boolean(meQuery.data?.data?.username);
  const needsTermsAcceptance = !termsAccepted;
  const needsAccountUsername = !hasAccountUsername;
  const hasInvalidAccountUsernameCharacters =
    hasDisallowedAccountUsernameCharacters(accountUsernameInput);
  const normalizedAccountUsername =
    normalizeAccountUsername(accountUsernameInput);
  const isAccountUsernameValid =
    !needsAccountUsername ||
    !validateAccountUsername(normalizedAccountUsername);

  const completeSetupMutation = useMutation({
    mutationFn: async (normalizedUsername: string | null) => {
      if (needsTermsAcceptance) {
        await acceptCurrentTerms();
      }

      if (needsAccountUsername && normalizedUsername) {
        await completeAccountUsername(normalizedUsername);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      navigate(redirectPath, { replace: true });
    },
  });
  const canSubmit =
    !completeSetupMutation.isPending &&
    (!needsTermsAcceptance || acceptedTerms) &&
    !hasInvalidAccountUsernameCharacters &&
    (!needsAccountUsername || isAccountUsernameValid);
  const pageCopy = getPageCopy(needsAccountUsername, needsTermsAcceptance);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (completeSetupMutation.isPending) return;

    setGeneralError(null);

    let normalizedUsername: string | null = null;
    if (needsAccountUsername) {
      if (hasDisallowedAccountUsernameCharacters(accountUsernameInput)) {
        setValidationError(ACCOUNT_USERNAME_ALLOWED_CHARACTERS_MESSAGE);
        return;
      }

      normalizedUsername = normalizeAccountUsername(accountUsernameInput);
      const nextValidationError = validateAccountUsername(normalizedUsername);
      setValidationError(nextValidationError);

      if (nextValidationError) {
        return;
      }
    } else {
      setValidationError(null);
    }

    if (needsTermsAcceptance && !acceptedTerms) {
      setGeneralError(
        "You must accept the current Terms of Use before continuing.",
      );
      return;
    }

    completeSetupMutation.mutate(normalizedUsername);
  };

  const handleSignOut = async () => {
    if (completeSetupMutation.isPending) return;

    const signOutError = await signOut();
    if (signOutError) {
      setGeneralError(signOutError);
      return;
    }

    navigate("/", { replace: true });
  };

  const mutationError = completeSetupMutation.error;
  const conflictError =
    mutationError instanceof MeRequestError && mutationError.status === 409;
  const mutationErrorMessage = conflictError
    ? "This account username is already taken."
    : mutationError instanceof Error
      ? mutationError.message
      : null;

  if (meQuery.isLoading) {
    return (
      <AuthPageShell>
        <Card className={`w-full ${AUTH_CARD_CLASS}`}>
          <AuthPageHeader
            eyebrow="Account setup"
            title="Complete your account setup"
            description="Checking your account requirements..."
          />
          <CardContent className="px-6">
            <AuthStatusMessage tone="info">
              Checking your account requirements...
            </AuthStatusMessage>
          </CardContent>
        </Card>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <Card className={`w-full ${AUTH_CARD_CLASS}`}>
        <AuthPageHeader
          eyebrow={pageCopy.eyebrow}
          title={pageCopy.title}
          description={pageCopy.description}
        />
        <CardContent className="space-y-6 px-6">
          {meQuery.error ? (
            <AuthStatusMessage tone="error">
              {meQuery.error instanceof Error
                ? meQuery.error.message
                : "Unable to load your account requirements."}
            </AuthStatusMessage>
          ) : null}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {needsAccountUsername ? (
              <AuthSection
                title="RSMethods username"
                description={
                  <p>
                    Your RSMethods username. It can differ from your OSRS
                    username and cannot be changed later.
                  </p>
                }
              >
                <Field>
                  <FieldLabel htmlFor="account-username" className="leading-5">
                    RSMethods username
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="account-username"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="text"
                      maxLength={ACCOUNT_USERNAME_MAX_LENGTH}
                      placeholder="Enter account username"
                      value={accountUsernameInput}
                      onChange={(event) => {
                        const nextValue = event.target.value
                          .toLowerCase()
                          .slice(0, ACCOUNT_USERNAME_MAX_LENGTH);

                        setValidationError(null);
                        setGeneralError(null);
                        setAccountUsernameInput(nextValue);

                        if (hasDisallowedAccountUsernameCharacters(nextValue)) {
                          setValidationError(
                            ACCOUNT_USERNAME_ALLOWED_CHARACTERS_MESSAGE,
                          );
                        }
                      }}
                      aria-invalid={validationError ? true : undefined}
                      disabled={completeSetupMutation.isPending}
                      className={AUTH_CONTROL_CLASS}
                      required
                    />
                  </FieldContent>

                  <FieldError className="text-[13px] font-medium leading-[18px]">
                    {validationError}
                  </FieldError>
                </Field>
              </AuthSection>
            ) : null}

            {needsTermsAcceptance ? (
              <AuthSection
                title="Terms of Use"
                description={
                  <p>
                    Review the{" "}
                    <Link
                      className={AUTH_INLINE_LINK_CLASS}
                      to="/terms-of-use"
                    >
                      Terms of Use
                    </Link>{" "}
                    and{" "}
                    <Link
                      className={AUTH_INLINE_LINK_CLASS}
                      to="/privacy-policy"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </p>
                }
              >
                <TermsAcceptanceField
                  checkboxId="accept-terms-checkbox"
                  checked={acceptedTerms}
                  disabled={completeSetupMutation.isPending}
                  variant="plain"
                  onCheckedChange={(checked) => {
                    setGeneralError(null);
                    setAcceptedTerms(checked);
                  }}
                />
              </AuthSection>
            ) : null}

            {generalError ? (
              <AuthStatusMessage tone="error">{generalError}</AuthStatusMessage>
            ) : null}

            {mutationErrorMessage ? (
              <AuthStatusMessage tone="error">
                {mutationErrorMessage}
              </AuthStatusMessage>
            ) : null}

            <div className={AUTH_ACTION_ROW_CLASS}>
              <Button type="submit" className="h-10" disabled={!canSubmit}>
                {completeSetupMutation.isPending
                  ? "Saving..."
                  : "Complete account"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={AUTH_OUTLINE_BUTTON_CLASS}
                disabled={completeSetupMutation.isPending}
                onClick={() => {
                  void handleSignOut();
                }}
              >
                Sign out
              </Button>
            </div>

            <div className="border-t border-border/70 pt-6">
              <DeleteAccountAction
                disabled={completeSetupMutation.isPending}
                triggerVariant="text"
              />
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
