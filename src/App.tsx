import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MethodDetail } from "./pages/MethodDetail";
import { Home } from "./pages/Home";
import { MethodEdit } from "./pages/MethodEdit";
import { Layout } from "./components/Layout";
import { UsernameProvider } from "./contexts/UsernameContext";
import { AuthProvider } from "./auth/AuthProvider";
import { LoginPage } from "./pages/LoginPage";
import { AccountPage } from "./pages/AccountPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";

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
              <Route
                path="/moneyMakingMethod/:slug/:variantSlug?"
                element={<MethodDetail />}
              />
              <Route
                path="/moneyMakingMethod/:slug/edit"
                element={<MethodEdit />}
              />
            </Route>
          </Routes>
        </UsernameProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
