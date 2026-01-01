import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import CandleChart from "../components/CandleChart";
import { getCompany, getAnalysis } from "../api/api";

export default function Stock() {
  const { symbol } = useParams();

  const [company, setCompany] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    setAnalysis(null);
    setCompany(null);

    getCompany(symbol).then(setCompany);
    getAnalysis(symbol).then(setAnalysis);
  }, [symbol]);

  // TEMP place-holder handlers (we wire real trading later)
  const handleBuy = () => alert(`Buy ${symbol}`);
  const handleSell = () => alert(`Sell ${symbol}`);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* ---------- HEADER ---------- */}
        <div className="grid grid-cols-3 items-center">

          {/* LEFT — NAME */}
          <div>
            <h1 className="text-2xl font-bold">{company?.name}</h1>
            <p className="text-slate-400">{symbol}</p>
          </div>

          {/* CENTER — BUY / SELL */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleBuy}
              className="bg-green-600 px-5 py-2 rounded font-semibold hover:bg-green-700"
            >
              Buy
            </button>

            <button
              onClick={handleSell}
              className="bg-red-600 px-5 py-2 rounded font-semibold hover:bg-red-700"
            >
              Sell
            </button>
          </div>

          {/* RIGHT — PRICE */}
          {analysis && (
            <div className="text-right">
              <div className="text-3xl font-bold">
                ₹{analysis.price.toFixed(2)}
              </div>
              <div className="text-sm text-slate-400">
                Market: {analysis.market_closed ? "Closed" : "Open"}
              </div>
            </div>
          )}
        </div>

        {/* ---------- TOP GRID ---------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — AI ANALYSIS PANEL */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold mb-3">AI Analysis</h2>

            {!analysis && <p>Loading…</p>}

            {analysis && (
              <div className="space-y-2">

                {/* RECOMMENDATION */}
                <p className="text-xl font-bold">
                  Recommendation:&nbsp;
                  <span
                    className={
                      analysis.trend === "BUY"
                        ? "text-green-400"
                        : analysis.trend === "SELL"
                        ? "text-red-400"
                        : "text-yellow-300"
                    }
                  >
                    {analysis.trend}
                  </span>
                </p>

                <p>Bullish Probability: {(analysis.prob_bull * 100).toFixed(2)}%</p>
                <p>Bearish Probability: {(analysis.prob_bear * 100).toFixed(2)}%</p>
              </div>
            )}
          </div>

          {/* RIGHT — CHART */}
          <div className="lg:col-span-2 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <CandleChart symbol={symbol} />
          </div>
        </div>

        {/* ---------- COMPANY DETAILS SECTION ---------- */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-bold mb-3">Company Details</h2>

          {!company && <p>Loading…</p>}

          {company && (
            <div className="space-y-2">
              <p><span className="text-slate-400">Name:</span> {company.name}</p>
              <p><span className="text-slate-400">Symbol:</span> {company.symbol}</p>
              {company.sector && (
                <p><span className="text-slate-400">Sector:</span> {company.sector}</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
