import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AccountSetupSection } from "@/components/account-setup/AccountSetupSection";
import { TermsAcceptanceField } from "@/components/account-setup/TermsAcceptanceField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
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
      <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-4 py-8">
        <Card className="w-full bg-surface-panel shadow-none">
          <CardHeader className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Account setup
            </p>
            <h1 className="text-3xl font-semibold leading-9 tracking-tight text-foreground">
              Complete your account setup
            </h1>
            <p className="text-sm leading-5 text-muted-foreground">
              Checking your account requirements...
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-4 py-8">
      <Card className="w-full bg-surface-panel shadow-none">
        <CardHeader className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {pageCopy.eyebrow}
          </p>
          <h1 className="text-3xl font-semibold leading-9 tracking-tight text-foreground">
            {pageCopy.title}
          </h1>
          <p className="text-sm leading-5 text-muted-foreground">
            {pageCopy.description}
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          {meQuery.error ? (
            <p className="text-[13px] font-medium leading-[18px] text-destructive">
              {meQuery.error instanceof Error
                ? meQuery.error.message
                : "Unable to load your account requirements."}
            </p>
          ) : null}

          <form className="space-y-8" onSubmit={handleSubmit}>
            {needsAccountUsername ? (
              <AccountSetupSection
                title="RSMethods username"
                description={
                  <p>
                    Your RSMethods username. It can differ from your OSRS
                    username and cannot be changed later.
                  </p>
                }
              >
                <Field>
                  <FieldLabel htmlFor="account-username">
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
                      required
                    />
                  </FieldContent>

                  <FieldError className="text-[13px] font-medium leading-[18px]">
                    {validationError}
                  </FieldError>
                </Field>
              </AccountSetupSection>
            ) : null}

            {needsAccountUsername && needsTermsAcceptance ? <Separator /> : null}

            {needsTermsAcceptance ? (
              <AccountSetupSection
                title="Terms of Use"
                description={
                  <p>
                    Review the{" "}
                    <Link
                      className="font-medium text-link underline underline-offset-4 transition-colors hover:text-link-hover"
                      to="/terms-of-use"
                    >
                      Terms of Use
                    </Link>{" "}
                    and{" "}
                    <Link
                      className="font-medium text-link underline underline-offset-4 transition-colors hover:text-link-hover"
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
              </AccountSetupSection>
            ) : null}

            {(generalError || mutationErrorMessage) && <Separator />}

            {generalError ? (
              <p className="text-[13px] font-medium leading-[18px] text-destructive">
                {generalError}
              </p>
            ) : null}

            {mutationErrorMessage ? (
              <p className="text-[13px] font-medium leading-[18px] text-destructive">
                {mutationErrorMessage}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button type="submit" className="sm:flex-1" disabled={!canSubmit}>
                {completeSetupMutation.isPending
                  ? "Saving..."
                  : "Complete account"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="sm:flex-1"
                disabled={completeSetupMutation.isPending}
                onClick={() => {
                  void handleSignOut();
                }}
              >
                Sign out
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
