import { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import { getChart } from "../api/api";

export default function CandleChart({ symbol, selectedInterval = "1d", onIntervalChange }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const supportLineRef = useRef(null);
  const resistanceLineRef = useRef(null);
  const INTERVALS = [
    { value: "1m", label: "1 Minute" },
    { value: "5m", label: "5 Minutes" },
    { value: "10m", label: "10 Minutes" },
    { value: "30m", label: "30 Minutes" },
    { value: "1h", label: "1 Hour" },
    { value: "1d", label: "1 Day" },
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
  ];

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
        // Disable TradingView attribution logo
        attributionLogo: false,
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

    const ema21Series = chart.addLineSeries({
      color: "#60a5fa",
      lineWidth: 1,
    });

    async function load() {
  // Use daily historical 1-year data
  const res = await getChart(symbol, selectedInterval); // default daily
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

  if (res.data[0]?.ema21 !== undefined) {
    ema21Series.setData(
      res.data.map((d) => ({
        time: Math.floor(new Date(d.Date).getTime() / 1000),
        value: d.ema21,
      }))
    );
  }

  // Support / Resistance lines (from backend)
  const support = Number(res.data[0]?.support ?? res.data[res.data.length - 1]?.support);
  const resistance = Number(res.data[0]?.resistance ?? res.data[res.data.length - 1]?.resistance);

  // Remove previous lines if present
  try {
    if (supportLineRef.current) {
      candleSeries.removePriceLine(supportLineRef.current);
      supportLineRef.current = null;
    }
  } catch { /* ignore */ }

  try {
    if (resistanceLineRef.current) {
      candleSeries.removePriceLine(resistanceLineRef.current);
      resistanceLineRef.current = null;
    }
  } catch (e) {}

  if (!isNaN(support)) {
    supportLineRef.current = candleSeries.createPriceLine({
      price: support,
      color: "#60a5fa",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "S",
    });
  }

  if (!isNaN(resistance)) {
    resistanceLineRef.current = candleSeries.createPriceLine({
      price: resistance,
      color: "#f97373",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "R",
    });
  }

  // EMA crossover markers
  const markers = [];
  for (let i = 1; i < res.data.length; i++) {
    const prev = res.data[i - 1];
    const curr = res.data[i];

    if (prev.ema9 === undefined || prev.ema21 === undefined || curr.ema9 === undefined || curr.ema21 === undefined) continue;

    const prevDiff = prev.ema9 - prev.ema21;
    const currDiff = curr.ema9 - curr.ema21;

    const time = Math.floor(new Date(curr.Date).getTime() / 1000);

    if (prevDiff < 0 && currDiff > 0) {
      // Bullish crossover
      markers.push({ time, position: "belowBar", color: "#10b981", shape: "arrowUp", text: "BUY" });
    } else if (prevDiff > 0 && currDiff < 0) {
      // Bearish crossover
      markers.push({ time, position: "aboveBar", color: "#ef4444", shape: "arrowDown", text: "SELL" });
    }
  }

  candleSeries.setMarkers(markers);

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
  }, [symbol, selectedInterval]);

  return (
    <div className="p-4 rounded bg-slate-800">
      <div className="flex justify-end mb-2">
        <select
          value={selectedInterval}
          onChange={(e) => onIntervalChange ? onIntervalChange(e.target.value) : null}
          className="bg-slate-700 text-sm p-1 rounded"
        >
          {INTERVALS.map((it) => (
            <option key={it.value} value={it.value}>
              {it.label}
            </option>
          ))}
        </select>
      </div>
      <div ref={containerRef} className="w-full h-[450px]" />
    </div>

  );
}
