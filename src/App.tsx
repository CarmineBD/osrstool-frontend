import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Layout } from "./components/Layout";
import { UsernameProvider } from "./contexts/UsernameContext";
import { AuthProvider } from "./auth/AuthProvider";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { AccountPage } from "./pages/AccountPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AccountUsernameRequiredDialog } from "./components/AccountUsernameRequiredDialog";
import { AuthenticatedProfileBootstrap } from "./components/AuthenticatedProfileBootstrap";
import { PresenceHeartbeat } from "./components/PresenceHeartbeat";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LandingPage } from "./pages/LandingPage";
import { ChangelogDetailPage } from "./pages/ChangelogDetailPage";
import { ChangelogListPage } from "./pages/ChangelogListPage";
import { SkillingPage } from "./pages/SkillingPage";
import { SkillMethodsPage } from "./pages/SkillMethodsPage";
import { RoadmapsPage } from "./pages/RoadmapsPage";
import { WikiCategoryPage, WikiPage } from "./pages/WikiPage";
import { MethodDetailSkeleton } from "./features/method-detail/MethodDetailSkeleton";
import { MethodUpsertSkeleton } from "./features/method-upsert/MethodUpsertSkeleton";
import { ThemeProvider } from "./contexts/ThemeProvider";
import { AccountUsernameOnboardingPage } from "./pages/AccountUsernameOnboardingPage";

const LazyMethodDetail = lazy(() =>
  import("./pages/MethodDetail").then((module) => ({
    default: module.MethodDetail,
  }))
);
const LazyMethodCreate = lazy(() => import("./pages/MethodCreate"));
const LazyMethodEdit = lazy(() => import("./pages/MethodEdit"));
const LazyAdminPage = lazy(() => import("./pages/AdminPage"));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PresenceHeartbeat />
        <BrowserRouter>
          <AuthenticatedProfileBootstrap />
          <AccountUsernameRequiredDialog />
          <UsernameProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/allMethods" element={<Home />} />
                <Route path="/changelog" element={<ChangelogListPage />} />
                <Route path="/skilling" element={<SkillingPage />} />
                <Route path="/skilling/:skill" element={<SkillMethodsPage />} />
                <Route path="/wiki" element={<WikiPage />} />
                <Route path="/wiki/:category" element={<WikiCategoryPage />} />
                <Route path="/changelog/:slug" element={<ChangelogDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route
                  element={<ProtectedRoute />}
                >
                  <Route path="/account" element={<AccountPage />} />
                </Route>
                <Route
                  element={<ProtectedRoute requireIncompleteProfile />}
                >
                  <Route
                    path="/account/onboarding"
                    element={<AccountUsernameOnboardingPage />}
                  />
                </Route>
                <Route
                  element={<ProtectedRoute />}
                >
                  <Route path="/roadmaps" element={<RoadmapsPage />} />
                </Route>
                <Route
                  element={
                    <ProtectedRoute
                      requireCompleteProfile
                      requiredRole="super_admin"
                    />
                  }
                >
                  <Route
                    path="/admin"
                    element={
                      <Suspense fallback={<MethodUpsertSkeleton />}>
                        <LazyAdminPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/moneyMakingMethod/new"
                    element={
                      <Suspense fallback={<MethodUpsertSkeleton />}>
                        <LazyMethodCreate />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/moneyMakingMethod/:slug/edit"
                    element={
                      <Suspense fallback={<MethodUpsertSkeleton />}>
                        <LazyMethodEdit />
                      </Suspense>
                    }
                  />
                </Route>
                <Route
                  path="/moneyMakingMethod/:slug/:variantSlug?"
                  element={
                    <Suspense fallback={<MethodDetailSkeleton />}>
                      <LazyMethodDetail />
                    </Suspense>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </UsernameProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
