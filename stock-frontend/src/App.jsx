import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Market from "./pages/Market";
import Stock from "./pages/Stock";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/market" element={<Market />} />
        <Route path="/stock/:symbol" element={<Stock />} />
      </Routes>
    </BrowserRouter>
  );
}
