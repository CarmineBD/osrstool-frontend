import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useMe } from "@/hooks/useMe";
import { ForbiddenPage } from "@/pages/ForbiddenPage";

type ProtectedRouteProps = {
  requiredRole?: string;
  requireCompleteProfile?: boolean;
  requireIncompleteProfile?: boolean;
};

type RouteState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

export function ProtectedRoute({
  requiredRole,
  requireCompleteProfile = false,
  requireIncompleteProfile = false,
}: ProtectedRouteProps) {
  const { session, isLoading } = useAuth();
  const location = useLocation();
  const meQuery = useMe();
  const requiresRole = Boolean(requiredRole);
  const requiresProfile =
    Boolean(session) &&
    (requiresRole || requireCompleteProfile || requireIncompleteProfile);

  if (isLoading || (requiresProfile && meQuery.isLoading)) {
    return (
      <div className="mx-auto w-full max-w-xl p-6 text-sm text-muted-foreground">
        Checking access...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiresProfile && meQuery.error) {
    return (
      <div className="mx-auto w-full max-w-xl p-6 text-sm text-destructive">
        {meQuery.error instanceof Error
          ? meQuery.error.message
          : "Unable to verify your account profile."}
      </div>
    );
  }

  const accountUsername = meQuery.data?.data?.username ?? null;

  if (requireCompleteProfile && !accountUsername) {
    return <Navigate to="/account/onboarding" replace state={{ from: location }} />;
  }

  if (requireIncompleteProfile && accountUsername) {
    const state = location.state as RouteState | null;
    const from = state?.from;
    const redirectTo = from?.pathname
      ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
      : "/account";
    return <Navigate to={redirectTo} replace />;
  }

  if (requiresRole) {
    const role = meQuery.data?.data?.role ?? "";
    if (role !== requiredRole) {
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
