import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import {
  AUTH_ACTION_ROW_CLASS,
  AUTH_CARD_CLASS,
  AUTH_CONTROL_CLASS,
  AUTH_OUTLINE_BUTTON_CLASS,
  AuthPageHeader,
  AuthPageShell,
  AuthSection,
  AuthStatusMessage,
} from "@/components/auth/AuthPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMAIL_MAX_LENGTH, normalizeBoundedText } from "@/lib/validation";

const RESET_PASSWORD_SUCCESS_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    const requestError = await requestPasswordReset(email.trim());

    setIsSubmitting(false);

    if (requestError) {
      setError(requestError);
      return;
    }

    setInfo(RESET_PASSWORD_SUCCESS_MESSAGE);
  };

  return (
    <AuthPageShell>
      <Card className={`w-full ${AUTH_CARD_CLASS}`}>
        <AuthPageHeader
          eyebrow="Account recovery"
          title="Reset password"
          description="Enter your account email and we will send you a password reset link."
        />
        <CardContent className="space-y-6 px-6">
          <form onSubmit={handleSubmit}>
            <AuthSection
              title="Recovery email"
              description="Use the email address linked to your RSMethods account."
            >
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="leading-5">
                  Email
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  maxLength={EMAIL_MAX_LENGTH}
                  onChange={(event) =>
                    setEmail(
                      normalizeBoundedText(event.target.value, EMAIL_MAX_LENGTH)
                    )
                  }
                  className={AUTH_CONTROL_CLASS}
                  required
                />
              </div>

              {error ? <AuthStatusMessage tone="error">{error}</AuthStatusMessage> : null}
              {info ? <AuthStatusMessage tone="success">{info}</AuthStatusMessage> : null}

              <div className={AUTH_ACTION_ROW_CLASS}>
                <Button type="submit" disabled={isSubmitting} className="h-10">
                  {isSubmitting ? "Sending..." : "Send reset link"}
                </Button>
                <Button
                  asChild
                  type="button"
                  variant="outline"
                  className={AUTH_OUTLINE_BUTTON_CLASS}
                >
                  <Link to="/login">Back to login</Link>
                </Button>
              </div>
            </AuthSection>
          </form>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
