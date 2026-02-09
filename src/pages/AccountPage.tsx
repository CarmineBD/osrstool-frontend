import { useMemo, useState } from "react";
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

export function AccountPage() {
  const { user, signOut } = useAuth();
  const { username } = useUsername();
  const [sortConfig, setSortConfig] = useState<{
    sortBy?: MethodsFilters["sortBy"];
    order?: MethodsFilters["order"];
  }>({});

  const { data: meData, error: meError, isLoading: isMeLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    retry: false,
  });

  const handleLogout = async () => {
    await signOut();
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
          <CardDescription>Gestiona tu sesión y tus métodos likeados.</CardDescription>
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
          <div>
            <p className="text-muted-foreground">Likes totales</p>
            <p className="font-semibold text-lg">
              {isMeLoading ? "Cargando..." : likesCount}
            </p>
          </div>
          {meError ? (
            <p className="text-destructive">
              {meError instanceof Error
                ? meError.message
                : "Error al cargar tu perfil"}
            </p>
          ) : null}
          <Button variant="outline" onClick={handleLogout}>
            Logout
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
                Tus likes se sincronizan automáticamente entre el listado y el detalle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Métodos likeados: <span className="font-semibold">{likesCount}</span>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
