"""Small demo script to test Upstox connectivity via the adapter.

Usage:
    python upstox_demo.py RELIANCE.NS

This script expects environment variables to be set or a .env file present in
the same directory (see .env.example).
"""
import sys
import os
from dotenv import load_dotenv

load_dotenv()

from upstox_client import is_configured, get_historical, get_quote


def main(symbol="RELIANCE.NS"):
    if not is_configured():
        print("Upstox client is not configured. Set environment variables according to .env.example")
        return

    try:
        print(f"Fetching recent intraday candles for {symbol} using Upstox...")
        df = get_historical(symbol, interval="1m", period="7d")
        print(df.tail())

        print("Fetching quote:")
        q = get_quote(symbol)
        print(q)
    except Exception as e:
        print("Error while calling Upstox client:", e)


if __name__ == "__main__":
    sym = sys.argv[1] if len(sys.argv) > 1 else "RELIANCE.NS"
    main(sym)
