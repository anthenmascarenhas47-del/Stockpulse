import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

export default function Navbar() {
  const [status, setStatus] = useState("Checking...");

  function checkStatus() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    let s = "Closed";

    if (h === 9 && m >= 0 && m < 15) s = "Pre-Open";
    else if ((h > 9 || (h === 9 && m >= 15)) && (h < 15 || (h === 15 && m <= 30)))
      s = "Live";

    setStatus(s);
  }

  useEffect(() => {
    checkStatus();
    const timer = setInterval(checkStatus, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white">
          AI
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          StockPulse
        </span>
      </div>

      <div className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
        <NavLink
          to="/market"
          className={({ isActive }) =>
            isActive
              ? "text-white border-b-2 border-blue-500 pb-1"
              : "hover:text-blue-400"
          }
        >
          Market
        </NavLink>

        <NavLink
          to="/watchlist"
          className={({ isActive }) =>
            isActive
              ? "text-white border-b-2 border-blue-500 pb-1"
              : "hover:text-blue-400"
          }
        >
          Watchlist
        </NavLink>

        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive
              ? "text-white border-b-2 border-blue-500 pb-1"
              : "hover:text-blue-400"
          }
        >
          Dashboard
        </NavLink>
      </div>

      <div className="text-xs text-slate-500 text-right hidden sm:block">
        Market Status:{" "}
        <span
          className={
            status === "Live"
              ? "text-green-500"
              : status === "Pre-Open"
              ? "text-yellow-400"
              : "text-red-500"
          }
        >
          {status}
        </span>
      </div>
    </nav>
  );
}
