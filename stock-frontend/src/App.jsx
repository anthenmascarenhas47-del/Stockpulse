import { useState } from "react";
import { analyzeStock } from "./api";

function App() {
  const [symbol, setSymbol] = useState("");   // user input
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!symbol) return alert("Enter a stock symbol first");

    try {
      const data = await analyzeStock(symbol);
      setResult(data);
      console.log(data);
    } catch (err) {
      console.error(err);
      alert("Error fetching data");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Stock Analyzer</h1>

      <input
        type="text"
        placeholder="Enter stock symbol e.g. TCS.NS"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        style={{ marginRight: 10 }}
      />

      <button onClick={handleAnalyze}>Analyze</button>

      {result && (
        <div style={{ marginTop: 20 }}>
          <p>Symbol: {result.symbol}</p>
          <p>Trend: {result.trend}</p>
          <p>Bull probability: {result.prob_bull}</p>
          <p>Bear probability: {result.prob_bear}</p>
          <p>Price: {result.price}</p>
          <p>RSI: {result.rsi}</p>
        </div>
      )}
    </div>
  );
}

export default App;
