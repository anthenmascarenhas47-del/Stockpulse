import { useEffect, useState, useMemo } from "react";
import { getMarket } from "../api/api";
import Navbar from "../components/Navbar";

export default function Market() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true); // Start loading
    getMarket()
      .then((data) => {
        setStocks(data);
        setLoading(false); // Stop loading
      })
      .catch((err) => {
        console.error("Failed to fetch market data", err);
        setError("Failed to load market data");
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return stocks.filter((s) =>
      `${s.name} ${s.symbol}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [stocks, search]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-center mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stocks..."
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 3. Render Loading State */}
        {loading && (
          <div className="text-center py-20 text-blue-400 animate-pulse text-xl font-bold">
            Loading Live Market Data...
          </div>
        )}

        {/* 4. Render Error State */}
        {error && (
          <div className="text-center py-20 text-red-400 font-bold">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <a
                key={s.symbol}
                href={`/stock/${s.symbol}`}
                className="p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-blue-500 transition space-y-1 block"
              >
                <div className="font-bold truncate">{s.name}</div>
                <div className="text-green-400 font-semibold text-sm">
                  ₹{(s.price ?? 0).toFixed(2)}
                </div>
              </a>
            ))}

            {filtered.length === 0 && (
              <div className="text-slate-400 col-span-full text-center py-10">
                No stocks match your search.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}