#!/usr/bin/env python3
import os
import sys
import json
import time
import argparse
import requests
import logging
from datetime import datetime, date, timezone
from dotenv import load_dotenv

import wallet as lnd
import boltz
import polygon
import claude_brain
from trading_agents.orchestrator import Orchestrator
from trading_agents.technical_agent import TechnicalAgent
from trading_agents.quant_agent import QuantAgent
from trading_agents.fundamental_agent import FundamentalAgent
from trading_agents.sentiment_agent import SentimentAgent
from trading_agents.risk_agent import RiskAgent

load_dotenv()

logger = logging.getLogger("ark_trader")


def _mask_address(addr: str, show: int = 6) -> str:
    """Mask sensitive address for logging (e.g. 0x7195...9c4a)."""
    if not addr or len(addr) <= show * 2:
        return addr
    return addr[:show] + "..." + addr[-show:]


# ── Multi-Agent Orchestrator ──────────────────────────────────────────────────

def init_orchestrator() -> Orchestrator:
    orch = Orchestrator()
    orch.register_agent(TechnicalAgent(), weight=1.0)
    orch.register_agent(QuantAgent(), weight=1.0)
    orch.register_agent(FundamentalAgent(), weight=0.8)
    orch.register_agent(SentimentAgent(), weight=0.6)
    orch.register_agent(RiskAgent(), weight=1.5)  # más peso al riesgo
    return orch


orchestrator = init_orchestrator()

TRADE_AMOUNT_SATS = int(os.getenv("TRADE_AMOUNT_SATS", "50000"))
MIN_CONFIDENCE = int(os.getenv("MIN_CONFIDENCE", "7"))
MAX_DAILY_LOSS_PCT = float(os.getenv("MAX_DAILY_LOSS_PCT", "5"))
USDT_POLYGON_ADDRESS = os.getenv("USDT_POLYGON_ADDRESS", "")
LOOP_INTERVAL_SECS = 15 * 60  # 15 minutos (day trading intraday)
JOURNAL_FILE = "journal.jsonl"
COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price"
POSITION_FILE = "position.json"  # tracks current open position


# ── Precio BTC desde Binance (público, sin rate limits) ────────────────────────

BINANCE_URL = "https://api.binance.com/api/v3"

_price_cache: dict = {}

def get_btc_price() -> float:
    r = requests.get(f"{BINANCE_URL}/ticker/price?symbol=BTCUSDT", timeout=10)
    r.raise_for_status()
    return float(r.json()["price"])


def get_btc_price_history() -> tuple[float, float]:
    import time
    now = int(time.time() * 1000)
    one_hour_ago = now - (60 * 60 * 1000)
    one_day_ago = now - (24 * 60 * 60 * 1000)

    r = requests.get(
        f"{BINANCE_URL}/klines",
        params={
            "symbol": "BTCUSDT",
            "interval": "1h",
            "startTime": one_day_ago,
            "endTime": now,
            "limit": 25,
        },
        timeout=10,
    )
    r.raise_for_status()
    prices = r.json()

    price_24h = float(prices[0][1]) if prices else 0.0
    price_1h = float(prices[-2][1]) if len(prices) >= 2 else price_24h
    return price_1h, price_24h


# ── Posición abierta ──────────────────────────────────────────────────────────

def load_position() -> dict:
    """Load current open position from disk."""
    try:
        with open(POSITION_FILE, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"open": False}


def save_position(pos: dict):
    """Persist current position to disk."""
    with open(POSITION_FILE, "w") as f:
        json.dump(pos, f)


def calc_trade_pnl(entry_price: float, exit_price: float, fees_sats: float, amount_sats: int) -> float:
    """Calculate P&L percentage for a round-trip trade."""
    if entry_price <= 0:
        return 0.0
    pnl_price = (exit_price - entry_price) / entry_price * 100
    pnl_fees = fees_sats / amount_sats * 100 if amount_sats > 0 else 0
    return round(pnl_price - pnl_fees, 2)


# ── Journal ──────────────────────────────────────────────────────────────────

def journal_write(entry: dict):
    entry["timestamp"] = datetime.now(timezone.utc).isoformat() + "Z"
    with open(JOURNAL_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")
    logger.debug("Journal entry written: %s", json.dumps(entry)[:200])


def get_daily_pnl_pct() -> float:
    """Suma el PnL del día leyendo el journal."""
    today = date.today().isoformat()
    total_pnl = 0.0
    try:
        with open(JOURNAL_FILE, "r") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    if entry.get("timestamp", "").startswith(today) and "pnl_pct" in entry:
                        total_pnl += float(entry["pnl_pct"])
                except Exception:
                    continue
    except FileNotFoundError:
        pass
    return total_pnl


# ── Kill-switch ───────────────────────────────────────────────────────────────

def check_consecutive_errors(max_errors: int = 3) -> int:
    """Devuelve la cantidad de errores consecutivos al final del journal. Alerta si >= max_errors."""
    try:
        with open(JOURNAL_FILE, "r") as f:
            lines = f.readlines()
    except FileNotFoundError:
        return 0

    consecutive = 0
    for line in reversed(lines[-20:]):  # revisar últimas 20 entradas
        try:
            entry = json.loads(line)
            is_error = (
                entry.get("event") == "ERROR"
                or entry.get("result", {}).get("status") == "ERROR"
                or (entry.get("event") == "CYCLE" and entry.get("result", {}).get("status") == "ERROR")
            )
            if is_error:
                consecutive += 1
            else:
                break
        except Exception:
            break
    return consecutive


def check_kill_switch(daily_pnl_pct: float) -> bool:
    """Returns True si se debe detener el bot (pérdida > MAX_DAILY_LOSS_PCT)."""
    if daily_pnl_pct <= -MAX_DAILY_LOSS_PCT:
        logger.critical("KILL-SWITCH: Pérdida diaria %.2f%% supera límite de -%.1f%%. Bot detenido.", daily_pnl_pct, MAX_DAILY_LOSS_PCT)
        journal_write({"event": "KILL_SWITCH", "daily_pnl_pct": daily_pnl_pct})
        return True
    return False


# ── Swap pendiente ───────────────────────────────────────────────────────────

SWAP_PENDING_WINDOW_SECS = 600  # 10 minutos

# Estados Boltz que indican que el swap ya terminó (bien o mal)
SWAP_TERMINAL_STATES = {
    "transaction.claimed",
    "invoice.settled",
    "swap.expired",
    "invoice.failedToPay",
    "transaction.failed",
}


def get_active_swap() -> dict | None:
    """
    Escanea las últimas entradas del journal (ventana de 10 min) buscando
    un swap EJECUTADO que no haya terminado aún.
    Retorna el dict del result si hay uno activo, None si no hay ninguno.
    """
    cutoff = time.time() - SWAP_PENDING_WINDOW_SECS
    try:
        with open(JOURNAL_FILE, "r") as f:
            lines = f.readlines()
    except FileNotFoundError:
        return None

    for line in reversed(lines[-50:]):
        try:
            entry = json.loads(line)
            ts_str = entry.get("timestamp", "")
            if not ts_str:
                continue
            ts = datetime.fromisoformat(ts_str.rstrip("Z")).replace(tzinfo=timezone.utc).timestamp()
            if ts < cutoff:
                break  # journal es cronológico — no hay nada más reciente atrás

            result = entry.get("result", {})
            if (
                entry.get("event") == "CYCLE"
                and result.get("status") == "EJECUTADO"
                and result.get("swap_id")
            ):
                return result
        except Exception:
            continue
    return None


def check_swap_still_pending(swap_id: str) -> bool:
    """
    Consulta Boltz si el swap sigue activo.
    Retorna True si está pendiente, False si terminó o no se puede verificar.
    """
    try:
        status = boltz.get_swap_status(swap_id)
        state = status.get("status", "")
        logger.debug("[SWAP] %s: %s", swap_id, state)
        return state not in SWAP_TERMINAL_STATES
    except Exception as e:
        logger.warning("[SWAP] No se pudo verificar %s: %s — asumiendo libre", swap_id, e)
        return False


# ── Ejecutar trade ────────────────────────────────────────────────────────────

def execute_sell_btc(dry_run: bool) -> dict:
    """VENDER BTC: pagar invoice LN → recibir USDT en Polygon PoS."""
    if not USDT_POLYGON_ADDRESS:
        raise ValueError("USDT_POLYGON_ADDRESS no configurado en .env")

    position = load_position()
    if dry_run:
        return {"status": "DRY_RUN", "action": "VENDER_BTC", "amount_sats": TRADE_AMOUNT_SATS}

    # Calcular P&L si hay posición abierta
    pnl_pct = None
    if position.get("open") and position.get("action") == "COMPRAR_BTC":
        entry_price = position.get("entry_price", 0)
        pnl_pct = calc_trade_pnl(entry_price, get_btc_price(), 0, TRADE_AMOUNT_SATS)

    swap = boltz.create_swap_ln_to_usdt(TRADE_AMOUNT_SATS, USDT_POLYGON_ADDRESS)
    payment = lnd.pay_invoice(swap["invoice"])

    # Cerrar posición
    if position.get("open"):
        save_position({"open": False})

    result = {
        "status": "EJECUTADO",
        "action": "VENDER_BTC",
        "swap_id": swap["swap_id"],
        "amount_sats": TRADE_AMOUNT_SATS,
        "fee_sats": swap["fee_sats"] + payment["fee_sats"],
        "entry_price": position.get("entry_price"),
        "exit_price": get_btc_price(),
    }
    if pnl_pct is not None:
        result["pnl_pct"] = pnl_pct
    return result


def execute_buy_btc(dry_run: bool) -> dict:
    """COMPRAR BTC: crear invoice LN → enviar USDT via Polygon → recibir sats."""
    if dry_run:
        return {"status": "DRY_RUN", "action": "COMPRAR_BTC", "amount_sats": TRADE_AMOUNT_SATS}

    # No comprar si ya hay posición abierta
    position = load_position()
    if position.get("open"):
        return {"status": "SKIP", "reason": "ya hay posición abierta"}

    invoice_data = lnd.create_invoice(TRADE_AMOUNT_SATS, memo="ark-btc-trader buy")
    swap = boltz.create_reverse_swap_usdt_to_ln(TRADE_AMOUNT_SATS, invoice_data["payment_request"])

    usdt_amount = swap["onchain_amount"] / 1_000_000  # Boltz returns micro-USDT
    tx_hash = polygon.send_usdt(swap["usdt_address"], usdt_amount)

    # Abrir posición
    save_position({
        "open": True,
        "action": "COMPRAR_BTC",
        "entry_price": get_btc_price(),
        "amount_sats": TRADE_AMOUNT_SATS,
        "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
    })

    return {
        "status": "EJECUTADO",
        "action": "COMPRAR_BTC",
        "swap_id": swap["swap_id"],
        "usdt_address": swap["usdt_address"],
        "usdt_sent": usdt_amount,
        "amount_sats": TRADE_AMOUNT_SATS,
        "fee_sats": swap["fee_sats"],
        "polygon_tx": tx_hash,
        "entry_price": get_btc_price(),
    }


# ── Ciclo principal ───────────────────────────────────────────────────────────

def run_cycle(dry_run: bool):
    logger.info("Iniciando ciclo %s", "(DRY-RUN)" if dry_run else "")

    # Verificar conexiones
    if not lnd.check_connection():
        logger.error("No se puede conectar a LND")
        journal_write({"event": "ERROR", "detail": "LND connection failed"})
        return

    if not boltz.check_connection():
        logger.warning("Boltz API no disponible — ciclo cancelado")
        return

    # Obtener datos de mercado
    btc_price = get_btc_price()
    price_1h, price_24h = get_btc_price_history()
    ln_balance = lnd.get_balance()
    daily_pnl = get_daily_pnl_pct()

    logger.info("BTC: $%.2f | 1h: $%.2f | 24h: $%.2f", btc_price, price_1h, price_24h)
    logger.info("Balance LN: %s sats | PnL hoy: %.2f%%", f"{ln_balance['local_balance_sats']:,}", daily_pnl)

    # Kill-switch
    if check_kill_switch(daily_pnl):
        sys.exit(1)

    # Alerta errores consecutivos
    consecutive_errors = check_consecutive_errors(max_errors=3)
    if consecutive_errors >= 3:
        alert_msg = f"{consecutive_errors} errores consecutivos detectados en {JOURNAL_FILE}"
        logger.warning(alert_msg)
        journal_write({"event": "ALERTA_ERRORES_CONSECUTIVOS", "count": consecutive_errors})

    # Analizar mercado con Multi-Agent System
    market_data = {
        "btc_price_usd": btc_price,
        "price_1h_ago": price_1h,
        "price_24h_ago": price_24h,
        "daily_pnl_pct": daily_pnl,
        "ln_balance_sats": ln_balance["local_balance_sats"],
        "trade_amount_sats": TRADE_AMOUNT_SATS,
    }

    # Voting ponderado del orquestador
    orch_result = orchestrator.decide(market_data)
    confianza = orch_result["confidence"]

    # Normalizar formato del orquestador ("BUY"/"SELL"/"HOLD") al formato de ejecución
    _orch_action_map = {"BUY": "COMPRAR_BTC", "SELL": "VENDER_BTC", "HOLD": "ESPERAR"}
    accion = _orch_action_map.get(orch_result["action"], "ESPERAR")

    logger.info("Orquestador: %s | Confianza: %s/10", accion, confianza)
    for name, signal in orch_result.get("signals", []):
        logger.info("  %s: %s (conf: %.1f) → %s", name, signal.signal, signal.confidence, signal.reason)

    # Claude Brain como capa adicional de validación
    decision_claude = claude_brain.analyze_market(market_data)
    logger.info("Claude Brain: %s | Conf: %s/10", decision_claude.get('accion'), decision_claude.get('confianza', 0))

    # Priorizar Claude Brain solo si tiene MAYOR confianza que el orquestador
    if decision_claude.get("confianza", 0) > confianza:
        accion = decision_claude.get("accion", "ESPERAR")
        confianza = decision_claude.get("confianza", 0)
        logger.info("Priorizando Claude Brain (mayor confianza)")

    decision = {
        "accion": accion,
        "confianza": confianza,
        "trade_amount_sats": TRADE_AMOUNT_SATS,
        "ln_balance_sats": ln_balance["local_balance_sats"],
        "daily_pnl_pct": daily_pnl,
    }

    # Construir lista de señales para el journal
    agent_signals = []
    for name, signal in orch_result.get("signals", []):
        agent_signals.append({
            "agent": name,
            "signal": signal.signal,
            "confidence": signal.confidence,
            "reason": signal.reason
        })

    journal_entry = {
        "event": "CYCLE",
        "btc_price": btc_price,
        "decision": decision,
        "agent_signals": agent_signals,
        "claude_decision": decision_claude,
        "dry_run": dry_run,
    }

    # Guard: no ejecutar si hay un swap pendiente de ciclos anteriores
    active_swap = get_active_swap()
    if active_swap and check_swap_still_pending(active_swap["swap_id"]):
        swap_id = active_swap["swap_id"]
        logger.warning("[GUARD] Swap %s aún pendiente — saltando ejecución este ciclo", swap_id)
        journal_entry["result"] = {"status": "SKIP", "reason": f"swap pendiente: {swap_id}"}
        journal_write(journal_entry)
        return

    # Ejecutar si confianza suficiente
    if confianza >= MIN_CONFIDENCE and accion != "ESPERAR":
        try:
            if accion == "VENDER_BTC":
                result = execute_sell_btc(dry_run)
            elif accion == "COMPRAR_BTC":
                result = execute_buy_btc(dry_run)
            else:
                result = {"status": "ESPERAR"}

            logger.info("Resultado: %s", json.dumps(result, default=str)[:300])
            journal_entry["result"] = result
        except Exception as e:
            logger.error("Trade fallido: %s", e)
            journal_entry["result"] = {"status": "ERROR", "detail": str(e)}
    else:
        reason = "confianza insuficiente" if confianza < MIN_CONFIDENCE else "señal ESPERAR"
        logger.info("Sin ejecución — %s", reason)
        journal_entry["result"] = {"status": "SKIP", "reason": reason}

    journal_write(journal_entry)


# ── Entrypoint ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="ARK BTC Trader")
    parser.add_argument("--dry-run", action="store_true", help="Simular sin ejecutar trades reales")
    parser.add_argument("--loop", action="store_true", help="Correr en ciclo cada 15 minutos")
    parser.add_argument("--once", action="store_true", help="Ejecutar un solo ciclo y salir")
    parser.add_argument("--verbose", "-v", action="store_true", help="Debug logging")
    args = parser.parse_args()

    from logger import setup_logging
    setup_logging(verbose=args.verbose)

    if args.loop:
        logger.info("Modo loop activado — ciclos cada %d minutos. Ctrl+C para detener.", LOOP_INTERVAL_SECS // 60)
        while True:
            try:
                run_cycle(dry_run=args.dry_run)
            except KeyboardInterrupt:
                logger.info("Bot detenido por usuario.")
                sys.exit(0)
            except Exception as e:
                logger.error("Error inesperado: %s", e)
                journal_write({"event": "ERROR", "detail": str(e)})
            logger.info("Próximo ciclo en %d minutos...", LOOP_INTERVAL_SECS // 60)
            time.sleep(LOOP_INTERVAL_SECS)
    else:
        run_cycle(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
