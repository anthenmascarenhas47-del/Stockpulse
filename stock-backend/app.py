from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib, os, time
import yfinance as yf
import pandas as pd
import numpy as np
import ta
from xgboost import XGBClassifier

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "models/model.pkl"
FEATURES_PATH = "models/features.pkl"

TRAIN_TICKERS = ["RELIANCE.NS","TCS.NS","INFY.NS"]

# -------- Downloaders --------
def download_daily(symbol):
    return yf.download(symbol, interval="1d", period="5y", progress=False)[['Open','High','Low','Close','Volume']].dropna()

def download_intraday(symbol):
    return yf.download(symbol, interval="5m", period="7d", progress=False)[['Open','High','Low','Close','Volume']].dropna()

# -------- Feature Builders --------
def make_features(df):
    # --- flatten multi-index columns if any ---
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [c[0] if isinstance(c, tuple) else c for c in df.columns]

    o = df["Open"]
    h = df["High"]
    l = df["Low"]
    c = df["Close"]

    # ----- indicators -----
    df["ema9"]  = c.ewm(span=9).mean()
    df["ema21"] = c.ewm(span=21).mean()

    # IMPORTANT: always compute from Series (not DataFrame)
    df["ema9_ema21_diff"] = (df["ema9"] - df["ema21"]) / (c + 1e-9)

    df["sma50"] = c.rolling(50).mean()

    from ta.momentum import RSIIndicator
    df["rsi"] = RSIIndicator(c).rsi()

    from ta.trend import MACD
    macd = MACD(c)
    df["macd"] = macd.macd()
    df["macd_signal"] = macd.macd_signal()

    from ta.volatility import BollingerBands, AverageTrueRange
    bb = BollingerBands(c)
    df["bb_pct"] = bb.bollinger_pband()

    df["atr"] = AverageTrueRange(h, l, c).average_true_range()

    df.dropna(inplace=True)
    return df


FEATURES = [
   "ema9","ema21","ema9_ema21_diff","sma50",
   "rsi","macd","macd_signal","bb_pct","atr","Volume"
]

# -------- Training --------
def train():
    frames=[]
    for t in TRAIN_TICKERS:
        df = download_daily(t)
        df = make_features(df)
        frames.append(df)
        time.sleep(0.3)

    data = pd.concat(frames)
    X = data[FEATURES]
    y = (data["Close"].shift(-5) > data["Close"]).astype(int)[:-5]

    model = XGBClassifier(n_estimators=300, learning_rate=0.05, max_depth=5)
    model.fit(X.iloc[:-5], y)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(FEATURES, FEATURES_PATH)
    print("Model trained ✔")

# Train automatically once
if not os.path.exists(MODEL_PATH):
    train()

model = joblib.load(MODEL_PATH)
features = joblib.load(FEATURES_PATH)

# -------- API --------
@app.get("/analyze/{symbol}")
async def analyze(symbol: str):
    df = download_intraday(symbol)
    df = make_features(df)

    probs = model.predict_proba(df[features])[-1]
    price = float(df["Close"].iloc[-1])

    bull = float(probs[1])
    bear = float(probs[0])

    trend = "BUY" if bull > 0.6 else "SELL" if bear > 0.6 else "NO TRADE"

    return {
        "symbol": symbol,
        "trend": trend,
        "prob_bull": bull,
        "prob_bear": bear,
        "price": price,
        "rsi": float(df["rsi"].iloc[-1])
    }
