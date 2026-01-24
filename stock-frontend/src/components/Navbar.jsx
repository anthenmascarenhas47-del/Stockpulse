import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getIndices } from "../api/api";

export default function Navbar() {
  const [status, setStatus] = useState("Checking...");
  const [indices, setIndices] = useState([]);

  function checkStatus() {
    const now = new Date();
    // Force IST Timezone
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    
    const day = istTime.getDay(); 
    const h = istTime.getHours();
    const m = istTime.getMinutes();
    const totalMinutes = h * 60 + m;

    const PRE_OPEN_START = 9 * 60;
    const MARKET_START = 9 * 60 + 15;
    const MARKET_END = 15 * 60 + 30;

    let s = "Closed";

    if (day === 0 || day === 6) {
      s = "Closed (Weekend)";
    } else {
      if (totalMinutes >= PRE_OPEN_START && totalMinutes < MARKET_START) {
        s = "Pre-Open";
      } else if (totalMinutes >= MARKET_START && totalMinutes <= MARKET_END) {
        s = "Live";
      } else {
        s = "Closed";
      }
    }
    setStatus(s);
  }

  const fetchIndices = async () => {
    const data = await getIndices();
    setIndices(data);
  };

  useEffect(() => {
    checkStatus();
    fetchIndices();
    const statusTimer = setInterval(checkStatus, 60000);
    const dataTimer = setInterval(fetchIndices, 60000);
    return () => {
      clearInterval(statusTimer);
      clearInterval(dataTimer);
    };
  }, []);

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-2xl">

      {/* ================= TOP ROW: Logo, Links, Status ================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* 1. Logo */}
          <div className="flex items-center gap-3 group cursor-pointer">
            <span className="text-xl font-extrabold tracking-wide 
                   bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 
                   bg-clip-text text-transparent 
                   drop-shadow-[0_0_6px_rgba(99,102,241,0.35)]
                   transition-all duration-300
                   group-hover:tracking-widest
                   group-hover:drop-shadow-[0_0_10px_rgba(99,102,241,0.6)]
                   hidden sm:block">
              SignalX
            </span>
          </div>


          {/* 2. Navigation Links */}
          <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
            <NavLink
              to="/market"
              className={({ isActive }) =>
                isActive ? "text-white transition-colors" : "hover:text-blue-400 transition-colors"
              }
            >
              Market
            </NavLink>
            <NavLink
              to="/watchlist"
              className={({ isActive }) =>
                isActive ? "text-white transition-colors" : "hover:text-blue-400 transition-colors"
              }
            >
              Watchlist
            </NavLink>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? "text-white transition-colors" : "hover:text-blue-400 transition-colors"
              }
            >
              Dashboard
            </NavLink>
          </div>

          {/* 3. Market Status Badge */}
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-slate-500 hidden sm:block">
              MARKET STATUS
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border ${status === "Live"
                  ? "text-green-400 border-green-900 bg-green-900/20 animate-pulse"
                  : status === "Pre-Open"
                    ? "text-yellow-400 border-yellow-900 bg-yellow-900/20"
                    : "text-red-400 border-red-900 bg-red-900/20"
                }`}
            >
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM ROW: Indices Ticker ================= */}
      <div className="bg-slate-950/50 border-t border-slate-800 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-10 gap-6 sm:gap-12 overflow-x-auto no-scrollbar">

            {indices.length === 0 && (
              <span className="text-xs text-slate-600 animate-pulse">Loading Market Indices...</span>
            )}

            {indices.map((idx) => (
              <div
                key={idx.name}
                className="flex items-center gap-2 whitespace-nowrap px-4 py-1.5 rounded-xl 
               bg-slate-900/60 border border-slate-800 
               transition-all duration-300 
               hover:scale-105 hover:border-blue-500/40
               hover:shadow-[0_0_15px_rgba(59,130,246,0.25)]
               hover:bg-slate-800/70 cursor-pointer"
              >
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {idx.name}
                </span>

                <span
                  className={`text-sm font-mono font-semibold ${idx.change >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                >
                  {idx.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${idx.change >= 0
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                    }`}
                >
                  {idx.change >= 0 ? "+" : ""}
                  {idx.percent.toFixed(2)}%
                </span>
              </div>
            ))}


          </div>
        </div>
      </div>

    </nav>
  );
}