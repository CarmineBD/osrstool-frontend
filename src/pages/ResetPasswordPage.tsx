import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { PASSWORD_MAX_LENGTH } from "@/lib/validation";

const MIN_PASSWORD_LENGTH = 6;

export function ResetPasswordPage() {
  const { isLoading, isRecoveryMode, session, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const isRecoverySessionReady = Boolean(session) && isRecoveryMode;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const updateError = await updatePassword(password);
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError);
      return;
    }

    setIsComplete(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>
            Choose a new password for your account to finish the recovery flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <p className="text-sm text-muted-foreground">Checking your recovery link...</p> : null}

          {!isLoading && !isRecoverySessionReady && !isComplete ? (
            <>
              <p className="text-sm text-muted-foreground">
                This recovery link is invalid or has expired. Request a new password reset email
                to continue.
              </p>
              <Button asChild variant="outline">
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
            </>
          ) : null}

          {isComplete ? (
            <>
              <p className="text-sm text-success">
                Your password has been updated. You can continue to your account or sign in again.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild className="sm:flex-1">
                  <Link to="/account">Go to account</Link>
                </Button>
                <Button asChild variant="outline" className="sm:flex-1">
                  <Link to="/login">Back to login</Link>
                </Button>
              </div>
            </>
          ) : null}

          {!isLoading && isRecoverySessionReady && !isComplete ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <InputGroup>
                  <InputGroupInput
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    maxLength={PASSWORD_MAX_LENGTH}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={MIN_PASSWORD_LENGTH}
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

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <InputGroup>
                  <InputGroupInput
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    maxLength={PASSWORD_MAX_LENGTH}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={MIN_PASSWORD_LENGTH}
                    required
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      size="icon-xs"
                      onClick={() => setShowConfirmPassword((previous) => !previous)}
                      type="button"
                      variant="ghost"
                    >
                      {showConfirmPassword ? <EyeOff /> : <Eye />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={isSubmitting} className="sm:flex-1">
                  {isSubmitting ? "Updating..." : "Update password"}
                </Button>
                <Button asChild type="button" variant="outline" className="sm:flex-1">
                  <Link to="/login">Cancel</Link>
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
