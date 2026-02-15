import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Layout } from "./components/Layout";
import { UsernameProvider } from "./contexts/UsernameContext";
import { AuthProvider } from "./auth/AuthProvider";
import { LoginPage } from "./pages/LoginPage";
import { AccountPage } from "./pages/AccountPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";

const LazyMethodDetail = lazy(() =>
  import("./pages/MethodDetail").then((module) => ({
    default: module.MethodDetail,
  }))
);
const LazyMethodCreate = lazy(() => import("./pages/MethodCreate"));
const LazyMethodEdit = lazy(() => import("./pages/MethodEdit"));

function RouteFallback() {
  return <p className="p-4 text-sm text-muted-foreground">Loading page...</p>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <UsernameProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/account" element={<AccountPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredRole="super_admin" />}>
                <Route
                  path="/moneyMakingMethod/new"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <LazyMethodCreate />
                    </Suspense>
                  }
                />
                <Route
                  path="/moneyMakingMethod/:slug/edit"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <LazyMethodEdit />
                    </Suspense>
                  }
                />
              </Route>
              <Route
                path="/moneyMakingMethod/:slug/:variantSlug?"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <LazyMethodDetail />
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </UsernameProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
