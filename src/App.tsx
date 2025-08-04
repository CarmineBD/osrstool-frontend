import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MethodDetail } from "./pages/MethodDetail";
import { Home } from "./pages/Home";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/moneyMkingMethod/:id" element={<MethodDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
