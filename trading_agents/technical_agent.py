from .base_agent import BaseAgent, AgentSignal
from .binance_data import get_klines, get_ticker_24h
from .technical_indicators import calc_rsi, calc_macd, calc_ema, calc_bollinger_bands


class TechnicalAgent(BaseAgent):
    def name(self) -> str:
        return "trader-technical"

    def analyze(self, market_data: dict) -> AgentSignal:
        price_now = market_data.get("btc_price_usd", 0)
        price_1h = market_data.get("price_1h_ago", 0)

        # Fetch real klines from Binance
        klines_1h = get_klines(symbol="BTCUSDT", interval="1h", limit=50)
        klines_4h = get_klines(symbol="BTCUSDT", interval="4h", limit=100)

        if not klines_1h or not klines_4h:
            # Fallback to simple 1h change
            if price_1h == 0:
                return AgentSignal("HOLD", 0.5, "Sin datos históricos")
            change_1h = (price_now - price_1h) / price_1h
            if change_1h > 0.01:
                return AgentSignal("BUY", 0.7, f"Subida 1h: {change_1h*100:.2f}%")
            elif change_1h < -0.01:
                return AgentSignal("SELL", 0.7, f"Bajada 1h: {change_1h*100:.2f}%")
            return AgentSignal("HOLD", 0.5, f"Sin tendencia clara: {change_1h*100:.2f}%")

        closes_1h = [k["close"] for k in klines_1h]
        closes_4h = [k["close"] for k in klines_4h]
        highs_1h = [k["high"] for k in klines_1h]
        lows_1h = [k["low"] for k in klines_1h]

        score = 0.0
        reasons = []

        # 1. RSI 14 (1H) — weight 25%
        rsi = calc_rsi(closes_1h, 14)
        if rsi is not None:
            if rsi < 30:
                score += 0.25
                reasons.append(f"RSI {rsi:.0f} sobrevendido → oportunidad")
            elif rsi > 70:
                score -= 0.25
                reasons.append(f"RSI {rsi:.0f} sobrecomprado → riesgo")
            elif rsi < 45:
                score += 0.1
                reasons.append(f"RSI {rsi:.0f} zona baja")
            elif rsi > 55:
                score -= 0.1
                reasons.append(f"RSI {rsi:.0f} zona alta")
            else:
                reasons.append(f"RSI {rsi:.0f} neutral")

        # 2. MACD (1H) — weight 25%
        macd = calc_macd(closes_1h)
        if macd:
            if macd["histogram"] > 0:
                score += 0.25
                reasons.append(f"MACD hist +{macd['histogram']:.0f} bullish")
            else:
                score -= 0.25
                reasons.append(f"MACD hist {macd['histogram']:.0f} bearish")

        # 3. EMA 50 vs 200 (4H) — weight 20%
        ema_50 = calc_ema(closes_4h, 50)
        ema_200 = calc_ema(closes_4h, 200)
        if ema_50 and ema_200:
            if ema_50 > ema_200:
                score += 0.20
                reasons.append(f"Golden Cross EMA50>EMA200")
            else:
                score -= 0.20
                reasons.append(f"Death Cross EMA50<EMA200")
        elif ema_50:
            # Fallback: compare current price to EMA50
            if price_now > ema_50:
                score += 0.10
                reasons.append(f"Price > EMA50 (${ema_50:,.0f})")
            else:
                score -= 0.10
                reasons.append(f"Price < EMA50 (${ema_50:,.0f})")

        # 4. Bollinger Bands (1H) — weight 15%
        bb = calc_bollinger_bands(closes_1h, 20, 2.0)
        if bb:
            pct = bb["pct_b"]
            if pct < 0:
                score += 0.15
                reasons.append(f"BB breakout lower ({pct:.2f}) → oversold")
            elif pct > 1:
                score -= 0.15
                reasons.append(f"BB breakout upper ({pct:.2f}) → overbought")
            elif pct < 0.2:
                score += 0.10
                reasons.append(f"BB near lower ({pct:.2f})")
            elif pct > 0.8:
                score -= 0.10
                reasons.append(f"BB near upper ({pct:.2f})")
            else:
                reasons.append(f"BB mid ({pct:.2f})")

        # 5. Simple 1h change — weight 15%
        if price_1h > 0:
            change_1h = (price_now - price_1h) / price_1h
            if change_1h > 0.01:
                score += 0.15
                reasons.append(f"1h +{change_1h*100:.2f}%")
            elif change_1h < -0.01:
                score -= 0.15
                reasons.append(f"1h {change_1h*100:.2f}%")
            else:
                reasons.append(f"1h flat ({change_1h*100:.2f}%)")

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
