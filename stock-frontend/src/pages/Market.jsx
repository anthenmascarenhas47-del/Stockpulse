import { useEffect, useState, useMemo } from "react";
import { getMarket } from "../api/api";
import Navbar from "../components/Navbar";

export default function Market() {
  const DEFAULT_MAX = 100000;

  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("all"); 
  const [sort, setSort] = useState("default");
  const [maxPrice, setMaxPrice] = useState(DEFAULT_MAX);

  useEffect(() => {
    setLoading(true);
    getMarket()
      .then((data) => {
        setStocks(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to connect to market server.");
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    let data = stocks.filter((s) =>
      `${s.name} ${s.symbol}`.toLowerCase().includes(search.toLowerCase())
    );

    if (type === "gainers") data = data.filter((s) => s.change > 0);
    if (type === "losers") data = data.filter((s) => s.change < 0);

    data = data.filter((s) => s.price <= maxPrice);

    if (sort === "price") data.sort((a, b) => b.price - a.price);
    if (sort === "percent") data.sort((a, b) => b.percent - a.percent);
    if (sort === "name") data.sort((a, b) => a.name.localeCompare(b.name));

    return data;
  }, [stocks, search, type, sort, maxPrice]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6">

        {/* FILTER BAR */}
        <div className="bg-slate-900/70 backdrop-blur border border-slate-800 rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between">

          {/* Search */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stocks..."
            className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl w-full md:w-64 focus:ring-2 focus:ring-blue-500/40 outline-none"
          />

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center text-sm">

            {/* Gainers / Losers */}
            {["all", "gainers", "losers"].map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-2 rounded-xl border transition ${
                  type === t
                    ? "bg-blue-600/20 border-blue-500 text-blue-400"
                    : "border-slate-700 hover:bg-slate-800"
                }`}
              >
                {t === "all" ? "All" : t === "gainers" ? "Gainers" : "Losers"}
              </button>
            ))}

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setMaxPrice(DEFAULT_MAX); 
              }}

              className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl"
            >
              <option value="default">Sort</option>
              <option value="price">Price</option>
            </select>

            {/* Price filter */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Max ₹</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-24 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-800 rounded-xl"></div>
            ))}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="text-center py-20 text-red-400">{error}</div>
        )}

        {/* GRID */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((s) => {
              const pos = s.change >= 0;

              return (
                <a
                  key={s.symbol}
                  href={`/stock/${s.symbol}`}
                  className="group bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-blue-500/40 hover:shadow-[0_0_30px_rgba(59,130,246,0.08)] transition-all duration-300"
                >
                  <div className="flex justify-between mb-4">
                    <div>
                      <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition">
                        {s.name[0]}
                      </div>
                      <h3 className="mt-2 font-bold text-sm group-hover:text-blue-400">
                        {s.name}
                      </h3>
                      <p className="text-xs text-slate-500">{s.symbol}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono font-bold">
                        ₹{s.price.toLocaleString("en-IN")}
                      </p>
                      <p
                        className={`text-xs font-bold ${
                          pos ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {pos ? "+" : ""}
                        {s.percent.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition">
                    View Analysis →
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-20 text-slate-500">
            No stocks found.
          </div>
        )}
      </div>
    </div>
  );
}
