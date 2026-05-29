from .base_agent import BaseAgent, AgentSignal


class FundamentalAgent(BaseAgent):
    def name(self) -> str:
        return "trader-fundamental"

    def analyze(self, market_data: dict) -> AgentSignal:
        daily_pnl = market_data.get("daily_pnl_pct", 0)

        if daily_pnl < -3:
            return AgentSignal("HOLD", 0.8, f"Pérdida diaria alta: {daily_pnl:.2f}%")
        elif daily_pnl > 3:
            return AgentSignal("SELL", 0.6, f"Tomar ganancia: {daily_pnl:.2f}%")
        return AgentSignal("HOLD", 0.5, f"PnL diario estable: {daily_pnl:.2f}%")
