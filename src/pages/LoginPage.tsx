import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  EMAIL_MAX_LENGTH,
  normalizeBoundedText,
  PASSWORD_MAX_LENGTH,
} from "@/lib/validation";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export function LoginPage() {
  const { signIn, signUp, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const redirectTo = state?.from?.pathname ?? "/account";
    navigate(redirectTo, { replace: true });
  }, [navigate, session, state?.from?.pathname]);

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);
    const signInError = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (signInError) {
      setError(signInError);
      return;
    }

    const redirectTo = state?.from?.pathname ?? "/account";
    navigate(redirectTo, { replace: true });
  };

  const handleSignUp = async () => {
    setError(null);
    setInfo(null);
    setIsSubmitting(true);
    const result = await signUp(email.trim(), password);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.needsEmailConfirmation) {
      setInfo("Account created. Check your email to confirm registration.");
      return;
    }

    setInfo("Account created and signed in.");
    navigate("/account", { replace: true });
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
          <CardDescription>
            Sign in or create an account with email and password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSignIn}>
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                maxLength={EMAIL_MAX_LENGTH}
                onChange={(event) =>
                  setEmail(
                    normalizeBoundedText(
                      event.target.value,
                      EMAIL_MAX_LENGTH,
                    ),
                  )
                }
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="auth-password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <InputGroup>
                <InputGroupInput
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  maxLength={PASSWORD_MAX_LENGTH}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label={showPassword ? "Hide password" : "Show password"}
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

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {info ? <p className="text-sm text-success">{info}</p> : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={isSubmitting} className="sm:flex-1">
                {isSubmitting ? "Processing..." : "Sign in"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleSignUp}
                className="sm:flex-1"
              >
                {isSubmitting ? "Processing..." : "Create account"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
