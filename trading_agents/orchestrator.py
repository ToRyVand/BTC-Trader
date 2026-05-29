from typing import List, Dict
from .base_agent import BaseAgent, AgentSignal


class Orchestrator:
    def __init__(self):
        self.agents: List[BaseAgent] = []
        self.weights: Dict[str, float] = {}

    def register_agent(self, agent: BaseAgent, weight: float = 1.0):
        self.agents.append(agent)
        self.weights[agent.name()] = weight

    def decide(self, market_data: dict) -> Dict:
        signals = []
        for agent in self.agents:
            signal = agent.analyze(market_data)
            signals.append((agent.name(), signal))

        buy  = sum(self.weights[n] * s.confidence for n, s in signals if s.signal == "BUY")
        sell = sum(self.weights[n] * s.confidence for n, s in signals if s.signal == "SELL")
        hold = sum(self.weights[n] * s.confidence for n, s in signals if s.signal == "HOLD")

        total = buy + sell + hold
        if total == 0:
            return {"action": "HOLD", "confidence": 0, "reason": "No signals", "signals": signals}

        if buy >= sell and buy >= hold:
            action = "BUY"
            confidence = buy / total
        elif sell >= buy and sell >= hold:
            action = "SELL"
            confidence = sell / total
        else:
            action = "HOLD"
            confidence = hold / total

        return {"action": action, "confidence": round(confidence * 10, 1), "signals": signals}
