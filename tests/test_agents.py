import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from trading_agents.technical_agent import TechnicalAgent
from trading_agents.quant_agent import QuantAgent
from trading_agents.fundamental_agent import FundamentalAgent
from trading_agents.sentiment_agent import SentimentAgent
from trading_agents.risk_agent import RiskAgent
from trading_agents.orchestrator import Orchestrator


def test_technical_agent_buy():
    agent = TechnicalAgent()
    market_data = {"btc_price_usd": 50000, "price_1h_ago": 49000, "price_24h_ago": 48000}
    signal = agent.analyze(market_data)
    assert signal.signal == "BUY"
    assert signal.confidence > 0
    print("✅ TechnicalAgent BUY test passed")


def test_technical_agent_sell():
    agent = TechnicalAgent()
    market_data = {"btc_price_usd": 49000, "price_1h_ago": 50000, "price_24h_ago": 51000}
    signal = agent.analyze(market_data)
    assert signal.signal == "SELL"
    print("✅ TechnicalAgent SELL test passed")


def test_quant_agent():
    agent = QuantAgent()
    market_data = {"btc_price_usd": 52000, "price_1h_ago": 50000, "price_24h_ago": 49000}
    signal = agent.analyze(market_data)
    assert signal.signal in ["BUY", "SELL", "HOLD"]
    print("✅ QuantAgent test passed")


def test_fundamental_agent():
    agent = FundamentalAgent()
    market_data = {"daily_pnl_pct": -4.0}
    signal = agent.analyze(market_data)
    assert signal.signal == "HOLD"
    assert signal.confidence == 0.8
    print("✅ FundamentalAgent test passed")


def test_risk_agent_balance():
    agent = RiskAgent()
    market_data = {"ln_balance_sats": 5000, "daily_pnl_pct": 0}
    signal = agent.analyze(market_data)
    assert signal.signal == "HOLD"
    assert signal.confidence == 1.0
    print("✅ RiskAgent balance test passed")


def test_risk_agent_killswitch():
    agent = RiskAgent()
    market_data = {"ln_balance_sats": 50000, "daily_pnl_pct": -6.0}
    signal = agent.analyze(market_data)
    assert signal.signal == "HOLD"
    assert signal.confidence == 1.0
    print("✅ RiskAgent killswitch test passed")


def test_orchestrator():
    orch = Orchestrator()
    orch.register_agent(TechnicalAgent(), weight=1.0)
    orch.register_agent(RiskAgent(), weight=1.5)
    
    market_data = {
        "btc_price_usd": 50000,
        "price_1h_ago": 49000,
        "price_24h_ago": 48000,
        "daily_pnl_pct": 0,
        "ln_balance_sats": 50000,
        "trade_amount_sats": 50000,
    }
    
    result = orch.decide(market_data)
    assert "action" in result
    assert "confidence" in result
    assert "signals" in result
    print(f"✅ Orchestrator test passed — Action: {result['action']}, Confidence: {result['confidence']}")


if __name__ == "__main__":
    print("Running agent tests...\n")
    test_technical_agent_buy()
    test_technical_agent_sell()
    test_quant_agent()
    test_fundamental_agent()
    test_risk_agent_balance()
    test_risk_agent_killswitch()
    test_orchestrator()
    print("\n✅ All tests passed!")
