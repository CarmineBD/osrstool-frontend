import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { useUsername } from "@/contexts/UsernameContext";
import { fetchMe } from "@/lib/me";
import type { MethodsFilters } from "@/lib/api";
import { MethodsList } from "@/features/methods/MethodsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, EyeOff } from "lucide-react";
import { QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";

function maskEmail(email: string) {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) {
    return email.length <= 1
      ? email
      : `${email[0]}${"*".repeat(email.length - 1)}`;
  }

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex);
  const maskedLocal =
    localPart.length <= 1
      ? localPart
      : `${localPart[0]}${"*".repeat(localPart.length - 1)}`;

  return `${maskedLocal}${domainPart}`;
}

export function AccountPage() {
  const { user, signOut } = useAuth();
  const { username, clearUsername } = useUsername();
  const [sortConfig, setSortConfig] = useState<{
    sortBy?: MethodsFilters["sortBy"];
    order?: MethodsFilters["order"];
  }>({});
  const [showEmail, setShowEmail] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingOutRef = useRef(false);

  const { data: meData, error: meError, isLoading: isMeLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });

  const handleLogout = async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setIsLoggingOut(true);
    try {
      const error = await signOut();
      if (error) return;
      clearUsername();
    } finally {
      isLoggingOutRef.current = false;
      setIsLoggingOut(false);
    }
  };

  const likesCount = meData?.data?.likesCount ?? meData?.data?.likes ?? 0;
  const likesFilters = useMemo<MethodsFilters>(
    () => ({
      likedByMe: true,
      sortBy: sortConfig.sortBy,
      order: sortConfig.order,
    }),
    [sortConfig.order, sortConfig.sortBy]
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Mi cuenta</CardTitle>
          <CardDescription>Gestiona tu sesion y tus metodos likeados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground">Email</p>
            <div className="flex items-center gap-2">
              <p className="font-medium">
                {user?.email
                  ? showEmail
                    ? user.email
                    : maskEmail(user.email)
                  : "Sin email"}
              </p>
              {user?.email ? (
                <Button
                  aria-label={showEmail ? "Ocultar correo" : "Mostrar correo"}
                  onClick={() => setShowEmail((prev) => !prev)}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  {showEmail ? <EyeOff /> : <Eye />}
                </Button>
              ) : null}
            </div>
          </div>

          <div>
            <p className="text-muted-foreground">User ID</p>
            <p className="break-all font-mono text-xs">{user?.id ?? "Sin ID"}</p>
          </div>

          <div>
            <p className="text-muted-foreground">Likes totales</p>
            {isMeLoading ? (
              <Skeleton className="mt-1 h-8 w-16" />
            ) : (
              <p className="text-lg font-semibold">{likesCount}</p>
            )}
          </div>

          {meError ? (
            <p className="text-destructive">
              {meError instanceof Error ? meError.message : "Error al cargar tu perfil"}
            </p>
          ) : null}

          <Button variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? "Cerrando sesion..." : "Logout"}
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="likes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="likes">Mis likes</TabsTrigger>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
        </TabsList>

        <TabsContent value="likes">
          <MethodsList
            username={username}
            filters={likesFilters}
            sortBy={sortConfig.sortBy}
            order={sortConfig.order}
            onSortChange={(sortBy, order) => setSortConfig({ sortBy, order })}
          />
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de actividad</CardTitle>
              <CardDescription>
                Tus likes se sincronizan automaticamente entre el listado y el detalle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Metodos likeados:{" "}
                {isMeLoading ? (
                  <Skeleton className="inline-flex h-5 w-12 align-middle" />
                ) : (
                  <span className="font-semibold">{likesCount}</span>
                )}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
