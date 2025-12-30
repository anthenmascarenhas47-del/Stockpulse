import { useState } from "react";
import { analyze, searchCompanies } from "../api/api";
import CandleChart from "../components/CandleChart";

export default function Dashboard() {
  const [symbol, setSymbol] = useState("INFY.NS");
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [analysis, setAnalysis] = useState(null);

  const handleSearch = async q => {
    setInput(q);
    const r = await searchCompanies(q);
    setResults(r);
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl mb-4">Stock Dashboard</h1>

      <input
        className="text-black p-2 rounded"
        value={input}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search company…"
      />

      <ul className="bg-gray-700 mt-2 rounded">
        {results.map(r => (
          <li
            key={r.symbol}
            className="p-2 cursor-pointer hover:bg-gray-600"
            onClick={() => { setSymbol(r.symbol); setResults([]); setInput(r.symbol); }}
          >
            {r.name} — {r.symbol}
          </li>
        ))}
      </ul>

      <button
        className="bg-green-600 px-4 py-2 my-3 rounded"
        onClick={async () => setAnalysis(await analyze(symbol))}
      >
        Analyze
      </button>

      {analysis && (
        <div className="mb-4">
          Trend: {analysis.trend} — Price: ₹{analysis.price}
        </div>
      )}

      <CandleChart symbol={symbol} />
    </div>
  );
}
