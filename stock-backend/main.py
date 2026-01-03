from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib, os, time
import yfinance as yf
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from companies import COMPANIES
import ta
import math

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INDICES = [
    {"name": "Nifty 50", "symbol": "^NSEI"},
    {"name": "Bank Nifty", "symbol": "^NSEBANK"},
    {"name": "Sensex", "symbol": "^BSESN"},
]

MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
FEATURES_PATH = os.path.join(MODEL_DIR, "features.pkl")

if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)

TRAIN_TICKERS = [
    "RELIANCE.NS","TCS.NS","INFY.NS","HDFCBANK.NS","SBIN.NS",
    "ICICIBANK.NS","KOTAKBANK.NS","AXISBANK.NS","ITC.NS","LT.NS",
    "BHARTIARTL.NS","BAJFINANCE.NS","ASIANPAINT.NS","SUNPHARMA.NS",
    "WIPRO.NS","HCLTECH.NS","POWERGRID.NS","ULTRACEMCO.NS"
]

FEATURES = ["ema9", "ema21", "ema_diff", "rsi", "atr", "vol_ratio"]

# functions

def safe_download(symbol: str, interval: str, period: str):
    df = yf.download(symbol, interval=interval, period=period, progress=False)

    if df is None or df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for '{symbol}'."
        )

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
    df.dropna(inplace=True)
    return df

def download_daily(symbol):
    return safe_download(symbol, "1d", "1y")

def download_intraday(symbol):
    return safe_download(symbol, "1m", "1d")

def make_features(df: pd.DataFrame):
    for c in ["Open","High","Low","Close","Volume"]:
        df[c] = pd.to_numeric(df[c].to_numpy().flatten(), errors="coerce")

    df["ema9"] = df["Close"].ewm(span=9).mean()
    df["ema21"] = df["Close"].ewm(span=21).mean()
    df["ema_diff"] = (df["ema9"] - df["ema21"]) / df["ema21"]

    df["rsi"] = ta.momentum.RSIIndicator(df["Close"]).rsi()
    df["atr"] = ta.volatility.AverageTrueRange(
        df["High"], df["Low"], df["Close"]
    ).average_true_range()

    df["vol_sma"] = df["Volume"].rolling(window=20).mean()
    df["vol_ratio"] = df["Volume"] / df["vol_sma"]

    df.dropna(inplace=True)
    return df

def clean_number(x):
    """Return a JSON-safe float (no NaN/inf)."""
    if x is None:
        return 0.0
    if isinstance(x, float) and (math.isnan(x) or math.isinf(x)):
        return 0.0
    try:
        return float(x)
    except:
        return 0.0


def train():
    print("Training with multiple NSE stocks...")
    frames = []

    for t in TRAIN_TICKERS:
        try:
            df = download_daily(t)
            df = make_features(df)
            frames.append(df)
            time.sleep(0.5)
        except Exception as e:
            print(f"Skipping {t}: {e}")

    if not frames:
        print("Training failed — no data.")
        return

    data = pd.concat(frames)

    X = data[FEATURES]
    y = (data["Close"].shift(-5) > data["Close"]).astype(int)[:-5]

    model = XGBClassifier(
        n_estimators=350,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.9,
        colsample_bytree=0.9,
    )

    model.fit(X.iloc[:-5], y)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(FEATURES, FEATURES_PATH)
    print("Model trained + saved ✔️")

if not os.path.exists(MODEL_PATH):
    train()

model = joblib.load(MODEL_PATH)
features = joblib.load(FEATURES_PATH)

def is_market_closed(df):
    if df.empty: return True
    last = pd.to_datetime(df.index[-1])
    if last.tz is None: last = last.tz_localize("UTC")
    else: last = last.tz_convert("UTC")
    return (pd.Timestamp.utcnow() - last).total_seconds() > 30 * 60


# routes

@app.get("/search")
async def search(q: str = Query("")):
    q = q.lower().strip()
    results = [c for c in COMPANIES if q in c["name"].lower() or q in c["symbol"].lower()]
    return results[:15]

@app.get("/market")
async def get_market():
    symbols = [c["symbol"] for c in COMPANIES]

    try:
        # We already fetch 5d, so we have the history needed
        data = yf.download(
            symbols,
            period="5d", 
            interval="1d",
            group_by="ticker",
            progress=False,
            threads=True,
            timeout=10
        )
    except Exception as e:
        print(f"yfinance download failed: {e}")
        return []

    result = []
    
    for c in COMPANIES:
        sym = c["symbol"]
        price = 0.0
        change = 0.0   # New field
        percent = 0.0  # New field
        
        try:
            if not data.empty:
                # Handle single vs multi-symbol structure
                if len(symbols) > 1 and sym in data.columns:
                    ticker_data = data[sym]
                else:
                    ticker_data = data

                if "Close" in ticker_data.columns:
                    series = ticker_data["Close"].dropna()
                    
                    # LOGIC: Compare Today vs Yesterday
                    if len(series) >= 2:
                        price = series.iloc[-1]
                        prev_close = series.iloc[-2]
                        change = price - prev_close
                        percent = (change / prev_close) * 100
                    elif len(series) == 1:
                        price = series.iloc[-1]

        except Exception as e:
            # print(f"Error parsing {sym}: {e}") # Optional: silence errors for cleaner logs
            pass

        result.append({
            "name": c["name"],
            "symbol": sym,
            "price": clean_number(price),
            "change": clean_number(change),    # Send to frontend
            "percent": clean_number(percent),  # Send to frontend
            "sector": c.get("sector", "Unknown"),
        })

    return result

@app.get("/chart_data/{symbol}")
async def chart_data(symbol: str, interval: str = "1d"):
    if interval == "1m":
        df = download_intraday(symbol)
    else:
        df = download_daily(symbol)

    df = make_features(df)
    closed = is_market_closed(df)
    data = df.reset_index()
    data["Date"] = data.iloc[:, 0].astype(str)

    return {"market_closed": closed, "data": data.to_dict(orient="records")}


@app.get("/analyze/{symbol}")
async def analyze(symbol: str):
    try:
        df = download_intraday(symbol)
        df = make_features(df)
        closed = is_market_closed(df)

        X = df[features].tail(1)
        probs = model.predict_proba(X)[0]

        return {
            "symbol": symbol,
            "price": float(df["Close"].iloc[-1]),
            "prob_bull": float(probs[1]),
            "prob_bear": float(probs[0]),
            "trend": (
                "BUY" if probs[1] > 0.6
                else "SELL" if probs[0] > 0.6
                else "NO TRADE"
            ),
            "market_closed": closed
        }
    except Exception:
        return {
            "symbol": symbol,
            "price": 0,
            "prob_bull": 0,
            "prob_bear": 0,
            "trend": "NEUTRAL",
            "market_closed": True
        }

@app.get("/company/{symbol}")
async def company(symbol: str):
    for c in COMPANIES:
        if c["symbol"] == symbol:
            return c
    raise HTTPException(status_code=404, detail="Company not found")


@app.get("/indices")
async def get_indices():
    symbols = [i["symbol"] for i in INDICES]
    
    try:
        # CHANGE: Fetch "5d" instead of "1d" to ensure we get previous closing price
        data = yf.download(
            symbols, 
            period="5d", 
            interval="1d", 
            group_by="ticker", 
            progress=False,
            threads=True
        )
    except Exception:
        return []

    results = []
    for i in INDICES:
        sym = i["symbol"]
        price = 0.0
        change = 0.0
        percent = 0.0

        try:
            if not data.empty:
                # Handle MultiIndex vs Single Index structure
                if isinstance(data.columns, pd.MultiIndex):
                    ticker_df = data[sym]
                else:
                    ticker_df = data

                # Get closing prices
                if "Close" in ticker_df:
                    hist = ticker_df["Close"].dropna()
                    
                    # LOGIC: We need at least 2 days to calc % change
                    if len(hist) >= 2:
                        price = hist.iloc[-1]       # Today's Price
                        prev_close = hist.iloc[-2]  # Yesterday's Price
                        
                        change = price - prev_close
                        percent = (change / prev_close) * 100
                    
                    elif len(hist) == 1:
                        price = hist.iloc[-1]

        except Exception as e:
            print(f"Error parsing index {sym}: {e}")

        results.append({
            "name": i["name"],
            "price": clean_number(price),
            "change": clean_number(change),
            "percent": clean_number(percent)
        })
        
    return results