import requests
from .base_agent import BaseAgent, AgentSignal
from .btc_futures_sentiment import analyze_btc_futures_sentiment


class SentimentAgent(BaseAgent):
    def name(self) -> str:
        return "trader-sentiment"

    def get_fear_greed_index(self) -> dict:
        """Obtiene el Fear & Greed Index de fuente pública."""
        try:
            r = requests.get("https://api.alternative.me/fng/", timeout=5)
            r.raise_for_status()
            data = r.json().get("data", [{}])[0]
            return {
                "value": int(data.get("value", 50)),
                "classification": data.get("value_classification", "Neutral")
            }
        except Exception:
            return {"value": 50, "classification": "Neutral"}

    def analyze(self, market_data: dict) -> AgentSignal:
        fng = self.get_fear_greed_index()
        value = fng["value"]
        classification = fng["classification"]

        # Skill: BTC Futures sentiment (Binance) — real sentimiento BTC
        btc_sent = analyze_btc_futures_sentiment()
        btc_score = btc_sent["score"]
        btc_sentiment = btc_sent["sentiment"]

        # Score compuesto
        score = 0.0
        reasons = []

        # Fear & Greed contribution (30%)
        # Score: -0.3 (extreme fear) to +0.3 (extreme greed)
        if value <= 25:
            score += 0.3  # Fear = buy opportunity
            reasons.append(f"Fear extreme ({value}) — oportunidad")
        elif value <= 45:
            score += 0.15
            reasons.append(f"Fear ({value})")
        elif value >= 75:
            score -= 0.3  # Greed = overbought risk
            reasons.append(f"Greed extreme ({value}) — sobrecomprado")
        elif value >= 55:
            score -= 0.15
            reasons.append(f"Greed ({value})")
        else:
            reasons.append(f"Neutral F&G ({value})")

        # BTC Futures sentiment contribution (70%)
        # Score: -1.0 to +1.0 mapped to -0.7 to +0.7
        score += btc_score * 0.7
        reasons.append(btc_sent["reason"])

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
