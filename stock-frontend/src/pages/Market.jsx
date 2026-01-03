import { useEffect, useState, useMemo } from "react";
import { getMarket } from "../api/api";
import Navbar from "../components/Navbar";

export default function Market() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    getMarket()
      .then((data) => {
        setStocks(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch market data", err);
        setError("Unable to connect to market server.");
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return stocks.filter((s) =>
      `${s.name} ${s.symbol}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [stocks, search]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6">
        
        {/* -------- HEADER & SEARCH -------- */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Market Watch
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Live tracking of top Indian companies
            </p>
          </div>

          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or symbol..."
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 
                         transition-all shadow-lg placeholder:text-slate-600 backdrop-blur-sm"
            />
          </div>
        </div>

        {/* -------- LOADING STATE -------- */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-800/50 rounded-xl border border-slate-700/50"></div>
            ))}
          </div>
        )}

        {/* -------- ERROR STATE -------- */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">{error}</h3>
            <p className="text-slate-400 mt-2">Check your backend connection.</p>
          </div>
        )}

        {/* -------- MARKET GRID -------- */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((s) => {
              const isPositive = s.change >= 0;
              
              return (
                <a
                  key={s.symbol}
                  href={`/stock/${s.symbol}`}
                  className="group relative bg-slate-800 rounded-xl p-5 border border-slate-700/50 
                             hover:border-blue-500/50 hover:bg-slate-750 hover:shadow-xl hover:shadow-blue-900/10 
                             transition-all duration-300 flex flex-col justify-between h-full"
                >
                  {/* Top Row: Logo/Icon & Price */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-lg font-bold text-slate-300 mb-2 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {s.name[0]}
                      </div>
                      <h3 className="font-bold text-lg leading-tight group-hover:text-blue-400 transition-colors line-clamp-1">
                        {s.name}
                      </h3>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xl font-bold text-white font-mono">
                        ₹{s.price.toLocaleString("en-IN")}
                      </div>
                      <div className={`text-xs font-bold flex items-center justify-end gap-1 mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        <span>{isPositive ? '▲' : '▼'}</span>
                        <span>{Math.abs(s.change).toFixed(2)}</span>
                        <span>({Math.abs(s.percent).toFixed(2)}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Sector Badge */}
                  <div className="mt-auto pt-4 border-t border-slate-700/50 flex justify-between items-center">
                    <span className="text-xs text-blue-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                      Analyze &rarr;
                    </span>
                  </div>
                </a>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <p className="text-slate-500 text-lg">No stocks found for "{search}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}