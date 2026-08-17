import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/auth/AuthProvider";
import { useMe } from "@/hooks/useMe";
import {
  ACCOUNT_USERNAME_MAX_LENGTH,
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
  const currentVersion =
    meQuery.data?.data?.terms?.currentVersion?.trim() || "the current version";
  const hasAccountUsername = Boolean(meQuery.data?.data?.username);
  const needsTermsAcceptance = !termsAccepted;
  const needsAccountUsername = !hasAccountUsername;
  const normalizedAccountUsername = normalizeAccountUsername(accountUsernameInput);
  const isAccountUsernameValid =
    !needsAccountUsername || !validateAccountUsername(normalizedAccountUsername);

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
    (!needsAccountUsername || isAccountUsernameValid);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (completeSetupMutation.isPending) return;

    setGeneralError(null);

    let normalizedUsername: string | null = null;
    if (needsAccountUsername) {
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
      <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Complete your account setup</CardTitle>
            <CardDescription>
              Checking your account requirements...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Complete your account setup</CardTitle>
          <CardDescription>
            Finish the required setup for your RSMethods account before
            continuing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {meQuery.error ? (
            <p className="text-sm text-destructive">
              {meQuery.error instanceof Error
                ? meQuery.error.message
                : "Unable to load your account requirements."}
            </p>
          ) : null}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {needsAccountUsername ? (
              <div className="space-y-4 rounded-xl border border-border/70 bg-background/40 p-4">
                <div className="space-y-2">
                  <h2 className="text-base font-semibold text-foreground">
                    Choose your RSMethods username
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    This username is required, must be unique, and cannot
                    currently be changed after you save it.
                  </p>
                </div>

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
                        setValidationError(null);
                        setGeneralError(null);
                        setAccountUsernameInput(
                          event.target.value
                            .toLowerCase()
                            .slice(0, ACCOUNT_USERNAME_MAX_LENGTH),
                        );
                      }}
                      aria-invalid={validationError ? true : undefined}
                      disabled={completeSetupMutation.isPending}
                      required
                    />
                  </FieldContent>
                  <FieldDescription>
                    3 to 20 characters. Use lowercase letters, numbers, and
                    underscores. It must start with a letter or number.
                  </FieldDescription>
                  <FieldError>{validationError}</FieldError>
                </Field>
              </div>
            ) : null}

            {needsTermsAcceptance ? (
              <div className="space-y-4 rounded-xl border border-border/70 bg-background/40 p-4">
                <div className="space-y-2">
                  <h2 className="text-base font-semibold text-foreground">
                    Accept the current Terms of Use
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Current version:{" "}
                    <span className="font-medium text-foreground">
                      {currentVersion}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Read the{" "}
                    <Link
                      className="font-medium text-primary hover:underline"
                      to="/terms-of-use"
                    >
                      Terms of Use
                    </Link>{" "}
                    before continuing. The{" "}
                    <Link
                      className="font-medium text-primary hover:underline"
                      to="/privacy-policy"
                    >
                      Privacy Policy
                    </Link>{" "}
                    is provided here for information about data handling and
                    does not require separate consent on this screen.
                  </p>
                </div>

                <Field orientation="horizontal">
                  <input
                    id="accept-terms-checkbox"
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border border-input"
                    checked={acceptedTerms}
                    onChange={(event) => {
                      setGeneralError(null);
                      setAcceptedTerms(event.target.checked);
                    }}
                    disabled={completeSetupMutation.isPending}
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="accept-terms-checkbox">
                      I have read and accept the current Terms of Use.
                    </FieldLabel>
                    <FieldDescription>
                      This acceptance is recorded for your authenticated account
                      in the backend when you save this form.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </div>
            ) : null}

            {generalError ? (
              <p className="text-sm text-destructive">{generalError}</p>
            ) : null}

            {mutationErrorMessage ? (
              <p className="text-sm text-destructive">{mutationErrorMessage}</p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="submit"
                className="sm:flex-1"
                disabled={!canSubmit}
              >
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
