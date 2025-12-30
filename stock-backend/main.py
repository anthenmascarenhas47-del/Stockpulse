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

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # (open for dev — tighten later)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
FEATURES_PATH = os.path.join(MODEL_DIR, "features.pkl")

# Ensure the models directory exists
if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)

TRAIN_TICKERS = ["RELIANCE.NS", "TCS.NS", "INFY.NS"]
FEATURES = ["ema9", "ema21", "ema_diff", "rsi", "atr", "vol_ratio"]


# ------------- HELPERS ----------------
def safe_download(symbol: str, interval: str, period: str):
    # Fetch data
    df = yf.download(symbol, interval=interval, period=period, progress=False)

    if df is None or df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for symbol '{symbol}'. Check ticker name."
        )

    # FIX: yfinance now returns MultiIndex columns. We flatten them here.
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    # Normalize expected columns and ensure they are 1D
    try:
        # Select columns and create a clean copy
        df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
        df = df.dropna()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Bad data format returned for {symbol}: {str(e)}"
        )

    return df


def download_daily(symbol):
    return safe_download(symbol, "1d", "5y")


def download_intraday(symbol):
    return safe_download(symbol, "5m", "7d")


def make_features(df: pd.DataFrame):
    # Standardize columns
    for col in ["Open", "High", "Low", "Close", "Volume"]:
        df[col] = pd.to_numeric(df[col].to_numpy().flatten(), errors='coerce')

    # 1. Trend Indicators
    df["ema9"] = df["Close"].ewm(span=9).mean()
    df["ema21"] = df["Close"].ewm(span=21).mean()
    df["ema_diff"] = (df["ema9"] - df["ema21"]) / df["ema21"] # Percentage gap

    # 2. Momentum
    df["rsi"] = ta.momentum.RSIIndicator(df["Close"].squeeze()).rsi()
    
    # 3. Volatility (ATR - Average True Range)
    df["atr"] = ta.volatility.AverageTrueRange(df["High"], df["Low"], df["Close"]).average_true_range()
    
    # 4. Volume Momentum
    df["vol_sma"] = df["Volume"].rolling(window=20).mean()
    df["vol_ratio"] = df["Volume"] / df["vol_sma"]

    df.dropna(inplace=True)
    return df


# ------------- TRAIN MODEL (ONCE) -------------
def train():
    print("Training model... please wait.")
    frames = []

    for t in TRAIN_TICKERS:
        try:
            df = download_daily(t)
            df = make_features(df)
            frames.append(df)
            time.sleep(0.5) # Avoid rate limiting
        except Exception as e:
            print(f"Skipping {t} due to error: {e}")

    if not frames:
        print("Error: No data available to train the model.")
        return

    data = pd.concat(frames)

    X = data[FEATURES]
    # Prediction: Is price higher 5 bars from now?
    y = (data["Close"].shift(-5) > data["Close"]).astype(int)[:-5]

    model = XGBClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.9,
        colsample_bytree=0.9,
    )

    # Fit excluding the last 5 rows where y is NaN
    model.fit(X.iloc[:-5], y)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(FEATURES, FEATURES_PATH)
    print("Model trained and saved.")


if not os.path.exists(MODEL_PATH):
    train()

# Load model and features after ensuring they exist
model = joblib.load(MODEL_PATH)
features = joblib.load(FEATURES_PATH)

def is_market_closed(df):
    if df.empty: return True
    last = pd.to_datetime(df.index[-1])
    # Convert last index to UTC if it isn't already
    if last.tz is None:
        last = last.tz_localize('UTC')
    else:
        last = last.tz_convert('UTC')
        
    now = pd.Timestamp.utcnow()
    return (now - last).total_seconds() > (30 * 60)


# ------------- ROUTES ----------------

@app.get("/search")
async def search(q: str = Query("")):
    q = q.lower().strip()
    results = [
        c for c in COMPANIES
        if q in c["name"].lower() or q in c["symbol"].lower()
    ]
    return results[:15]


@app.get("/chart_data/{symbol}")
async def chart_data(symbol: str):
    df = download_intraday(symbol)
    df = make_features(df)

    closed = is_market_closed(df)

    # Take last 200 candles for the chart
    data = df.tail(200).reset_index()
    # Ensure the date column is string formatted for JSON
    data["Date"] = data.iloc[:, 0].astype(str)

    return {
        "market_closed": closed,
        "data": data.to_dict(orient="records")
    }


@app.get("/analyze/{symbol}")
async def analyze(symbol: str):
    df = download_intraday(symbol)
    df = make_features(df)

    closed = is_market_closed(df)

    # Get features for the most recent candle
    current_features = df[features].tail(1)
    probs = model.predict_proba(current_features)[0]

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