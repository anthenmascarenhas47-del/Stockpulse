import Navbar from "../components/Navbar";

export default function Dashboard() {
  const portfolio = JSON.parse(localStorage.getItem("portfolio") || "[]");

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">My Portfolio</h1>

        {portfolio.length === 0 && (
          <div className="text-slate-500">
            You don't own any stocks yet.
          </div>
        )}

        {portfolio.map(p => (
          <div
            key={p.symbol}
            className="p-4 bg-slate-800 rounded-xl border border-slate-700 mb-2"
          >
            <div className="flex justify-between">
              <span className="font-semibold">{p.symbol}</span>
              <span>{p.quantity} shares</span>
              <span>Avg Price: ₹{p.price}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
