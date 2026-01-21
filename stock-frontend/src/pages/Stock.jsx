import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import CandleChart from "../components/CandleChart";
import { getCompany, getAnalysis } from "../api/api";

export default function Stock() {
  const { symbol } = useParams();

  const [company, setCompany] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [selectedInterval, setSelectedInterval] = useState("1d");

  const [showModal, setShowModal] = useState(false);
  const [tradeType, setTradeType] = useState("BUY");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setAnalysis(null);
    setCompany(null);

    getCompany(symbol).then(setCompany);
    getAnalysis(symbol, selectedInterval).then(setAnalysis);
  }, [symbol, selectedInterval]);

  const handleConfirmTrade = () => {
    if (!analysis) return;

    const price = analysis.price;
    let portfolio = JSON.parse(localStorage.getItem("portfolio") || "[]");

    const existing = portfolio.find((p) => p.symbol === symbol);

    if (tradeType === "BUY") {
      if (existing) {
        const totalCost =
          existing.quantity * existing.price + quantity * price;
        const newQty = existing.quantity + quantity;

        existing.quantity = newQty;
        existing.price = (totalCost / newQty).toFixed(2);
      } else {
        portfolio.push({
          symbol,
          quantity,
          price: price.toFixed(2),
        });
      }
    }

    if (tradeType === "SELL") {
      if (!existing || existing.quantity < quantity) {
        alert("You don't have enough shares to sell.");
        return;
      }

      existing.quantity -= quantity;

      if (existing.quantity === 0) {
        portfolio = portfolio.filter((p) => p.symbol !== symbol);
      }
    }

    localStorage.setItem("portfolio", JSON.stringify(portfolio));

    setShowModal(false);
    setQuantity(1);
  };

  const handleBuy = () => {
    setTradeType("BUY");
    setShowModal(true);
  };

  const handleSell = () => {
    setTradeType("SELL");
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-3 items-center">
          <div>
            <h1 className="text-2xl font-bold">{company?.name}</h1>
            <p className="text-slate-400">{symbol}</p>
          </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold mb-3">AI Analysis <span className="text-sm text-slate-400 ml-2">({selectedInterval})</span></h2>

            {!analysis && <p>Loading…</p>}

            {analysis && (
              <div className="space-y-2">
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

                <p>
                  Bullish Probability:{" "}
                  {(analysis.prob_bull * 100).toFixed(2)}%
                </p>
                <p>
                  Bearish Probability:{" "}
                  {(analysis.prob_bear * 100).toFixed(2)}%
                </p>

                <p>
                  <span className="text-slate-400">Support:</span>{" "}
                  ₹{(analysis.support || 0).toFixed(2)}
                </p>
                <p>
                  <span className="text-slate-400">Resistance:</span>{" "}
                  ₹{(analysis.resistance || 0).toFixed(2)}
                </p>

                {analysis.reason && analysis.reason.length > 0 && (
                  <div>
                    <span className="text-slate-400">Reasoning:</span>
                    <ul className="list-disc list-inside text-sm mt-1">
                      {analysis.reason.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <CandleChart symbol={symbol} selectedInterval={selectedInterval} onIntervalChange={setSelectedInterval} />
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-bold mb-3">Company Details</h2>

          {!company && <p>Loading…</p>}

          {company && (
            <div className="space-y-2">
              <p>
                <span className="text-slate-400">Name:</span> {company.name}
              </p>
              <p>
                <span className="text-slate-400">Symbol:</span> {company.symbol}
              </p>
              {company.sector && (
                <p>
                  <span className="text-slate-400">Sector:</span>{" "}
                  {company.sector}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ----------- MODAL (fixed, high z-index) ----------- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-96 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold">
              {tradeType === "BUY" ? "Buy" : "Sell"} {symbol}
            </h2>

            <div>
              <label className="text-sm text-slate-400">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(parseInt(e.target.value || 1))
                }
                className="mt-1 w-full bg-slate-700 rounded p-2 outline-none"
              />
            </div>

            {analysis && (
              <p className="text-slate-300">
                Price: ₹{analysis.price.toFixed(2)}
              </p>
            )}

            <div className="flex justify-between pt-3 gap-3">
              <button
                className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button
                className={
                  tradeType === "BUY"
                    ? "px-4 py-2 rounded bg-green-600 hover:bg-green-700"
                    : "px-4 py-2 rounded bg-red-600 hover:bg-red-700"
                }
                onClick={handleConfirmTrade}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
