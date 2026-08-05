import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
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
import { useMe } from "@/hooks/useMe";
import {
  ACCOUNT_USERNAME_MAX_LENGTH,
  normalizeAccountUsername,
  validateAccountUsername,
} from "@/lib/accountUsername";
import {
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
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const meQuery = useMe();
  const [accountUsernameInput, setAccountUsernameInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const locationState = location.state as LocationState | null;
  const redirectPath = resolveRedirectPath(locationState);

  const completeUsernameMutation = useMutation({
    mutationFn: completeAccountUsername,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      navigate(redirectPath, { replace: true });
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (completeUsernameMutation.isPending) return;

    const normalizedUsername = normalizeAccountUsername(accountUsernameInput);
    const nextValidationError = validateAccountUsername(normalizedUsername);
    setValidationError(nextValidationError);

    if (nextValidationError) {
      return;
    }

    completeUsernameMutation.mutate(normalizedUsername);
  };

  const mutationError = completeUsernameMutation.error;
  const conflictError =
    mutationError instanceof MeRequestError && mutationError.status === 409;
  const mutationErrorMessage = conflictError
    ? "This account username is already taken."
    : mutationError instanceof Error
      ? mutationError.message
      : null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Choose your account username</CardTitle>
          <CardDescription>
            Set the account username used for your OSRS Tool profile. This is separate from your OSRS character username.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {meQuery.error ? (
            <p className="text-sm text-destructive">
              {meQuery.error instanceof Error
                ? meQuery.error.message
                : "Unable to load your profile."}
            </p>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field>
              <FieldLabel htmlFor="account-username">Account username</FieldLabel>
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
                    setAccountUsernameInput(
                      event.target.value
                        .toLowerCase()
                        .slice(0, ACCOUNT_USERNAME_MAX_LENGTH),
                    );
                  }}
                  aria-invalid={validationError ? true : undefined}
                  disabled={completeUsernameMutation.isPending}
                  required
                />
              </FieldContent>
              <FieldDescription>
                3 to 20 characters. Use lowercase letters, numbers, and underscores. It must start with a letter or number.
              </FieldDescription>
              <FieldError>{validationError}</FieldError>
            </Field>

            {mutationErrorMessage ? (
              <p className="text-sm text-destructive">{mutationErrorMessage}</p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={completeUsernameMutation.isPending}
            >
              {completeUsernameMutation.isPending
                ? "Saving..."
                : "Save account username"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
