import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Layout } from "./components/Layout";
import { UsernameProvider } from "./contexts/UsernameContext";
import { AuthProvider } from "./auth/AuthProvider";
import { LoginPage } from "./pages/LoginPage";
import { AccountPage } from "./pages/AccountPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LandingPage } from "./pages/LandingPage";
import { ChangelogDetailPage } from "./pages/ChangelogDetailPage";
import { SkillingPage } from "./pages/SkillingPage";
import { SkillMethodsPage } from "./pages/SkillMethodsPage";
import { WikiCategoryPage, WikiPage } from "./pages/WikiPage";
import { MethodDetailSkeleton } from "./features/method-detail/MethodDetailSkeleton";
import { MethodUpsertSkeleton } from "./features/method-upsert/MethodUpsertSkeleton";

const LazyMethodDetail = lazy(() =>
  import("./pages/MethodDetail").then((module) => ({
    default: module.MethodDetail,
  }))
);
const LazyMethodCreate = lazy(() => import("./pages/MethodCreate"));
const LazyMethodEdit = lazy(() => import("./pages/MethodEdit"));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <UsernameProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/allMethods" element={<Home />} />
              <Route path="/skilling" element={<SkillingPage />} />
              <Route path="/skilling/:skill" element={<SkillMethodsPage />} />
              <Route path="/wiki" element={<WikiPage />} />
              <Route path="/wiki/:category" element={<WikiCategoryPage />} />
              <Route path="/changelog/:slug" element={<ChangelogDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/account" element={<AccountPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredRole="super_admin" />}>
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
  );
}

export default App;
