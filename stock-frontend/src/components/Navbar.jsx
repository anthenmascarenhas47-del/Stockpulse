export default function Navbar() {
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
        <a href="#" className="hover:text-blue-400 transition-colors">Market</a>
        <a href="#" className="hover:text-blue-400 transition-colors">Watchlist</a>
        <a href="#" className="text-white border-b-2 border-blue-500 pb-1">Dashboard</a>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-xs text-slate-500 text-right hidden sm:block">
          Market Status: <span className="text-green-500">Live</span>
        </div>
      </div>
    </nav>
  );
}