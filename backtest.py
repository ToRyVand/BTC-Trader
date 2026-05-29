#!/usr/bin/env python3
"""
Backtest del sistema multi-agente usando datos históricos de CoinGecko.
No requiere credenciales de LND, Boltz o Claude API.
"""
import sys
import os
import json
import time
import requests
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from trading_agents.orchestrator import Orchestrator
from trading_agents.technical_agent import TechnicalAgent
from trading_agents.quant_agent import QuantAgent
from trading_agents.fundamental_agent import FundamentalAgent
from trading_agents.sentiment_agent import SentimentAgent
from trading_agents.risk_agent import RiskAgent


def fetch_historical_prices(days: int = 7) -> list:
    """Obtiene precios históricos de BTC en USD (diarios)."""
    url = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart"
    params = {"vs_currency": "usd", "days": str(days), "interval": "daily"}
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        prices = r.json().get("prices", [])
        # prices is list of [timestamp_ms, price]
        return [(datetime.fromtimestamp(p[0]/1000).date(), p[1]) for p in prices]
    except Exception as e:
        print(f"Error fetching prices: {e}")
        return []


def run_backtest(days: int = 7):
    print(f"\n{'='*60}")
    print(f"BACKTEST — Últimos {days} días")
    print(f"{'='*60}")

    prices = fetch_historical_prices(days)
    if not prices:
        print("No se pudieron obtener precios históricos.")
        return

    print(f"Precios obtenidos: {len(prices)} días")
    print(f"Rango: {prices[0][0]} → {prices[-1][0]}")
    print(f"Precio inicial: ${prices[0][1]:,.2f}")
    print(f"Precio final: ${prices[-1][1]:,.2f}")

    # Inicializar orquestador
    orch = Orchestrator()
    orch.register_agent(TechnicalAgent(), weight=1.0)
    orch.register_agent(QuantAgent(), weight=1.0)
    orch.register_agent(FundamentalAgent(), weight=0.8)
    orch.register_agent(SentimentAgent(), weight=0.6)
    orch.register_agent(RiskAgent(), weight=1.5)

    results = []
    portfolio_value = 100000  # USD inicial
    btc_amount = portfolio_value / prices[0][1]

    for i in range(1, len(prices)):
        date, price_now = prices[i]
        _, price_prev_day = prices[i-1]

        # Simular price_1h_ago (usar precio 24h atrás si hay)
        price_1h_ago = prices[i-1][1] if i >= 1 else price_now
        price_24h_ago = prices[max(0, i-1)][1]  # simplificado

        market_data = {
            "btc_price_usd": price_now,
            "price_1h_ago": price_1h_ago,
            "price_24h_ago": price_24h_ago,
            "daily_pnl_pct": 0.0,  # simplificado para backtest
            "ln_balance_sats": 50000,
            "trade_amount_sats": 50000,
        }

        orch_result = orch.decide(market_data)
        action = orch_result["action"]
        confidence = orch_result["confidence"]

        # Simular ejecución simple
        if action == "BUY" and confidence >= 7:
            # Comprar BTC (simplificado)
            pass
        elif action == "SELL" and confidence >= 7:
            # Vender BTC
            pass

        results.append({
            "date": str(date),
            "price": price_now,
            "action": action,
            "confidence": confidence,
        })

        print(f"{date} | BTC ${price_now:,.2f} | {action:4s} ({confidence:.1f}/10)")

    # Resumen
    print(f"\n{'='*60}")
    print("RESUMEN BACKTEST")
    print(f"{'='*60}")
    actions = {"BUY": 0, "SELL": 0, "HOLD": 0}
    for r in results:
        actions[r["action"]] += 1

    for action, count in actions.items():
        print(f"{action}: {count} señales")

    print(f"\nTotal de días analizados: {len(results)}")
    print(f"Precio inicial: ${prices[0][1]:,.2f}")
    print(f"Precio final: ${prices[-1][1]:,.2f}")
    change_pct = ((prices[-1][1] - prices[0][1]) / prices[0][1]) * 100
    print(f"Variación: {change_pct:+.2f}%")


if __name__ == "__main__":
    days = 7
    if len(sys.argv) > 1:
        try:
            days = int(sys.argv[1])
        except ValueError:
            pass
    run_backtest(days)
