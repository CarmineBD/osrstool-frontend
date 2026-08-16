import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  buildAuthRedirectPath,
  clearPendingAuthRedirectPath,
  consumePendingAuthRedirectPath,
  DEFAULT_AUTH_REDIRECT_PATH,
  persistPendingAuthRedirectPath,
} from "@/lib/authRedirect";
import {
  EMAIL_MAX_LENGTH,
  normalizeBoundedText,
  PASSWORD_MAX_LENGTH,
} from "@/lib/validation";
import { CURRENT_TERMS_VERSION } from "@/lib/termsOfUse";

type PendingAction = "google" | "sign-in" | "sign-up" | null;
type StatusTone = "error" | "success";

type LocationState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

const AUTH_CARD_CLASS =
  "border-border/70 bg-surface-panel-elevated shadow-sm";
const AUTH_BODY_TEXT_CLASS = "text-sm leading-5 text-muted-foreground";
const AUTH_META_TEXT_CLASS = "text-xs font-medium leading-4 text-muted-foreground";
const AUTH_INLINE_LINK_CLASS =
  "font-medium text-link underline underline-offset-4 transition-colors hover:text-link-hover";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M21.805 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.055-4.4 3.055-7.65Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.08-.91 6.78-2.47l-3.3-2.56c-.91.61-2.08.98-3.48.98-2.67 0-4.94-1.8-5.75-4.23H2.84v2.64A9.996 9.996 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.25 13.72A5.995 5.995 0 0 1 5.93 12c0-.6.11-1.18.32-1.72V7.64H2.84A9.996 9.996 0 0 0 2 12c0 1.61.39 3.13 1.08 4.36l3.17-2.64Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.05c1.5 0 2.84.52 3.9 1.55l2.92-2.92C17.07 3.05 14.75 2 12 2a9.996 9.996 0 0 0-9.16 5.64l3.41 2.64C7.06 7.85 9.33 6.05 12 6.05Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AuthSectionDivider() {
  return (
    <div className="flex items-center gap-3" aria-label="Email sign-in section">
      <Separator className="flex-1" />
      <span className={AUTH_META_TEXT_CLASS}>Or continue with email</span>
      <Separator className="flex-1" />
    </div>
  );
}

function AuthStatusMessage({
  children,
  tone,
}: {
  children: string;
  tone: StatusTone;
}) {
  const toneClassName =
    tone === "error"
      ? "border-danger/20 bg-danger-soft text-danger-foreground"
      : "border-success/20 bg-success-soft text-success-foreground";

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-[13px] font-medium leading-[18px] ${toneClassName}`}
    >
      {children}
    </p>
  );
}

type TermsConsentFieldProps = {
  checked: boolean;
  disabled: boolean;
  error: string | null;
  onChange: (checked: boolean) => void;
  checkboxRef: RefObject<HTMLInputElement | null>;
};

function TermsConsentField({
  checked,
  disabled,
  error,
  onChange,
  checkboxRef,
}: TermsConsentFieldProps) {
  return (
    <section className="rounded-lg border border-border/70 bg-surface-panel-subtle p-4">
      <div className="space-y-3">
        <p id="sign-up-terms-hint" className={AUTH_META_TEXT_CLASS}>
          Required only to create an account.
        </p>

        <div className="flex items-start gap-3">
          <input
            ref={checkboxRef}
            id="sign-up-terms"
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.currentTarget.checked)}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={
              error
                ? "sign-up-terms-hint sign-up-terms-error"
                : "sign-up-terms-hint"
            }
            aria-labelledby="sign-up-terms-prefix sign-up-terms-link"
          />

          <div className="min-w-0 space-y-1.5">
            <div className="text-sm leading-5 text-foreground">
              <Label
                htmlFor="sign-up-terms"
                className="cursor-pointer text-sm leading-5"
              >
                <span id="sign-up-terms-prefix">I accept the </span>
              </Label>
              <Link
                id="sign-up-terms-link"
                to="/terms-of-use"
                target="_blank"
                rel="noopener noreferrer"
                className={AUTH_INLINE_LINK_CLASS}
              >
                Terms of Use
                <span className="sr-only"> (opens in a new tab)</span>
              </Link>
              .
            </div>

            <p className={AUTH_BODY_TEXT_CLASS}>
              You can review the{" "}
              <Link
                to="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className={AUTH_INLINE_LINK_CLASS}
              >
                Privacy Policy
                <span className="sr-only"> (opens in a new tab)</span>
              </Link>
              .
            </p>
          </div>
        </div>

        {error ? (
          <p
            id="sign-up-terms-error"
            role="alert"
            className="text-[13px] font-medium leading-[18px] text-destructive"
          >
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function LoginPage() {
  const { signIn, signInWithGoogle, signUp, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const stateRedirectPath = buildAuthRedirectPath(state?.from);
  const authFormRef = useRef<HTMLFormElement>(null);
  const termsCheckboxRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const isSubmitting = pendingAction !== null;

  useEffect(() => {
    if (!session) return;
    if (stateRedirectPath) {
      clearPendingAuthRedirectPath();
      navigate(stateRedirectPath, { replace: true });
      return;
    }

    const redirectTo =
      consumePendingAuthRedirectPath() ?? DEFAULT_AUTH_REDIRECT_PATH;
    navigate(redirectTo, { replace: true });
  }, [navigate, session, stateRedirectPath]);

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setTermsError(null);
    setError(null);
    setInfo(null);
    setPendingAction("sign-in");
    const signInError = await signIn(email.trim(), password);
    setPendingAction(null);

    if (signInError) {
      setError(signInError);
      return;
    }

    clearPendingAuthRedirectPath();
    const redirectTo = stateRedirectPath ?? DEFAULT_AUTH_REDIRECT_PATH;
    navigate(redirectTo, { replace: true });
  };

  const handleSignUp = async () => {
    if (isSubmitting) return;
    if (!authFormRef.current?.reportValidity()) return;
    if (!hasAcceptedTerms) {
      setTermsError("You must accept the Terms of Use to create an account.");
      termsCheckboxRef.current?.focus();
      return;
    }

    setError(null);
    setInfo(null);
    setTermsError(null);
    setPendingAction("sign-up");
    const result = await signUp(email.trim(), password, CURRENT_TERMS_VERSION);
    setPendingAction(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.needsEmailConfirmation) {
      setInfo("Account created. Check your email to confirm registration.");
      return;
    }

    setInfo("Account created and signed in.");
    clearPendingAuthRedirectPath();
    navigate("/account", { replace: true });
  };

  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;

    setTermsError(null);
    setError(null);
    setInfo(null);
    persistPendingAuthRedirectPath(stateRedirectPath);
    setPendingAction("google");

    const oauthError = await signInWithGoogle();

    if (oauthError) {
      clearPendingAuthRedirectPath();
      setPendingAction(null);
      setError(oauthError);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col px-4 py-8 sm:px-6">
      <Card className={AUTH_CARD_CLASS}>
        <CardHeader className="gap-2 px-6 pb-0">
          <p className={AUTH_META_TEXT_CLASS}>Account access</p>
          <h1 className="text-3xl font-semibold leading-9 tracking-tight text-foreground">
            Sign in or create your account
          </h1>
          <p className={AUTH_BODY_TEXT_CLASS}>
            Continue with Google or use your email and password to access
            RSMethods.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 px-6">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={handleGoogleSignIn}
            className="h-10 w-full border-border/70 bg-surface-panel shadow-none hover:bg-surface-panel-subtle"
          >
            <GoogleIcon />
            {pendingAction === "google"
              ? "Connecting..."
              : "Continue with Google"}
          </Button>

          <AuthSectionDivider />

          <form ref={authFormRef} className="space-y-6" onSubmit={handleSignIn}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auth-email" className="leading-5">
                  Email
                </Label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  maxLength={EMAIL_MAX_LENGTH}
                  onChange={(event) =>
                    setEmail(
                      normalizeBoundedText(event.target.value, EMAIL_MAX_LENGTH),
                    )
                  }
                  className="h-10 border-input bg-background shadow-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="auth-password" className="leading-5">
                    Password
                  </Label>
                  <Link
                    to="/forgot-password"
                    className={`${AUTH_INLINE_LINK_CLASS} text-sm leading-5`}
                  >
                    Forgot your password?
                  </Link>
                </div>

                <InputGroup className="h-10 border-input bg-background shadow-none">
                  <InputGroupInput
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    maxLength={PASSWORD_MAX_LENGTH}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
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
            </div>

            {error ? <AuthStatusMessage tone="error">{error}</AuthStatusMessage> : null}
            {info ? <AuthStatusMessage tone="success">{info}</AuthStatusMessage> : null}

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 shadow-none"
                >
                  {pendingAction === "sign-in" ? "Processing..." : "Sign in"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handleSignUp}
                  aria-describedby="sign-up-terms-hint"
                  className="h-10 w-full border-border/70 bg-surface-panel shadow-none hover:bg-surface-panel-subtle"
                >
                  {pendingAction === "sign-up"
                    ? "Processing..."
                    : "Create account"}
                </Button>
              </div>

              <TermsConsentField
                checked={hasAcceptedTerms}
                disabled={isSubmitting}
                error={termsError}
                onChange={(checked) => {
                  setHasAcceptedTerms(checked);
                  if (checked) {
                    setTermsError(null);
                  }
                }}
                checkboxRef={termsCheckboxRef}
              />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
