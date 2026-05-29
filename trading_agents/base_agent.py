from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class AgentSignal:
    signal: str  # "BUY" | "SELL" | "HOLD"
    confidence: float  # 0.0 a 1.0
    reason: str
    metadata: Optional[dict] = None


class BaseAgent(ABC):
    """Contrato común para todos los agentes de trading."""

    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def analyze(self, market_data: dict) -> AgentSignal:
        pass
