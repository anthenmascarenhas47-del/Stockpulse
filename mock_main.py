from fastapi import FastAPI
from datetime import datetime, timedelta
import random
try:
    from companies import COMPANIES
except Exception:
    COMPANIES = [
        {"symbol": "RELIANCE.NS", "name": "Reliance Industries Ltd"},
        {"symbol": "TCS.NS", "name": "Tata Consultancy Services Ltd"},
        {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Ltd"},
    ]

app = FastAPI()


@app.get("/health")
async def health():
    return {"ok": True}


@app.get("/market")
async def market():
    result = []
    for c in COMPANIES:
        price = round(random.uniform(100, 2500), 2)
        change = round(random.uniform(-10, 10), 2)
        percent = round((change / max(1, price - change)) * 100, 2)
        result.append({
            "name": c.get("name", ""),
            "symbol": c.get("symbol", ""),
            "price": price,
            "change": change,
            "percent": percent,
            "sector": c.get("sector", "Unknown"),
        })
    return result


@app.get("/indices")
async def indices():
    return [
        {"name": "Nifty 50", "price": 22500, "change": 120, "percent": 0.53},
        {"name": "Bank Nifty", "price": 48000, "change": -200, "percent": -0.42},
    ]


@app.get("/search")
async def search(q: str = ""):
    q = q.lower().strip()
    return [c for c in COMPANIES if q in c.get("name", "").lower() or q in c.get("symbol", "").lower()][:15]


@app.get("/company/{symbol}")
async def company(symbol: str):
    for c in COMPANIES:
        if c.get("symbol") == symbol:
            return c
    return {"symbol": symbol, "name": symbol}


def make_candles(n=60):
    now = datetime.utcnow()
    candles = []
    base = 100.0
    for i in range(n):
        t = now - timedelta(minutes=(n - i))
        openp = base + random.uniform(-1, 1)
        close = openp + random.uniform(-2, 2)
        high = max(openp, close) + random.uniform(0, 1)
        low = min(openp, close) - random.uniform(0, 1)
        vol = random.randint(1000, 100000)
        candles.append({
            "timestamp": t.isoformat(),
            "Open": round(openp, 2),
            "High": round(high, 2),
            "Low": round(low, 2),
            "Close": round(close, 2),
            "Volume": vol,
        })
        base = close
    return candles


@app.get("/chart_data/{symbol}")
async def chart_data(symbol: str, interval: str = "1d"):
    return {"market_closed": True, "data": make_candles(60)}


@app.get("/analyze/{symbol}")
async def analyze(symbol: str, interval: str = "1d"):
    return {
        "symbol": symbol,
        "price": round(random.uniform(100, 2500), 2),
        "prob_bull": round(random.uniform(0, 1), 2),
        "prob_bear": round(random.uniform(0, 1), 2),
        "trend": random.choice(["BUY", "SELL", "NO TRADE"]),
        "market_closed": True,
        "support": round(random.uniform(80, 100), 2),
        "resistance": round(random.uniform(110, 130), 2),
        "reason": ["Mock analysis: backend unavailable or in mock mode"]
    }
