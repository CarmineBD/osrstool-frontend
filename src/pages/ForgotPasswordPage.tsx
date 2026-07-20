import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
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
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Enter your account email and we&apos;ll send you a password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
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
                required
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {info ? <p className="text-sm text-success">{info}</p> : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={isSubmitting} className="sm:flex-1">
                {isSubmitting ? "Sending..." : "Send reset link"}
              </Button>
              <Button asChild type="button" variant="outline" className="sm:flex-1">
                <Link to="/login">Back to login</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
