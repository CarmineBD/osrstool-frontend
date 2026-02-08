import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/auth/AuthProvider";

export function AccountPage() {
  const { session, user, signOut } = useAuth();
  const [isTestingMe, setIsTestingMe] = useState(false);
  const [meStatus, setMeStatus] = useState<number | null>(null);
  const [mePayload, setMePayload] = useState<unknown>(null);
  const [meError, setMeError] = useState<string | null>(null);

  const handleLogout = async () => {
    await signOut();
  };

  const handleTestMe = async () => {
    setIsTestingMe(true);
    setMeStatus(null);
    setMePayload(null);
    setMeError(null);

    try {
      const token = session?.access_token;
      if (!token) {
        throw new Error("No hay sesión activa o falta access_token.");
      }

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
      if (!apiBaseUrl) {
        throw new Error("Falta VITE_API_BASE_URL en .env.local.");
      }

      const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMeStatus(response.status);
      const data = await response.json();
      setMePayload(data);
    } catch (error) {
      setMeError(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setIsTestingMe(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Cuenta (ruta protegida)</CardTitle>
          <CardDescription>Esta pantalla solo sirve para testear sesión en frontend.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email ?? "Sin email"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">User ID</p>
            <p className="break-all font-mono text-xs">{user?.id ?? "Sin ID"}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
          <Button variant="outline" onClick={handleTestMe} disabled={isTestingMe}>
            {isTestingMe ? "Probando /me..." : "Test /me (backend)"}
          </Button>

          {(meStatus !== null || mePayload !== null || meError) && (
            <div className="space-y-2 rounded-md border p-3">
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                {meStatus ?? "N/A"}
              </p>
              {meError ? (
                <p className="text-destructive">{meError}</p>
              ) : (
                <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                  {JSON.stringify(mePayload, null, 2)}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
