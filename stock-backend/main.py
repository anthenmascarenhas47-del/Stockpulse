from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib, os, time, math
import yfinance as yf
import pandas as pd
from xgboost import XGBClassifier
from companies import COMPANIES
import ta
from chatbot import ask_local_ai
from pydantic import BaseModel

# ================= APP ================= #

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= CONSTANTS ================= #

INDICES = [
    {"name": "Nifty 50", "symbol": "^NSEI"},
    {"name": "Bank Nifty", "symbol": "^NSEBANK"},
    {"name": "Sensex", "symbol": "^BSESN"},
]

MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
FEATURES_PATH = os.path.join(MODEL_DIR, "features.pkl")

TRAIN_TICKERS = [
    "RELIANCE.NS","TCS.NS","INFY.NS","HDFCBANK.NS","SBIN.NS",
    "ICICIBANK.NS","KOTAKBANK.NS","AXISBANK.NS","ITC.NS","LT.NS",
    "BHARTIARTL.NS","BAJFINANCE.NS","ASIANPAINT.NS","SUNPHARMA.NS",
    "WIPRO.NS","HCLTECH.NS","POWERGRID.NS","ULTRACEMCO.NS"
]

FEATURES = ["ema9","ema21","ema_diff","rsi","atr","vol_ratio"]

if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)

# ================= DATA HELPERS ================= #

def safe_download(symbol, interval, period):
    df = yf.download(symbol, interval=interval, period=period, progress=False)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail="No data")

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df = df[["Open","High","Low","Close","Volume"]].dropna()
    return df

def download_daily(symbol):
    return safe_download(symbol, "1d", "1y")

def download_intraday(symbol):
    return safe_download(symbol, "1m", "1d")

# ================= FEATURES ================= #

def make_features(df):
    df["ema9"] = df["Close"].ewm(span=9).mean()
    df["ema21"] = df["Close"].ewm(span=21).mean()
    df["ema_diff"] = (df["ema9"] - df["ema21"]) / df["ema21"]

    df["rsi"] = ta.momentum.RSIIndicator(df["Close"]).rsi()

    df["atr"] = ta.volatility.AverageTrueRange(
        df["High"], df["Low"], df["Close"]
    ).average_true_range()

    df["vol_sma"] = df["Volume"].rolling(20).mean()
    df["vol_ratio"] = df["Volume"] / df["vol_sma"]

    df.dropna(inplace=True)
    return df

# ================= SUPPORT / RESISTANCE ================= #

def support_resistance(df, window=20):
    recent = df.tail(window)
    return recent["Low"].min(), recent["High"].max()

# ================= UTILS ================= #

def clean_number(x):
    try:
        x = float(x)
        if math.isnan(x) or math.isinf(x):
            return 0.0
        return x
    except:
        return 0.0

def is_market_closed(df):
    if df.empty:
        return True
    last = pd.to_datetime(df.index[-1])
    if last.tz is None:
        last = last.tz_localize("UTC")
    else:
        last = last.tz_convert("UTC")
    return (pd.Timestamp.utcnow() - last).total_seconds() > 30 * 60

# ================= MODEL TRAIN ================= #

def train():
    frames = []
    for t in TRAIN_TICKERS:
        try:
            frames.append(make_features(download_daily(t)))
            time.sleep(0.3)
        except:
            pass

    if not frames:
        return

    data = pd.concat(frames)
    X = data[FEATURES]
    y = (data["Close"].shift(-5) > data["Close"]).astype(int)[:-5]

    model = XGBClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.9,
        colsample_bytree=0.9,
        eval_metric="logloss"
    )

    model.fit(X.iloc[:-5], y)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(FEATURES, FEATURES_PATH)

if not os.path.exists(MODEL_PATH):
    train()

model = joblib.load(MODEL_PATH)
features = joblib.load(FEATURES_PATH)

# ================= ROUTES ================= #

@app.get("/search")
async def search(q: str = Query("")):
    q = q.lower().strip()
    return [c for c in COMPANIES if q in c["name"].lower() or q in c["symbol"].lower()][:15]

@app.get("/market")
async def get_market():
    symbols = [c["symbol"] for c in COMPANIES]

    try:
        data = yf.download(
            symbols,
            period="5d",
            interval="1d",
            group_by="ticker",
            progress=False,
            threads=True
        )
    except:
        return []

    result = []

    for c in COMPANIES:
        sym = c["symbol"]
        price = change = percent = 0.0

        try:
            df = data[sym] if isinstance(data.columns, pd.MultiIndex) else data
            close = df["Close"].dropna()

            if len(close) >= 2:
                price = close.iloc[-1]
                prev = close.iloc[-2]
                change = price - prev
                percent = (change / prev) * 100
            elif len(close) == 1:
                price = close.iloc[-1]
        except:
            pass

        result.append({
            "name": c["name"],
            "symbol": sym,
            "price": clean_number(price),
            "change": clean_number(change),
            "percent": clean_number(percent),
            "sector": c.get("sector", "Unknown")
        })

    return result

@app.get("/indices")
async def get_indices():
    symbols = [i["symbol"] for i in INDICES]

    try:
        data = yf.download(
            symbols,
            period="5d",
            interval="1d",
            group_by="ticker",
            progress=False
        )
    except:
        return []

    results = []

    for i in INDICES:
        sym = i["symbol"]
        price = change = percent = 0.0

        try:
            df = data[sym] if isinstance(data.columns, pd.MultiIndex) else data
            close = df["Close"].dropna()

            if len(close) >= 2:
                price = close.iloc[-1]
                prev = close.iloc[-2]
                change = price - prev
                percent = (change / prev) * 100
            elif len(close) == 1:
                price = close.iloc[-1]
        except:
            pass

        results.append({
            "name": i["name"],
            "price": clean_number(price),
            "change": clean_number(change),
            "percent": clean_number(percent)
        })

    return results

@app.get("/chart_data/{symbol}")
async def chart_data(symbol: str, interval: str = "1d"):
    # Support all intervals like analyze endpoint
    allowed = ["1m", "5m", "15m", "30m", "60m", "1h", "1d", "1wk", "1mo"]
    if interval not in allowed:
        raise HTTPException(status_code=400, detail="Invalid interval")
    
    yf_interval = "60m" if interval == "1h" else interval
    
    # Determine period based on interval
    if interval == "1m":
        period = "7d"
    elif interval in ["5m", "15m", "30m", "60m", "1h"]:
        period = "60d"
    elif interval == "1d":
        period = "1y"
    elif interval == "1wk":
        period = "5y"
    elif interval == "1mo":
        period = "10y"
    else:
        period = "1y"
    
    df = safe_download(symbol, yf_interval, period)
    df = make_features(df)
    closed = is_market_closed(df)

    support, resistance = support_resistance(df)

    data = df.reset_index()
    data["Date"] = data.iloc[:, 0].astype(str)
    data["support"] = support
    data["resistance"] = resistance

    return {"market_closed": closed, "data": data.to_dict(orient="records")}

@app.get("/analyze/{symbol}")
async def analyze(symbol: str, interval: str = "1d"):
    # Support same intervals as chart_data
    allowed = ["1m", "5m", "15m", "30m", "60m", "1h", "1d", "1wk", "1mo"]
    if interval not in allowed:
        raise HTTPException(status_code=400, detail="Invalid interval")

    yf_interval = "60m" if interval == "1h" else interval

    if interval == "1m":
        period = "7d"
    elif interval in ["5m", "15m", "30m", "60m", "1h"]:
        period = "60d"
    elif interval == "1d":
        period = "1y"
    elif interval == "1wk":
        period = "5y"
    elif interval == "1mo":
        period = "10y"
    else:
        period = "1y"

    try:
        df = safe_download(symbol, yf_interval, period)
        df = make_features(df)
        closed = is_market_closed(df)

        support, resistance = support_resistance(df)

        # Baseline model prediction (if available)
        bull = 0.5
        try:
            X = df[features].tail(1)
            if not X.empty:
                probs = model.predict_proba(X)
                bull = float(probs[0][1]) if probs.shape[1] > 1 else 0.0
        except Exception:
            bull = 0.5

        reasons = []

        # Interval weight to scale signal impact (shorter intervals more reactive)
        if interval in ["1m", "5m", "15m", "30m", "60m", "1h"]:
            iw = 1.25
        elif interval == "1d":
            iw = 1.0
        elif interval == "1wk":
            iw = 0.9
        else:  # 1mo
            iw = 0.8

        adjustment = 0.0

        # Always include model baseline and interval context
        try:
            reasons.append(f"Model baseline bullish probability: {bull:.2%} (before adjustments)")
        except Exception:
            reasons.append("Model baseline bullish probability: unknown")
        reasons.append(f"Interval: {interval} (weight {iw}) — shorter intervals react faster to recent changes")

        # Signals (need at least 3 points for proper crossover detection)
        if len(df) >= 3:
            prev2 = df.iloc[-3]  # Two candles ago
            prev = df.iloc[-2]   # One candle ago
            curr = df.iloc[-1]   # Current candle

            # EMA crossover (ONLY on actual crossover, not every bar)
            try:
                prev2Diff = prev2["ema9"] - prev2["ema21"]
                prevDiff = prev["ema9"] - prev["ema21"]
                currDiff = curr["ema9"] - curr["ema21"]
                
                # Only signal on ACTUAL CROSSOVER (sign change between consecutive bars)
                if prevDiff < 0 and currDiff > 0:  # Bullish crossover
                    adjustment += 0.12 * iw  # Stronger signal for actual crossovers
                    currPct = (currDiff / curr["ema21"] * 100) if curr["ema21"] != 0 else 0.0
                    reasons.append(f"Bullish EMA crossover: 9EMA crossed above 21EMA (distance: {currPct:.2f}%) — strong momentum shift signal")
                elif prevDiff > 0 and currDiff < 0:  # Bearish crossover
                    adjustment -= 0.12 * iw  # Stronger signal for actual crossovers
                    currPct = (currDiff / curr["ema21"] * 100) if curr["ema21"] != 0 else 0.0
                    reasons.append(f"Bearish EMA crossover: 9EMA crossed below 21EMA (distance: {currPct:.2f}%) — strong momentum reversal signal")
            except Exception:
                pass

            # RSI signals (ONLY on extreme oversold/overbought, not every small move)
            try:
                rsi = float(curr["rsi"])
                prsi = float(prev["rsi"])
                delta_rsi = rsi - prsi
                
                # Only signal on EXTREME levels or confirmed reversal momentum
                if rsi < 25 and prsi >= 25:  # Crossing INTO oversold
                    adjustment += 0.08 * iw
                    reasons.append(f"RSI confirmed oversold: {rsi:.1f} (<25) — potential reversal setup")
                elif rsi > 75 and prsi <= 75:  # Crossing INTO overbought
                    adjustment -= 0.08 * iw
                    reasons.append(f"RSI confirmed overbought: {rsi:.1f} (>75) — potential pullback setup")
                elif delta_rsi > 8:  # Significant momentum gain
                    adjustment += 0.04 * iw
                    reasons.append(f"RSI strong momentum: {prsi:.1f} → {rsi:.1f} (+{delta_rsi:.1f}) — buying pressure increasing")
                elif delta_rsi < -8:  # Significant momentum loss
                    adjustment -= 0.04 * iw
                    reasons.append(f"RSI weakening momentum: {prsi:.1f} → {rsi:.1f} ({delta_rsi:.1f}) — selling pressure increasing")
            except Exception:
                pass

            # Volume spike (ONLY on significant spikes)
            try:
                vol_ratio = float(curr.get("vol_ratio", 0))
                prev_vol_ratio = float(prev.get("vol_ratio", 0))
                
                # Only signal on SIGNIFICANT volume spikes (>2.5x average)
                if vol_ratio >= 2.5 and prev_vol_ratio < 2.0:  # Spike just occurred
                    price_move_pct = ((curr["Close"] - prev["Close"]) / prev["Close"]) * 100 if prev["Close"] != 0 else 0.0
                    if curr["Close"] > prev["Close"]:
                        adjustment += 0.06 * iw
                        reasons.append(f"Volume breakout UP: vol_ratio={vol_ratio:.2f} with +{price_move_pct:.2f}% move — strong buying confirmation")
                    else:
                        adjustment -= 0.06 * iw
                        reasons.append(f"Volume breakout DOWN: vol_ratio={vol_ratio:.2f} with {price_move_pct:.2f}% move — strong selling confirmation")
            except Exception:
                pass

            # Proximity to support/resistance (include distance)
            try:
                price = float(curr["Close"])
                if support > 0:
                    pct_from_support = abs(price - support) / price * 100
                    if pct_from_support < 1.5:
                        adjustment += 0.04 * iw
                        reasons.append(f"Price near support: {price:.2f} is {pct_from_support:.2f}% away from support at {support:.2f} — potential floor")
                if resistance > 0:
                    pct_from_res = abs(price - resistance) / price * 100
                    if pct_from_res < 1.5:
                        adjustment -= 0.04 * iw
                        reasons.append(f"Price near resistance: {price:.2f} is {pct_from_res:.2f}% away from resistance at {resistance:.2f} — potential ceiling")
            except Exception:
                pass

        # Clamp adjustment to avoid extreme overrides
        if adjustment > 0.3:
            adjustment = 0.3
        if adjustment < -0.3:
            adjustment = -0.3

        # Combine model prob with adjustments
        bull_adj = bull + adjustment
        if bull_adj < 0:
            bull_adj = 0.0
        if bull_adj > 1:
            bull_adj = 1.0

        bear_adj = 1.0 - bull_adj

        trend = "BUY" if bull_adj > 0.6 else "SELL" if bear_adj > 0.6 else "NO TRADE"

        # Final adjustment summary
        try:
            reasons.append(f"Adjusted bullish probability: {bull_adj:.2%} (net change {bull_adj - bull:+.2%})")
        except Exception:
            pass

        # If no meaningful reasons were collected, provide generic reasons based on indicators
        if len(reasons) <= 2:
            # keep model and interval but add a short generic indicator reason
            reasons.append("No strong single indicator; using model baseline and interval context")

        return {
            "symbol": symbol,
            "price": clean_number(df["Close"].iloc[-1]),
            "prob_bull": clean_number(bull_adj),
            "prob_bear": clean_number(bear_adj),
            "trend": trend,
            "market_closed": closed,
            "support": clean_number(support),
            "resistance": clean_number(resistance),
            "reason": reasons
        }

    except HTTPException:
        raise
    except Exception as e:
        return {
            "symbol": symbol,
            "price": 0,
            "prob_bull": 0,
            "prob_bear": 0,
            "trend": "NEUTRAL",
            "market_closed": True,
            "support": 0,
            "resistance": 0,
            "reason": []
        }

@app.get("/company/{symbol}")
async def company(symbol: str):
    for c in COMPANIES:
        if c["symbol"] == symbol:
            return c
    raise HTTPException(status_code=404, detail="Company not found")


class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(req: ChatRequest):
    user_message = req.message.lower()

    # Try to extract stock symbol from message
    matched = None
    for c in COMPANIES:
        if c["symbol"].lower() in user_message or c["name"].lower() in user_message:
            matched = c["symbol"]
            break

    context = ""
    if matched:
        try:
            analysis = await analyze(matched)
            context = f"""
Stock: {matched}
Price: {analysis['price']}
Trend: {analysis['trend']}
Bullish probability: {analysis['prob_bull']}
Support: {analysis['support']}
Resistance: {analysis['resistance']}
Reasons:
{chr(10).join(analysis['reason'])}
"""
        except:
            pass

    prompt = f"""
You are a professional stock market assistant inside a trading app.

User question: {req.message}

{context}

Respond clearly, beginner friendly, concise.
Do not give financial advice disclaimers.
"""

    reply = ask_local_ai(prompt)
    return {"reply": reply}