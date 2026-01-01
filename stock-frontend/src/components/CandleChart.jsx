import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import { getChart } from "../api/api";

export default function CandleChart({ symbol }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Reset container to avoid duplicate charts
    containerRef.current.innerHTML = "";

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 450,
      layout: {
        background: { color: "transparent" },
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
      timeScale: {
        secondsVisible: false,
        borderColor: "#1e293b",
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    const emaSeries = chart.addLineSeries({
      color: "#f59e0b",
      lineWidth: 2,
    });

    async function load() {
  // Use daily historical 1-year data
  const res = await getChart(symbol); // default daily
  if (!res || !res.data) return;

  const candles = res.data.map((d) => ({
    time: Math.floor(new Date(d.Date).getTime() / 1000),
    open: d.Open,
    high: d.High,
    low: d.Low,
    close: d.Close,
  }));

  candleSeries.setData(candles);

  if (res.data[0]?.ema9 !== undefined) {
    emaSeries.setData(
      res.data.map((d) => ({
        time: Math.floor(new Date(d.Date).getTime() / 1000),
        value: d.ema9,
      }))
    );
  }

  chart.timeScale().fitContent();


    }

    load();
    const interval = setInterval(load, 15000);

    // Resize chart with container
    function handleResize() {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
      });
    }

    window.addEventListener("resize", handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [symbol]);

  return (
    <div className="p-4 rounded bg-slate-800">
      <div ref={containerRef} className="w-full h-[450px]" />
    </div>

  );
}
