"""
Indicadores técnicos para análisis de precio.
Calculados a partir de datos de klines (velas).
"""
from typing import Optional


def calc_rsi(closes: list[float], period: int = 14) -> Optional[float]:
    """
    RSI (Relative Strength Index).
    > 70 = sobrecomprado, < 30 = sobrevendido.
    """
    if len(closes) < period + 1:
        return None
    
    deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
    gains = [d if d > 0 else 0 for d in deltas]
    losses = [-d if d < 0 else 0 for d in deltas]
    
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
    
    if avg_loss == 0:
        return 100.0
    
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


def calc_macd(closes: list[float], fast: int = 12, slow: int = 26, signal: int = 9) -> Optional[dict]:
    """
    MACD (Moving Average Convergence Divergence).
    
    Returns:
      macd_line: MACD
      signal_line: señal EMA
      histogram: macd - signal (positivo = bullish)
    """
    if len(closes) < slow + signal:
        return None
    
    def ema(data: list[float], period: int) -> list[float]:
        multiplier = 2.0 / (period + 1)
        result = [sum(data[:period]) / period]
        for price in data[period:]:
            result.append((price - result[-1]) * multiplier + result[-1])
        return result
    
    ema_fast = ema(closes, fast)
    ema_slow = ema(closes, slow)
    
    offset = slow - fast
    macd_line = [ema_fast[i + offset] - ema_slow[i] for i in range(len(ema_slow))]
    signal_line = ema(macd_line, signal)
    
    offset2 = len(macd_line) - len(signal_line)
    histogram = [macd_line[offset2 + i] - signal_line[i] for i in range(len(signal_line))]
    
    return {
        "macd": macd_line[-1],
        "signal": signal_line[-1],
        "histogram": histogram[-1] if histogram else 0,
    }


def calc_ema(closes: list[float], period: int) -> Optional[float]:
    """Exponential Moving Average."""
    if len(closes) < period:
        return None
    
    multiplier = 2.0 / (period + 1)
    ema = sum(closes[:period]) / period
    for price in closes[period:]:
        ema = (price - ema) * multiplier + ema
    
    return ema


def calc_bollinger_bands(closes: list[float], period: int = 20, std_dev: float = 2.0) -> Optional[dict]:
    """
    Bollinger Bands.
    
    Returns:
      upper, middle, lower
      pct_b: posición del precio dentro de las bandas (0=lower, 1=upper, >1=breakout)
    """
    if len(closes) < period:
        return None
    
    recent = closes[-period:]
    middle = sum(recent) / period
    variance = sum((x - middle) ** 2 for x in recent) / period
    std = variance ** 0.5
    
    upper = middle + std_dev * std
    lower = middle - std_dev * std
    
    current = closes[-1]
    pct_b = (current - lower) / (upper - lower) if upper != lower else 0.5
    
    return {
        "upper": upper,
        "middle": middle,
        "lower": lower,
        "pct_b": pct_b,
        "width": (upper - lower) / middle * 100 if middle > 0 else 0,
    }


def calc_atr(highs: list[float], lows: list[float], closes: list[float], period: int = 14) -> Optional[float]:
    """
    Average True Range — mide volatilidad.
    """
    if len(closes) < period + 1:
        return None
    
    true_ranges = []
    for i in range(1, len(closes)):
        tr = max(
            highs[i] - lows[i],
            abs(highs[i] - closes[i-1]),
            abs(lows[i] - closes[i-1]),
        )
        true_ranges.append(tr)
    
    return sum(true_ranges[-period:]) / period
