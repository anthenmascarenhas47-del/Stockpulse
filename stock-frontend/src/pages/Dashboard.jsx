import { useState } from "react";
import { analyze, searchCompanies } from "../api/api";
import CandleChart from "../components/CandleChart";
import Navbar from "../components/Navbar";

export default function Dashboard() {
  const [selectedStock, setSelectedStock] = useState({ symbol: "INFY.NS", name: "Infosys" });
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (q) => {
    setInput(q);
    if (q.length > 1) {
      const r = await searchCompanies(q);
      setResults(r);
    } else {
      setResults([]);
    }
  };

  const runAnalysis = async () => {
    setLoading(true);
    const res = await analyze(selectedStock.symbol);
    setAnalysis(res);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      <Navbar />

      <main className="max-w-7xl mx-auto p-4 lg:p-8">
        {/* TOP SEARCH & INFO BAR */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <span className="text-2xl font-bold text-blue-400">{selectedStock.symbol.split('.')[0]}</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white leading-tight">{selectedStock.name}</h2>
              <p className="text-slate-500 text-sm font-medium">{selectedStock.symbol} • NSE India</p>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input
              className="w-full bg-slate-900/50 border border-slate-700 text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
              value={input}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search companies..."
            />
            {results.length > 0 && (
              <ul className="absolute z-[100] w-full bg-slate-800 border border-slate-700 mt-2 rounded-xl shadow-2xl overflow-hidden backdrop-blur-lg">
                {results.map((r) => (
                  <li
                    key={r.symbol}
                    className="p-4 cursor-pointer hover:bg-blue-600/20 hover:text-blue-400 transition-colors border-b border-slate-700/50 last:border-none"
                    onClick={() => {
                      setSelectedStock({ symbol: r.symbol, name: r.name });
                      setResults([]);
                      setInput("");
                      setAnalysis(null);
                    }}
                  >
                    <div className="font-bold">{r.name}</div>
                    <div className="text-xs opacity-60">{r.symbol}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: ANALYSIS */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 shadow-lg">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Trading Signal</h3>
              <button
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 transition-all py-3.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 mb-6 flex items-center justify-center gap-2"
                onClick={runAnalysis}
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Run AI Analysis"}
              </button>

              {analysis ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className={`text-center py-6 rounded-2xl border-2 ${
                    analysis.trend === 'BUY' ? 'bg-green-500/5 border-green-500/20' : 
                    analysis.trend === 'SELL' ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'
                  }`}>
                    <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Recommendation</div>
                    <div className={`text-4xl font-black tracking-tighter ${
                      analysis.trend === 'BUY' ? 'text-green-400' : 
                      analysis.trend === 'SELL' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {analysis.trend}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <StatRow label="Bullish Power" value={`${(analysis.prob_bull * 100).toFixed(1)}%`} color="text-green-400" />
                    <StatRow label="Bearish Power" value={`${(analysis.prob_bear * 100).toFixed(1)}%`} color="text-red-400" />
                    <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden flex">
                       <div style={{ width: `${analysis.prob_bull * 100}%` }} className="h-full bg-green-500" />
                       <div style={{ width: `${analysis.prob_bear * 100}%` }} className="h-full bg-red-500" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500 italic text-sm">
                  Click the button above to generate a prediction based on live market data.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: CHART */}
          <div className="lg:col-span-9 bg-slate-800/40 rounded-2xl border border-slate-700/50 shadow-lg overflow-hidden">
             <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/20">
                <span className="text-sm font-semibold text-slate-400">Intraday 5m Chart</span>
                <div className="flex gap-2">
                   <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mt-1.5" />
                   <span className="text-xs text-slate-400">Live Data</span>
                </div>
             </div>
             <CandleChart symbol={selectedStock.symbol} />
          </div>

        </div>
      </main>
    </div>
  );
}

// Small helper component for the stats
function StatRow({ label, value, color }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-400 text-sm font-medium">{label}</span>
      <span className={`font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}