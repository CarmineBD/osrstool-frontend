import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useMe } from "@/hooks/useMe";
import { ForbiddenPage } from "@/pages/ForbiddenPage";

type ProtectedRouteProps = {
  requiredRole?: string;
  requireAcceptedTerms?: boolean;
  requireCompleteProfile?: boolean;
  requireIncompleteProfile?: boolean;
  requireIncompleteAccountSetup?: boolean;
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
  requireAcceptedTerms = false,
  requireCompleteProfile = false,
  requireIncompleteProfile = false,
  requireIncompleteAccountSetup = false,
}: ProtectedRouteProps) {
  const { session, isLoading } = useAuth();
  const location = useLocation();
  const meQuery = useMe();
  const requiresRole = Boolean(requiredRole);
  const requiresMe =
    Boolean(session) &&
    (requiresRole ||
      requireAcceptedTerms ||
      requireCompleteProfile ||
      requireIncompleteProfile ||
      requireIncompleteAccountSetup);

  if (isLoading || (requiresMe && meQuery.isLoading)) {
    return (
      <div className="mx-auto w-full max-w-xl p-6 text-sm text-muted-foreground">
        Checking access...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiresMe && meQuery.error) {
    return (
      <div className="mx-auto w-full max-w-xl p-6 text-sm text-destructive">
        {meQuery.error instanceof Error
          ? meQuery.error.message
          : "Unable to verify your account profile."}
      </div>
    );
  }

  const termsAccepted = meQuery.data?.data?.terms?.accepted === true;
  const accountUsername = meQuery.data?.data?.username ?? null;
  const hasCompleteAccountSetup = termsAccepted && Boolean(accountUsername);

  if (requireAcceptedTerms && !termsAccepted) {
    return (
      <Navigate to="/account/onboarding" replace state={{ from: location }} />
    );
  }

  if (requireCompleteProfile && !accountUsername) {
    return (
      <Navigate to="/account/onboarding" replace state={{ from: location }} />
    );
  }

  if (requireIncompleteAccountSetup && hasCompleteAccountSetup) {
    const state = location.state as RouteState | null;
    const from = state?.from;
    const redirectTo = from?.pathname
      ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
      : "/account";
    return <Navigate to={redirectTo} replace />;
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
