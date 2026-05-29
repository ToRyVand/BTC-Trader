from .base_agent import BaseAgent, AgentSignal


class RiskAgent(BaseAgent):
    def name(self) -> str:
        return "trader-risk"

    def analyze(self, market_data: dict) -> AgentSignal:
        balance = market_data.get("ln_balance_sats", 0)
        min_balance = 10000

        if balance < min_balance:
            return AgentSignal("HOLD", 1.0, f"Balance insuficiente: {balance} sats")

        daily_pnl = market_data.get("daily_pnl_pct", 0)
        if daily_pnl <= -5:
            return AgentSignal("HOLD", 1.0, f"Kill-switch activado: {daily_pnl:.2f}%")

        return AgentSignal("HOLD", 0.3, "Riesgo dentro de límites")
