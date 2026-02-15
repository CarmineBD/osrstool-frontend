import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { fetchMe } from "@/lib/me";
import { ForbiddenPage } from "@/pages/ForbiddenPage";

type ProtectedRouteProps = {
  requiredRole?: string;
};

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { session, isLoading } = useAuth();
  const location = useLocation();
  const requiresRole = Boolean(requiredRole);
  const {
    data: meData,
    isLoading: isRoleLoading,
    error: roleError,
  } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: !!session && requiresRole,
    retry: false,
  });

  if (isLoading || (requiresRole && isRoleLoading)) {
    return (
      <div className="mx-auto w-full max-w-xl p-6 text-sm text-muted-foreground">
        Checking access...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiresRole) {
    const role = meData?.data?.role ?? "";
    if (roleError || role !== requiredRole) {
      return (
        <ForbiddenPage
          title="403 - Super admin only"
          description="This area is restricted to super_admin users."
        />
      );
    }
  }

  return <Outlet />;
}
