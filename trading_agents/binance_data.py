import time
import requests
from typing import Optional
from functools import wraps

BINANCE_API = "https://api.binance.com/api/v3"
BINANCE_FAPI = "https://fapi.binance.com"

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "ark-btc-trader/1.0",
}

# Rate limit protection: Binance Spot allows 1200 req/min, Futures 2400 req/min
# We stay conservative to avoid IP bans
_last_request_time = 0
_min_interval = 0.1  # 100ms between requests = max 10 req/sec (well under limit)

def _rate_limit():
    """Enforce minimum interval between API calls."""
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < _min_interval:
        time.sleep(_min_interval - elapsed)
    _last_request_time = time.time()


def _retry_on_rate_limit(max_retries: int = 3, backoff: float = 1.0):
    """
    Decorator: retries on 429 (rate limit) with exponential backoff.
    Binance returns 429 when weight limit exceeded.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    _rate_limit()
                    result = func(*args, **kwargs)
                    return result
                except requests.exceptions.HTTPError as e:
                    if e.response.status_code == 429 and attempt < max_retries - 1:
                        wait = backoff * (2 ** attempt)
                        time.sleep(wait)
                        continue
                    raise
            return None
        return wrapper
    return decorator


@_retry_on_rate_limit(max_retries=3, backoff=1.0)
def get_klines(symbol: str = "BTCUSDT", interval: str = "1h", limit: int = 100, timeout: int = 10) -> list[dict]:
    """
    Obtiene velas (klines) de Binance Spot.
    
    Intervals: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
    
    Returns lista de dicts con: open, high, low, close, volume, close_time
    """
    try:
        r = requests.get(
            f"{BINANCE_API}/klines",
            params={"symbol": symbol, "interval": interval, "limit": limit},
            headers=HEADERS,
            timeout=timeout,
        )
        r.raise_for_status()
        data = r.json()
        
        return [
            {
                "open_time": k[0],
                "open": float(k[1]),
                "high": float(k[2]),
                "low": float(k[3]),
                "close": float(k[4]),
                "volume": float(k[5]),
                "close_time": k[6],
                "quote_volume": float(k[7]),
            }
            for k in data
        ]
    except Exception:
        return []


@_retry_on_rate_limit(max_retries=3, backoff=1.0)
def get_ticker_24h(symbol: str = "BTCUSDT", timeout: int = 10) -> Optional[dict]:
    """Obtiene stats 24h de Binance Spot."""
    try:
        r = requests.get(
            f"{BINANCE_API}/ticker/24hr",
            params={"symbol": symbol},
            headers=HEADERS,
            timeout=timeout,
        )
        r.raise_for_status()
        d = r.json()
        return {
            "last_price": float(d["lastPrice"]),
            "high_24h": float(d["highPrice"]),
            "low_24h": float(d["lowPrice"]),
            "volume_24h": float(d["volume"]),
            "quote_volume_24h": float(d["quoteVolume"]),
            "price_change_pct": float(d["priceChangePercent"]),
            "trades_24h": int(d["count"]),
        }
    except Exception:
        return None
