import time
import requests
from typing import Optional

BINANCE_FAPI = "https://fapi.binance.com"

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "ark-btc-trader/1.0",
}

# Rate limit protection for Binance Futures (2400 req/min)
_last_request_time = 0
_min_interval = 0.1  # 100ms between requests

def _rate_limit():
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < _min_interval:
        time.sleep(_min_interval - elapsed)
    _last_request_time = time.time()


def get_funding_rate(symbol: str = "BTCUSDT", timeout: int = 10) -> Optional[dict]:
    """
    Obtiene funding rate actual de BTCUSDT.
    
    Funding rate > 0 → longs pagan shorts → sentimiento bullish
    Funding rate < 0 → shorts pagan longs → sentimiento bearish
    """
    try:
        _rate_limit()
        r = requests.get(
            f"{BINANCE_FAPI}/fapi/v1/premiumIndex",
            params={"symbol": symbol},
            headers=HEADERS,
            timeout=timeout,
        )
        r.raise_for_status()
        data = r.json()
        
        rate = float(data.get("lastFundingRate", 0))
        mark = float(data.get("markPrice", 0))
        index = float(data.get("indexPrice", 0))
        
        return {
            "funding_rate": rate,
            "mark_price": mark,
            "index_price": index,
            "sentiment": "bullish" if rate > 0 else "bearish",
        }
    except Exception:
        return None


def get_long_short_ratio(
    symbol: str = "BTCUSDT",
    period: str = "5m",
    limit: int = 10,
    timeout: int = 10,
) -> Optional[dict]:
    """
    Obtiene ratio Long/Short de cuentas globales.
    
    ratio > 1 → más longs → bullish
    ratio < 1 → más shorts → bearish
    
    Retorna promedios recientes y la última lectura.
    """
    try:
        _rate_limit()
        r = requests.get(
            f"{BINANCE_FAPI}/futures/data/globalLongShortAccountRatio",
            params={"symbol": symbol, "period": period, "limit": limit},
            headers=HEADERS,
            timeout=timeout,
        )
        r.raise_for_status()
        data = r.json()
        
        if not data:
            return None
        
        ratios = [float(d["longShortRatio"]) for d in data]
        longs = [float(d["longAccount"]) for d in data]
        shorts = [float(d["shortAccount"]) for d in data]
        
        return {
            "latest_ratio": ratios[-1],
            "avg_ratio": sum(ratios) / len(ratios),
            "trend": "bullish" if ratios[-1] > ratios[-2] else "bearish" if len(ratios) > 1 else "neutral",
            "long_pct": longs[-1],
            "short_pct": shorts[-1],
            "sentiment": "bullish" if ratios[-1] > 1.0 else "bearish",
        }
    except Exception:
        return None


def get_top_trader_ratio(
    symbol: str = "BTCUSDT",
    period: str = "5m",
    limit: int = 10,
    timeout: int = 10,
) -> Optional[dict]:
    """
    Obtiene ratio Long/Short de top traders (smart money de futures).
    
    Top traders son cuentas con mayor volumen — más confiable.
    """
    try:
        _rate_limit()
        r = requests.get(
            f"{BINANCE_FAPI}/futures/data/topLongShortAccountRatio",
            params={"symbol": symbol, "period": period, "limit": limit},
            headers=HEADERS,
            timeout=timeout,
        )
        r.raise_for_status()
        data = r.json()
        
        if not data:
            return None
        
        ratios = [float(d["longShortRatio"]) for d in data]
        longs = [float(d["longAccount"]) for d in data]
        shorts = [float(d["shortAccount"]) for d in data]
        
        return {
            "latest_ratio": ratios[-1],
            "avg_ratio": sum(ratios) / len(ratios),
            "trend": "bullish" if ratios[-1] > ratios[-2] else "bearish" if len(ratios) > 1 else "neutral",
            "long_pct": longs[-1],
            "short_pct": shorts[-1],
            "sentiment": "bullish" if ratios[-1] > 1.0 else "bearish",
        }
    except Exception:
        return None


def get_taker_volume(
    symbol: str = "BTCUSDT",
    period: str = "5m",
    limit: int = 10,
    timeout: int = 10,
) -> Optional[dict]:
    """
    Obtiene volumen taker buy vs sell.
    
    ratio > 1 → más buying pressure → bullish
    ratio < 1 → más selling pressure → bearish
    """
    try:
        _rate_limit()
        r = requests.get(
            f"{BINANCE_FAPI}/futures/data/takerlongshortratio",
            params={"symbol": symbol, "period": period, "limit": limit},
            headers=HEADERS,
            timeout=timeout,
        )
        r.raise_for_status()
        data = r.json()
        
        if not data:
            return None
        
        ratios = [float(d["buySellRatio"]) for d in data]
        
        return {
            "latest_ratio": ratios[-1],
            "avg_ratio": sum(ratios) / len(ratios),
            "trend": "bullish" if ratios[-1] > ratios[-2] else "bearish" if len(ratios) > 1 else "neutral",
            "sentiment": "bullish" if ratios[-1] > 1.0 else "bearish",
        }
    except Exception:
        return None


def analyze_btc_futures_sentiment() -> dict:
    """
    Análisis completo de sentimiento BTC usando Binance Futures.
    
    Combina 4 métricas ponderadas:
    - Funding Rate (20%)
    - Global L/S Ratio (25%)
    - Top Trader L/S Ratio (35%) — mayor peso = más confiable
    - Taker Volume (20%)
    
    Returns:
      sentiment: "bullish" / "bearish" / "neutral"
      score: -1.0 to +1.0 (negative=bearish, positive=bullish)
      sources: dict con todas las métricas
      reason: resumen legible
    """
    funding = get_funding_rate()
    ls_ratio = get_long_short_ratio()
    top_trader = get_top_trader_ratio()
    taker_vol = get_taker_volume()
    
    score = 0.0
    reasons = []
    
    # 1. Funding Rate (20%)
    if funding:
        fr = funding["funding_rate"]
        # Normal: 0.0001 = 0.01% por 8h. >0.0005 = alto bullishness
        fr_score = min(1.0, max(-1.0, fr / 0.0005))
        score += fr_score * 0.20
        pct = fr * 100
        reasons.append(f"Funding: {pct:+.4f}% ({funding['sentiment']})")
    
    # 2. Global L/S Ratio (25%)
    if ls_ratio:
        ratio = ls_ratio["latest_ratio"]
        # Ratio 1.0 = neutral. 0.5 = bearish, 2.0 = bullish
        ls_score = min(1.0, max(-1.0, (ratio - 1.0) / 0.5))
        score += ls_score * 0.25
        reasons.append(f"Global L/S: {ratio:.2f} ({ls_ratio['long_pct']*100:.0f}%L/{ls_ratio['short_pct']*100:.0f}%S)")
    
    # 3. Top Trader L/S Ratio (35%) — mayor peso = smart money
    if top_trader:
        ratio = top_trader["latest_ratio"]
        tt_score = min(1.0, max(-1.0, (ratio - 1.0) / 0.5))
        score += tt_score * 0.35
        reasons.append(f"Top Trader L/S: {ratio:.2f} ({top_trader['long_pct']*100:.0f}%L/{top_trader['short_pct']*100:.0f}%S)")
    
    # 4. Taker Volume (20%)
    if taker_vol:
        ratio = taker_vol["latest_ratio"]
        tv_score = min(1.0, max(-1.0, (ratio - 1.0) / 0.5))
        score += tv_score * 0.20
        reasons.append(f"Taker Vol: {ratio:.2f} ({taker_vol['sentiment']})")
    
    # Determinar sentimiento
    if score >= 0.3:
        sentiment = "bullish"
    elif score <= -0.3:
        sentiment = "bearish"
    else:
        sentiment = "neutral"
    
    return {
        "sentiment": sentiment,
        "score": round(score, 4),
        "sources": {
            "funding": funding,
            "long_short_ratio": ls_ratio,
            "top_trader_ratio": top_trader,
            "taker_volume": taker_vol,
        },
        "reason": "; ".join(reasons) if reasons else "Sin datos de Binance Futures",
    }
