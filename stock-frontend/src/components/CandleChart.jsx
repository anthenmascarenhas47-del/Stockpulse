import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import { getChart } from "../api/api";

export default function CandleChart({ symbol }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    // Inside your CandleChart.jsx useEffect
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 450,
      layout: {
        background: { color: "transparent" }, // Let the parent container color show through
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: "#6366f1", labelBackgroundColor: "#6366f1" },
        horzLine: { color: "#6366f1", labelBackgroundColor: "#6366f1" },
      },
    });

    const candleSeries = chart.addCandlestickSeries();
    const emaSeries = chart.addLineSeries({ color: "#FFA500" });

    async function load() {
      const res = await getChart(symbol); // 'res' is now the object { market_closed, data }

      // Check if data exists to prevent errors
      if (!res || !res.data) return;

      const candles = res.data.map(d => ({
        time: Math.floor(new Date(d.Date).getTime() / 1000),
        open: d.Open,
        high: d.High,
        low: d.Low,
        close: d.Close,
      }));

      candleSeries.setData(candles);

      emaSeries.setData(
        res.data.map(d => ({
          time: Math.floor(new Date(d.Date).getTime() / 1000),
          value: d.ema9,
        }))
      );
    }

    load();

    return () => chart.remove();
  }, [symbol]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[450px] p-4 rounded bg-slate-800"
    />
  );
}
