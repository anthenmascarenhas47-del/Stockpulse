import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import { getMarket, getAnalysis } from "../api/api"; 

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState([]);
  const [marketData, setMarketData] = useState({}); // Map of Symbol -> { name, price }
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [tradeType, setTradeType] = useState("BUY");
  const [selectedStock, setSelectedStock] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [tradePrice, setTradePrice] = useState(0); 

  // 1. Load Portfolio & Fetch Market Data for Names/Prices
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("portfolio") || "[]");
    setPortfolio(saved);

    // Fetch all market data to get Real Names and Current Prices
    getMarket()
      .then((data) => {
        const map = {};
        data.forEach((item) => {
          map[item.symbol] = { name: item.name, price: item.price };
        });
        setMarketData(map);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load market data", err);
        setLoading(false);
      });
  }, []);

  // 2. Calculate Totals
  const { totalInvested, currentValue, totalPL } = useMemo(() => {
    let invested = 0;
    let current = 0;

    portfolio.forEach((p) => {
      const qty = p.quantity;
      const buyPrice = parseFloat(p.price);
      const livePrice = marketData[p.symbol]?.price || buyPrice; // Fallback to buy price if loading

      invested += qty * buyPrice;
      current += qty * livePrice;
    });

    return {
      totalInvested: invested,
      currentValue: current,
      totalPL: current - invested,
    };
  }, [portfolio, marketData]);

  // 3. Trade Logic
  const openTradeModal = async (p, type) => {
    setTradeType(type);
    setSelectedStock(p);
    setQuantity(1);
    setShowModal(true);
    setTradePrice(0); 

    try {
      const analysis = await getAnalysis(p.symbol);
      setTradePrice(analysis.price);
    } catch {
      setTradePrice(marketData[p.symbol]?.price || 0);
    }
  };

  const handleConfirmTrade = () => {
    if (!selectedStock || tradePrice === 0) return;

    let newPortfolio = [...portfolio];
    const existingIndex = newPortfolio.findIndex((p) => p.symbol === selectedStock.symbol);

    if (existingIndex === -1) return;

    const existing = newPortfolio[existingIndex];

    if (tradeType === "BUY") {
      const totalCost = (existing.quantity * parseFloat(existing.price)) + (quantity * tradePrice);
      const newQty = existing.quantity + quantity;
      existing.quantity = newQty;
      existing.price = (totalCost / newQty).toFixed(2);
    } 
    else if (tradeType === "SELL") {
      if (existing.quantity < quantity) {
        alert("Not enough shares!");
        return;
      }
      existing.quantity -= quantity;
    }

    if (existing.quantity <= 0) {
      newPortfolio = newPortfolio.filter(p => p.symbol !== selectedStock.symbol);
    }

    localStorage.setItem("portfolio", JSON.stringify(newPortfolio));
    setPortfolio(newPortfolio);
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        
        {/* -------- PORTFOLIO SUMMARY CARD -------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <div className="text-slate-400 text-sm font-semibold">Current Value</div>
                <div className="text-3xl font-bold text-white">
                    {loading ? "..." : `₹${currentValue.toFixed(2)}`}
                </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <div className="text-slate-400 text-sm font-semibold">Total Invested</div>
                <div className="text-3xl font-bold text-slate-200">
                   ₹{totalInvested.toFixed(2)}
                </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <div className="text-slate-400 text-sm font-semibold">Total P/L</div>
                <div className={`text-3xl font-bold ${totalPL >= 0 ? "text-green-400" : "text-red-400"}`}>
                   {totalPL >= 0 ? "+" : ""}₹{totalPL.toFixed(2)}
                </div>
            </div>
        </div>

        <h2 className="text-xl font-bold mb-4">Your Holdings</h2>

        {portfolio.length === 0 && !loading && (
          <div className="text-slate-500 text-center py-10 bg-slate-900 rounded-xl border border-slate-800">
            You don't own any stocks yet.
          </div>
        )}

        <div className="grid gap-3">
          {portfolio.map((p) => {
            const liveData = marketData[p.symbol] || {};
            const livePrice = liveData.price || 0;
            const name = liveData.name || p.symbol; // Use name if found, else symbol
            
            // Calculate individual stock P/L
            const gain = (livePrice - p.price) * p.quantity;
            const isProfit = gain >= 0;

            return (
              <div
                key={p.symbol}
                className="group relative p-5 bg-slate-800 rounded-xl border border-slate-700 flex flex-col sm:flex-row justify-between items-center transition-all hover:bg-slate-750 hover:border-slate-600 gap-4"
              >
                {/* LEFT: Name & Symbol */}
                <div className="flex-1">
                  <a href={`/stock/${p.symbol}`} className="text-lg font-bold hover:underline block">
                    {name}
                  </a>
                  <div className="text-slate-400 text-xs font-mono bg-slate-900 px-2 py-0.5 rounded w-fit mt-1">
                    {p.symbol}
                  </div>
                </div>

                {/* MIDDLE: Stats */}
                <div className="flex gap-8 text-sm text-right">
                    <div>
                        <div className="text-slate-400">Qty</div>
                        <div className="font-semibold">{p.quantity}</div>
                    </div>
                    <div>
                        <div className="text-slate-400">Avg</div>
                        <div className="font-semibold">₹{p.price}</div>
                    </div>
                    <div>
                         <div className="text-slate-400">LTP</div>
                         <div className={`font-semibold ${loading ? "animate-pulse" : ""}`}>
                            ₹{livePrice.toFixed(2)}
                         </div>
                    </div>
                    <div className="min-w-[80px]">
                         <div className="text-slate-400">P/L</div>
                         <div className={`font-bold ${isProfit ? "text-green-400" : "text-red-400"}`}>
                            {isProfit ? "+" : ""}₹{gain.toFixed(2)}
                         </div>
                    </div>
                </div>

                {/* RIGHT: Buttons (Hover Only) */}
                <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => openTradeModal(p, "BUY")}
                    className="px-4 py-1.5 bg-green-600 text-sm font-bold rounded hover:bg-green-500 shadow-lg shadow-green-900/20"
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => openTradeModal(p, "SELL")}
                    className="px-4 py-1.5 bg-red-600 text-sm font-bold rounded hover:bg-red-500 shadow-lg shadow-red-900/20"
                  >
                    Sell
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ----------- TRADE MODAL ----------- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-96 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold">
              {tradeType === "BUY" ? "Buy" : "Sell"} {marketData[selectedStock?.symbol]?.name}
            </h2>

            <div className="bg-slate-900 p-3 rounded text-center">
                <span className="text-slate-400 text-sm">Current Market Price</span>
                <div className="text-xl font-mono font-bold">
                    {tradePrice === 0 ? <span className="animate-pulse">Loading...</span> : `₹${tradePrice.toFixed(2)}`}
                </div>
            </div>

            <div>
              <label className="text-sm text-slate-400">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value || 1))}
                className="mt-1 w-full bg-slate-700 border border-slate-600 rounded p-2 outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="flex justify-between pt-3 gap-3">
              <button
                className="flex-1 px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 font-medium"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button
                disabled={tradePrice === 0}
                className={`flex-1 px-4 py-2 rounded font-bold ${
                    tradePrice === 0 ? "bg-slate-600 cursor-not-allowed" :
                  tradeType === "BUY"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
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