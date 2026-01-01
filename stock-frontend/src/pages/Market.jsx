import { useEffect, useState } from "react";
import { getMarket } from "../api/api";
import Navbar from "../components/Navbar";

export default function Market() {
  const [stocks, setStocks] = useState([]);

  useEffect(() => {
    getMarket().then(setStocks);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      <Navbar />

      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Market</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stocks.map(s => (
            <a
              key={s.symbol}
              href={`/stock/${s.symbol}`}
              className="p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-blue-500 transition"
            >
              <div className="font-bold">{s.name}</div>
              <div className="text-slate-400 text-sm">{s.symbol}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
