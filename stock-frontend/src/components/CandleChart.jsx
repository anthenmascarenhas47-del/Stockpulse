import { useEffect, useRef } from "react";

export default function CandleChart({ symbol }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Remove any old widget if exists
    chartRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      new window.TradingView.widget({
        width: chartRef.current.clientWidth,
        height: 400,
        symbol: symbol, // e.g. "NSE:INFY"
        interval: "D",
        timezone: "Asia/Kolkata",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        container_id: chartRef.current.id,
      });
    };

    chartRef.current.appendChild(script);

    // Cleanup old widget on unmount
    return () => {
      chartRef.current.innerHTML = "";
    };
  }, [symbol]);

  return (
    <div
      ref={chartRef}
      id={`tradingview_${symbol.replace(/[:.]/g, "_")}`}
      className="bg-slate-800 p-4 rounded shadow mt-6"
    >
      <h2 className="text-xl font-bold mb-2 text-white">
        {symbol} Candlestick Chart
      </h2>
    </div>
  );
}
