import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MethodDetail } from "./pages/MethodDetail";
import { Home } from "./pages/Home";
import { Layout } from "./components/Layout";
import { UsernameProvider } from "./contexts/UsernameContext";

function App() {
  return (
    <BrowserRouter>
      <UsernameProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route
              path="/moneyMakingMethod/:slug/:variantSlug?"
              element={<MethodDetail />}
            />
          </Route>
        </Routes>
      </UsernameProvider>
    </BrowserRouter>
  );
}

export default App;
