import os
import time
from datetime import datetime, timedelta
import pandas as pd

try:
    # Try to import common Upstox SDK names if present. These imports are optional.
    # If an SDK is installed (for example `upstox` or `upstox_api`), the adapter will try to use it.
    import upstox  # type: ignore
    _SDK = 'upstox'
except Exception:
    try:
        import upstox_api.api as upstox_api  # type: ignore
        _SDK = 'upstox_api'
    except Exception:
        upstox = None
        _SDK = None

import requests
from dotenv import load_dotenv

load_dotenv()

UPSTOX_API_KEY = os.getenv("UPSTOX_API_KEY")
UPSTOX_API_SECRET = os.getenv("UPSTOX_API_SECRET")
UPSTOX_REDIRECT_URI = os.getenv("UPSTOX_REDIRECT_URI")
UPSTOX_ACCESS_TOKEN = os.getenv("UPSTOX_ACCESS_TOKEN")


def is_configured():
    """Return True if environment variables are present indicating Upstox should be used."""
    return bool(UPSTOX_ACCESS_TOKEN and UPSTOX_API_KEY)


def _to_dataframe(candles):
    """Convert a list of candle dicts to a pandas DataFrame with the expected columns.

    Expected output: index = timestamps (UTC), columns = [Open, High, Low, Close, Volume]
    """
    if not candles:
        return pd.DataFrame()

    df = pd.DataFrame(candles)
    # Normalize column names if present
    col_map = {}
    for c in df.columns:
        lc = c.lower()
        if lc in ("open", "o"):
            col_map[c] = "Open"
        elif lc in ("high", "h"):
            col_map[c] = "High"
        elif lc in ("low", "l"):
            col_map[c] = "Low"
        elif lc in ("close", "c"):
            col_map[c] = "Close"
        elif lc in ("volume", "v"):
            col_map[c] = "Volume"
        elif lc in ("timestamp", "date", "datetime"):
            col_map[c] = "timestamp"

    df = df.rename(columns=col_map)

    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.set_index("timestamp")
    else:
        # if no timestamp, create a simple index
        df.index = pd.RangeIndex(len(df))

    # Keep only expected columns
    for c in ["Open", "High", "Low", "Close", "Volume"]:
        if c not in df.columns:
            df[c] = 0

    df = df[["Open", "High", "Low", "Close", "Volume"]]
    return df


def get_historical(symbol: str, interval: str = "1d", period: str = "1y"):
    """Fetch historical OHLCV data for `symbol`.

    This adapter tries to use an installed Upstox SDK if available. If no SDK is
    present it raises a RuntimeError with instructions.

    The function returns a pandas DataFrame compatible with the rest of the app.
    """
    if not is_configured():
        raise RuntimeError("Upstox client is not configured. Set UPSTOX_ACCESS_TOKEN and UPSTOX_API_KEY in environment.")

    # If an SDK is available, try to use it. We try common SDK entrypoints but
    # do not hard-fail the entire application if the SDK isn't installed.
    try:
        if _SDK == 'upstox':
            # Example (SDK-specific calls may differ):
            u = upstox.Upstox(UPSTOX_API_KEY, UPSTOX_API_SECRET)  # type: ignore
            u.set_token(UPSTOX_ACCESS_TOKEN)  # type: ignore
            # The SDK may support get_ohlc or get_ohlcv; adjust if needed.
            candles = u.get_ohlc(symbol, interval, period)  # type: ignore
            return _to_dataframe(candles)
        elif _SDK == 'upstox_api':
            # Another common variant; adjust if the actual SDK differs.
            client = upstox_api.Upstox(UPSTOX_API_KEY, UPSTOX_API_SECRET)  # type: ignore
            client.set_access_token(UPSTOX_ACCESS_TOKEN)  # type: ignore
            candles = client.get_historical(symbol, interval, period)  # type: ignore
            return _to_dataframe(candles)
    except Exception as e:
        # SDK call failed; surface a helpful message so the caller can fallback.
        raise RuntimeError(f"Upstox SDK call failed: {e}")

    # If no SDK is installed, provide a clear error with guidance.
    raise RuntimeError(
        "No Upstox SDK detected. Install an Upstox Python SDK or provide UPSTOX_ACCESS_TOKEN and implement API calls. "
        "See .env.example in the repo for variable names."
    )


def get_quote(symbol: str):
    """Fetch a lightweight quote (last price) for a symbol.

    Returns a dict: {"last_price": float, "timestamp": datetime}
    """
    if not is_configured():
        raise RuntimeError("Upstox client is not configured.")

    # Prefer SDK if available
    try:
        if _SDK == 'upstox':
            u = upstox.Upstox(UPSTOX_API_KEY, UPSTOX_API_SECRET)  # type: ignore
            u.set_token(UPSTOX_ACCESS_TOKEN)  # type: ignore
            q = u.get_ltp(symbol)  # type: ignore
            return {"last_price": q.get("last_price", 0), "timestamp": datetime.utcnow()}
        elif _SDK == 'upstox_api':
            client = upstox_api.Upstox(UPSTOX_API_KEY, UPSTOX_API_SECRET)  # type: ignore
            client.set_access_token(UPSTOX_ACCESS_TOKEN)  # type: ignore
            q = client.get_quote(symbol)  # type: ignore
            return {"last_price": q.get("ltp", 0), "timestamp": datetime.utcnow()}
    except Exception as e:
        raise RuntimeError(f"Upstox quote call failed: {e}")

    raise RuntimeError("No Upstox SDK detected to fetch quote.")
