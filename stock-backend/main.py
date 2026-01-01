from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import joblib, os, time
import yfinance as yf
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from companies import COMPANIES
import ta

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# ---------------- HELPERS ----------------
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

# Daily historical data for 1 year
def download_daily(symbol):
    return safe_download(symbol, "1d", "1y")

# Intraday live data for current session
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

# ---------------- TRAIN MODEL ----------------
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

# ---------------- ROUTES ----------------
@app.get("/search")
async def search(q: str = Query("")):
    q = q.lower().strip()
    results = [c for c in COMPANIES if q in c["name"].lower() or q in c["symbol"].lower()]
    return results[:15]

@app.get("/chart_data/{symbol}")
async def chart_data(symbol: str, interval: str = "1d"):
    """
    interval: '1d' for historical, '1m' for live session
    """
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
