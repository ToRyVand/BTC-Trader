#!/usr/bin/env python3
"""
Verificación del sistema BTC Trading Bot.
Correr antes de poner en producción.
"""
import os
import sys
import json

print(f"\n{'='*60}")
print("VERIFICACIÓN DEL SISTEMA BTC TRADING BOT")
print(f"{'='*60}\n")

errors = []
warnings = []

# 1. Verificar estructura de archivos
print("1. Verificando estructura de archivos...")
required_files = [
    "bot.py",
    "wallet.py",
    "boltz.py",
    "claude_brain.py",
    "trading_agents/__init__.py",
    "trading_agents/base_agent.py",
    "trading_agents/orchestrator.py",
    "trading_agents/technical_agent.py",
    "trading_agents/quant_agent.py",
    "trading_agents/fundamental_agent.py",
    "trading_agents/sentiment_agent.py",
    "trading_agents/risk_agent.py",
]

for f in required_files:
    if os.path.exists(f):
        print(f"   ✅ {f}")
    else:
        print(f"   ❌ {f} - FALTA")
        errors.append(f"Archivo faltante: {f}")

# 2. Verificar sintaxis de archivos Python
print("\n2. Verificando sintaxis de Python...")
py_files = [
    "bot.py", "wallet.py", "boltz.py", "claude_brain.py",
    "trading_agents/base_agent.py",
    "trading_agents/orchestrator.py",
    "trading_agents/technical_agent.py",
    "trading_agents/quant_agent.py",
    "trading_agents/fundamental_agent.py",
    "trading_agents/sentiment_agent.py",
    "trading_agents/risk_agent.py",
]

for pyf in py_files:
    if not os.path.exists(pyf):
        continue
    try:
        with open(pyf, 'r') as f:
            compile(f.read(), pyf, 'exec')
        print(f"   ✅ {pyf}")
    except SyntaxError as e:
        print(f"   ❌ {pyf} - Error sintáctico: {e}")
        errors.append(f"Error sintáctico en {pyf}: {e}")

# 3. Verificar imports básicos (sin credenciales)
print("\n3. Verificando imports de agentes...")
try:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from trading_agents.orchestrator import Orchestrator
    from trading_agents.technical_agent import TechnicalAgent
    from trading_agents.quant_agent import QuantAgent
    from trading_agents.fundamental_agent import FundamentalAgent
    from trading_agents.sentiment_agent import SentimentAgent
    from trading_agents.risk_agent import RiskAgent
    print("   ✅ Todos los agentes importan correctamente")
except Exception as e:
    print(f"   ❌ Error importando agentes: {e}")
    errors.append(f"Error de imports: {e}")

# 4. Verificar .env (sin leer contenido sensible)
print("\n4. Verificando .env...")
if os.path.exists(".env"):
    print("   ✅ .env existe")
    # Check if it's not empty
    with open(".env", 'r') as f:
        content = f.read().strip()
        if content:
            print("   ✅ .env tiene contenido")
        else:
            print("   ⚠️  .env está vacío")
            warnings.append(".env vacío")
else:
    print("   ⚠️  .env no existe — copiar de .env.example y completar")
    warnings.append(".env faltante")

# 5. Verificar dependencias Python
print("\n5. Verificando dependencias...")
dependencies = ["requests", "dotenv"]
optional = ["anthropic"]

for dep in dependencies:
    try:
        __import__(dep)
        print(f"   ✅ {dep}")
    except ImportError:
        print(f"   ❌ {dep} - no instalado")
        errors.append(f"Falta dependencia: {dep}")

for dep in optional:
    try:
        __import__(dep)
        print(f"   ✅ {dep} (opcional)")
    except ImportError:
        print(f"   ⚠️  {dep} - no instalado (necesario para producción)")
        warnings.append(f"Dependencia opcional faltante: {dep}")

# 6. Test rápido del orquestador
print("\n6. Test rápido del orquestador...")
try:
    orch = Orchestrator()
    orch.register_agent(TechnicalAgent(), weight=1.0)
    orch.register_agent(QuantAgent(), weight=1.0)
    orch.register_agent(FundamentalAgent(), weight=0.8)
    orch.register_agent(SentimentAgent(), weight=0.6)
    orch.register_agent(RiskAgent(), weight=1.5)
    
    test_data = {
        "btc_price_usd": 50000,
        "price_1h_ago": 49000,
        "price_24h_ago": 48000,
        "daily_pnl_pct": 0,
        "ln_balance_sats": 50000,
        "trade_amount_sats": 50000,
    }
    result = orch.decide(test_data)
    print(f"   ✅ Orquestador funciona — Acción: {result['action']}, Confianza: {result['confidence']}")
except Exception as e:
    print(f"   ❌ Error en orquestador: {e}")
    errors.append(f"Error en orquestador: {e}")

# Resumen
print(f"\n{'='*60}")
print("RESUMEN")
print(f"{'='*60}")

if warnings:
    print("\n⚠️  ADVERTENCIAS:")
    for w in warnings:
        print(f"   - {w}")

if errors:
    print("\n❌ ERRORES:")
    for e in errors:
        print(f"   - {e}")
    print("\n❌ Sistema NO listo para producción")
    sys.exit(1)
else:
    print("\n✅ Sistema listo para verificación de conexiones")
    print("   (requiere credenciales en .env)")
    sys.exit(0)
