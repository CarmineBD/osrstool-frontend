import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { useAuth } from "@/auth/AuthProvider";
import { Eye, EyeOff } from "lucide-react";

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

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
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
      setInfo("Cuenta creada. Revisa tu correo para confirmar el registro.");
      return;
    }

    setInfo("Cuenta creada y sesión iniciada.");
    navigate("/account", { replace: true });
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Acceso</CardTitle>
          <CardDescription>Inicia sesión o crea una cuenta con email y contraseña.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSignIn}>
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <InputGroup>
                <InputGroupInput
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                    size="icon-xs"
                    onClick={() => setShowPassword((prev) => !prev)}
                    type="button"
                    variant="ghost"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-emerald-600">{info}</p>}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={isSubmitting} className="sm:flex-1">
                {isSubmitting ? "Procesando..." : "Entrar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleSignUp}
                className="sm:flex-1"
              >
                {isSubmitting ? "Procesando..." : "Crear cuenta"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
