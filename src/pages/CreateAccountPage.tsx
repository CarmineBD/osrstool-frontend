import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { TermsAcceptanceField } from "@/components/account-setup/TermsAcceptanceField";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EMAIL_MAX_LENGTH,
  normalizeBoundedText,
  PASSWORD_MAX_LENGTH,
} from "@/lib/validation";
import { CURRENT_TERMS_VERSION } from "@/lib/termsOfUse";

const MIN_PASSWORD_LENGTH = 6;

type LocationState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

export function CreateAccountPage() {
  const { signUp, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const termsCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    navigate("/account/onboarding", {
      replace: true,
      state,
    });
  }, [navigate, session, state]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      );
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!hasAcceptedTerms) {
      setTermsError("You must accept the Terms of Use to create an account.");
      termsCheckboxRef.current?.focus();
      return;
    }

    setTermsError(null);
    setError(null);
    setInfo(null);
    setIsSubmitting(true);
    const result = await signUp(
      email.trim(),
      password,
      CURRENT_TERMS_VERSION,
    );
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.needsEmailConfirmation) {
      setInfo(
        "Account created. Check your email to confirm registration, then sign in to continue.",
      );
      return;
    }

    navigate("/account/onboarding", {
      replace: true,
      state,
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>
            Create an email and password account for RSMethods.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="create-account-email">Email</Label>
              <Input
                id="create-account-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                maxLength={EMAIL_MAX_LENGTH}
                onChange={(event) =>
                  setEmail(
                    normalizeBoundedText(event.target.value, EMAIL_MAX_LENGTH),
                  )
                }
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-account-password">Password</Label>
              <InputGroup>
                <InputGroupInput
                  id="create-account-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  maxLength={PASSWORD_MAX_LENGTH}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={MIN_PASSWORD_LENGTH}
                  disabled={isSubmitting}
                  required
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    size="icon-xs"
                    onClick={() => setShowPassword((previous) => !previous)}
                    type="button"
                    variant="ghost"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-account-repeat-password">
                Repeat password
              </Label>
              <InputGroup>
                <InputGroupInput
                  id="create-account-repeat-password"
                  type={showRepeatPassword ? "text" : "password"}
                  value={repeatPassword}
                  maxLength={PASSWORD_MAX_LENGTH}
                  onChange={(event) => setRepeatPassword(event.target.value)}
                  minLength={MIN_PASSWORD_LENGTH}
                  disabled={isSubmitting}
                  required
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label={
                      showRepeatPassword
                        ? "Hide repeated password"
                        : "Show repeated password"
                    }
                    size="icon-xs"
                    onClick={() =>
                      setShowRepeatPassword((previous) => !previous)
                    }
                    type="button"
                    variant="ghost"
                  >
                    {showRepeatPassword ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>

            <p className="text-sm text-muted-foreground">
              You must accept the current{" "}
              <Link
                className="font-medium text-link underline underline-offset-4 transition-colors hover:text-link-hover"
                to="/terms-of-use"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Use
                <span className="sr-only"> (opens in a new tab)</span>
              </Link>
              . After creating your account, you will finish setup by choosing
              your RSMethods username. You can also review the{" "}
              <Link
                className="font-medium text-link underline underline-offset-4 transition-colors hover:text-link-hover"
                to="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
                <span className="sr-only"> (opens in a new tab)</span>
              </Link>{" "}
              before continuing.
            </p>
            <TermsAcceptanceField
              checkboxId="create-account-terms-checkbox"
              checkboxRef={termsCheckboxRef}
              checked={hasAcceptedTerms}
              disabled={isSubmitting}
              error={termsError}
              onCheckedChange={(checked) => {
                setHasAcceptedTerms(checked);
                if (checked) {
                  setTermsError(null);
                }
              }}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {info ? <p className="text-sm text-success">{info}</p> : null}

            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
              <Button
                asChild
                type="button"
                variant="outline"
                className="w-full"
              >
                <Link to="/login">Back to sign in</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
