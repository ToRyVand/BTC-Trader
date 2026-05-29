import math
from .base_agent import BaseAgent, AgentSignal
from .binance_data import get_klines, get_ticker_24h
from .technical_indicators import calc_atr, calc_bollinger_bands


class QuantAgent(BaseAgent):
    def name(self) -> str:
        return "trader-quant"

    def analyze(self, market_data: dict) -> AgentSignal:
        price_now = market_data.get("btc_price_usd", 0)
        price_24h = market_data.get("price_24h_ago", 0)

        # Fetch real klines from Binance
        klines_1h = get_klines(symbol="BTCUSDT", interval="1h", limit=100)
        ticker = get_ticker_24h("BTCUSDT")

        if not klines_1h:
            # Fallback to simple 24h change
            if price_24h == 0:
                return AgentSignal("HOLD", 0.5, "Sin datos 24h")
            change_24h = (price_now - price_24h) / price_24h
            if change_24h > 0.03:
                return AgentSignal("BUY", 0.6, f"Tendencia 24h alcista: {change_24h*100:.2f}%")
            elif change_24h < -0.03:
                return AgentSignal("SELL", 0.6, f"Tendencia 24h bajista: {change_24h*100:.2f}%")
            return AgentSignal("HOLD", 0.5, f"Volatilidad 24h: {change_24h*100:.2f}%")

        closes = [k["close"] for k in klines_1h]
        highs = [k["high"] for k in klines_1h]
        lows = [k["low"] for k in klines_1h]
        volumes = [k["volume"] for k in klines_1h]

        score = 0.0
        reasons = []

        # 1. ATR (volatilidad) — weight 25%
        atr = calc_atr(highs, lows, closes, 14)
        if atr and price_now > 0:
            atr_pct = (atr / price_now) * 100
            # ATR > 2% = alta volatilidad →谨慎, < 0.5% = muy baja → rango
            if atr_pct > 2.0:
                score -= 0.15
                reasons.append(f"ATR alto {atr_pct:.2f}% → volatilidad excesiva")
            elif atr_pct < 0.5:
                reasons.append(f"ATR bajo {atr_pct:.2f}% → mercado en rango")
            else:
                score += 0.10
                reasons.append(f"ATR normal {atr_pct:.2f}%")

        # 2. Volume trend — weight 20%
        if len(volumes) >= 20:
            recent_vol = sum(volumes[-5:]) / 5
            old_vol = sum(volumes[-20:-5]) / 15
            vol_ratio = recent_vol / old_vol if old_vol > 0 else 1.0
            
            if vol_ratio > 1.5:
                score += 0.15
                reasons.append(f"Volumen +{((vol_ratio-1)*100):.0f}% → momentum creciente")
            elif vol_ratio < 0.7:
                score -= 0.10
                reasons.append(f"Volumen -{((1-vol_ratio)*100):.0f}% → debilitamiento")
            else:
                reasons.append(f"Volumen estable (ratio {vol_ratio:.2f})")

        # 3. Price vs Bollinger Bands — weight 25%
        bb = calc_bollinger_bands(closes, 20, 2.0)
        if bb:
            pct_b = bb["pct_b"]
            width = bb["width"]
            
            # Squeeze = bands narrow → impending breakout
            if width < 3.0:
                reasons.append(f"BB squeeze ({width:.1f}%) → breakout inminente")
            
            if pct_b < 0:
                score += 0.25
                reasons.append(f"Price below BB lower → mean reversion buy")
            elif pct_b > 1:
                score -= 0.25
                reasons.append(f"Price above BB upper → mean reversion sell")
            elif pct_b < 0.3:
                score += 0.15
                reasons.append(f"Price near BB lower ({pct_b:.2f})")
            elif pct_b > 0.7:
                score -= 0.15
                reasons.append(f"Price near BB upper ({pct_b:.2f})")
            else:
                reasons.append(f"Price BB mid ({pct_b:.2f})")

        # 4. Returns distribution (skewness) — weight 20%
        if len(closes) >= 30:
            returns = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(1, len(closes))]
            mean_r = sum(returns) / len(returns)
            std_r = (sum((r - mean_r) ** 2 for r in returns) / len(returns)) ** 0.5
            
            if std_r > 0:
                skewness = sum(((r - mean_r) / std_r) ** 3 for r in returns) / len(returns)
                
                if skewness > 0.5:
                    score += 0.15
                    reasons.append(f"Skew +{skewness:.2f} → cola derecha (bullish)")
                elif skewness < -0.5:
                    score -= 0.15
                    reasons.append(f"Skew {skewness:.2f} → cola izquierda (bearish)")
                else:
                    reasons.append(f"Skew neutral ({skewness:.2f})")

        # 5. 24h change confirmation — weight 10%
        if ticker:
            pct_24h = ticker["price_change_pct"] / 100
            if pct_24h > 0.03:
                score += 0.10
                reasons.append(f"24h +{pct_24h*100:.1f}%")
            elif pct_24h < -0.03:
                score -= 0.10
                reasons.append(f"24h {pct_24h*100:.1f}%")

        # Map score to signal
        if score >= 0.4:
            signal = "BUY"
            confidence = min(0.95, 0.5 + abs(score))
        elif score <= -0.4:
            signal = "SELL"
            confidence = min(0.95, 0.5 + abs(score))
        else:
            signal = "HOLD"
            confidence = 0.5 + abs(score) * 0.5

        return AgentSignal(signal, round(confidence, 2), "; ".join(reasons))
