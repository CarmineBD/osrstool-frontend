import { useEffect, useState, type FormEvent } from "react";
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
  AuthSectionDivider,
  AuthStatusMessage,
} from "@/components/auth/AuthPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  buildAuthRedirectPath,
  clearPendingAuthRedirectPath,
  clearPendingPostAuthSetup,
  consumePendingPostAuthSetup,
  consumePendingAuthRedirectPath,
  DEFAULT_AUTH_REDIRECT_PATH,
  markPendingPostAuthSetup,
  persistPendingAuthRedirectPath,
} from "@/lib/authRedirect";
import { buildAccountSetupLocationState } from "@/lib/accountSetupFlow";
import {
  EMAIL_MAX_LENGTH,
  normalizeBoundedText,
  PASSWORD_MAX_LENGTH,
} from "@/lib/validation";

type PendingAction = "google" | "sign-in" | null;

type LocationState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

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

export function LoginPage() {
  const { signIn, signInWithGoogle, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const stateRedirectPath = buildAuthRedirectPath(state?.from);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const isSubmitting = pendingAction !== null;

  useEffect(() => {
    if (!session) return;
    if (consumePendingPostAuthSetup()) {
      const postAuthState = (() => {
        if (stateRedirectPath) {
          clearPendingAuthRedirectPath();
          return buildAccountSetupLocationState(stateRedirectPath);
        }

        const pendingRedirectPath = consumePendingAuthRedirectPath();
        return pendingRedirectPath
          ? buildAccountSetupLocationState(pendingRedirectPath)
          : state;
      })();

      navigate("/account/authenticated", {
        replace: true,
        state: postAuthState,
      });
      return;
    }

    if (stateRedirectPath) {
      clearPendingAuthRedirectPath();
      navigate(stateRedirectPath, { replace: true });
      return;
    }

    const redirectTo =
      consumePendingAuthRedirectPath() ?? DEFAULT_AUTH_REDIRECT_PATH;
    navigate(redirectTo, { replace: true });
  }, [navigate, session, state, stateRedirectPath]);

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

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

  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;

    setError(null);
    setInfo(null);
    persistPendingAuthRedirectPath(stateRedirectPath);
    markPendingPostAuthSetup();
    setPendingAction("google");

    const oauthError = await signInWithGoogle();

    if (oauthError) {
      clearPendingAuthRedirectPath();
      clearPendingPostAuthSetup();
      setPendingAction(null);
      setError(oauthError);
    }
  };

  const handleCreateAccount = () => {
    if (isSubmitting) return;
    navigate("/create-account", {
      state,
    });
  };

  return (
    <AuthPageShell>
      <Card className={`w-full ${AUTH_CARD_CLASS}`}>
        <AuthPageHeader
          eyebrow="Account access"
          title="Sign in or create your account"
          description={
            <p>
              Continue with Google or use your email and password to access
              RSMethods.
            </p>
          }
        />
        <CardContent className="space-y-6 px-6">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={handleGoogleSignIn}
            className={AUTH_OUTLINE_BUTTON_CLASS}
          >
            <GoogleIcon />
            {pendingAction === "google"
              ? "Connecting..."
              : "Continue with Google"}
          </Button>

          <AuthSectionDivider label="Or continue with email" />

          <form onSubmit={handleSignIn}>
            <AuthSection
              title="Email sign in"
              description="Enter your account email and password to continue."
            >
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
                    className={AUTH_CONTROL_CLASS}
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

                  <InputGroup className={AUTH_CONTROL_CLASS}>
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

              {error ? (
                <AuthStatusMessage tone="error">{error}</AuthStatusMessage>
              ) : null}
              {info ? (
                <AuthStatusMessage tone="success">{info}</AuthStatusMessage>
              ) : null}

              <div className={AUTH_ACTION_ROW_CLASS}>
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
                  onClick={handleCreateAccount}
                  className={AUTH_OUTLINE_BUTTON_CLASS}
                >
                  Create account
                </Button>
              </div>
            </AuthSection>
          </form>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
