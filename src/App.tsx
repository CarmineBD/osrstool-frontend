import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MethodDetail } from "./pages/MethodDetail";
import { Home } from "./pages/Home";
import { Layout } from "./components/Layout";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/moneyMkingMethod/:id" element={<MethodDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
