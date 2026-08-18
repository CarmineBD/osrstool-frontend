import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
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
import { TermsAcceptanceField } from "@/components/account-setup/TermsAcceptanceField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <AuthPageShell>
      <Card className={`w-full ${AUTH_CARD_CLASS}`}>
        <AuthPageHeader
          eyebrow="Account access"
          title="Create your account"
          description={
            <p>
              Create an email and password account for RSMethods, then finish
              setup by choosing your account username.
            </p>
          }
        />
        <CardContent className="space-y-6 px-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <AuthSection
              title="Credentials"
              description="Create the email and password you will use to sign in."
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="create-account-email" className="leading-5">
                    Email
                  </Label>
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
                    className={AUTH_CONTROL_CLASS}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-account-password" className="leading-5">
                    Password
                  </Label>
                  <InputGroup className={AUTH_CONTROL_CLASS}>
                    <InputGroupInput
                      id="create-account-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      maxLength={PASSWORD_MAX_LENGTH}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={MIN_PASSWORD_LENGTH}
                      disabled={isSubmitting}
                      className="h-10"
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        size="icon-sm"
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
                  <Label
                    htmlFor="create-account-repeat-password"
                    className="leading-5"
                  >
                    Repeat password
                  </Label>
                  <InputGroup className={AUTH_CONTROL_CLASS}>
                    <InputGroupInput
                      id="create-account-repeat-password"
                      type={showRepeatPassword ? "text" : "password"}
                      value={repeatPassword}
                      maxLength={PASSWORD_MAX_LENGTH}
                      onChange={(event) => setRepeatPassword(event.target.value)}
                      minLength={MIN_PASSWORD_LENGTH}
                      disabled={isSubmitting}
                      className="h-10"
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        aria-label={
                          showRepeatPassword
                            ? "Hide repeated password"
                            : "Show repeated password"
                        }
                        size="icon-sm"
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
              </div>
            </AuthSection>

            <AuthSection
              title="Terms and privacy"
              description={
                <p>
                  Review the current{" "}
                  <Link
                    className={AUTH_INLINE_LINK_CLASS}
                    to="/terms-of-use"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Use
                    <span className="sr-only"> (opens in a new tab)</span>
                  </Link>{" "}
                  and{" "}
                  <Link
                    className={AUTH_INLINE_LINK_CLASS}
                    to="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                    <span className="sr-only"> (opens in a new tab)</span>
                  </Link>{" "}
                  before continuing.
                </p>
              }
            >
              <TermsAcceptanceField
                checkboxId="create-account-terms-checkbox"
                checkboxRef={termsCheckboxRef}
                checked={hasAcceptedTerms}
                disabled={isSubmitting}
                error={termsError}
                variant="plain"
                onCheckedChange={(checked) => {
                  setHasAcceptedTerms(checked);
                  if (checked) {
                    setTermsError(null);
                  }
                }}
              />
            </AuthSection>

            {error ? <AuthStatusMessage tone="error">{error}</AuthStatusMessage> : null}
            {info ? <AuthStatusMessage tone="success">{info}</AuthStatusMessage> : null}

            <div className={AUTH_ACTION_ROW_CLASS}>
              <Button type="submit" disabled={isSubmitting} className="h-10">
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
              <Button
                asChild
                type="button"
                variant="outline"
                className={AUTH_OUTLINE_BUTTON_CLASS}
              >
                <Link to="/login">Back to sign in</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
