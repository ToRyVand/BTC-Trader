<div align="center">

# 🤖⚡ BTC/USD Trader

**Bot de trading autónomo BTC/USDT sobre Lightning Network, con un comité de 5 agentes y decisiones vía la API de Claude.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Lightning](https://img.shields.io/badge/⚡-Lightning%20Network-792EE5)](https://lightning.network/)
[![Claude API](https://img.shields.io/badge/AI-Claude%20API-D97757)](https://docs.anthropic.com/)
[![Status](https://img.shields.io/badge/status-experimental-orange.svg)]()

![Trading Floor Dashboard](assets/dashboard.png)

*El **trading floor** en vivo: cada agente del comité — TICKER, PERIODISTA, LA MÁQUINA, JEFE RIESGO, ECONOMISTA y EL DIRECTOR — en una oficina isométrica pixel-art, con el chart BTC/USD y el panel de objetivos.*

</div>

> ⚠️ **Advertencia:** proyecto educativo/experimental que opera con **dinero real**. El trading automatizado de cripto conlleva **riesgo de pérdida total**. Usalo bajo tu propia responsabilidad y empezá **siempre** con `--dry-run`.

---

## 📑 Contenido

- [¿Cómo funciona?](#-cómo-funciona)
- [Reglas de seguridad](#-reglas-de-seguridad-hard-limits)
- [Stack](#️-stack)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Verificación pre-vuelo](#-verificación-antes-de-operar-con-dinero-real)
- [Estructura](#-estructura)
- [Seguridad](#-seguridad)
- [Licencia](#-licencia)

---

## 🧠 ¿Cómo funciona?

Cada ciclo, un **orquestador** consulta a 5 agentes especializados y combina sus señales antes de ejecutar (o esperar):

| Agente | Rol |
|--------|-----|
| `technical_agent` | Análisis técnico (tendencia, momentum) |
| `quant_agent` | Volatilidad y métricas cuantitativas |
| `fundamental_agent` | Estado fundamental / PnL |
| `sentiment_agent` | Sentimiento de mercado |
| `risk_agent` | Gestión de riesgo y veto |

La decisión final pasa por `claude_brain.py` (API de Claude), que asigna una **confianza de 0 a 10**. Solo se ejecuta si la confianza ≥ `MIN_CONFIDENCE`.

```
        ┌──────────────────────────────────────────┐
        │              ORQUESTADOR                   │
        └──────────────────────────────────────────┘
           │      │       │        │         │
        técnico quant  fundam.  sentim.    riesgo
           └──────┴───────┴────────┴─────────┘
                          ▼
                  🧠 claude_brain  →  confianza 0–10
                          ▼
              confianza ≥ MIN_CONFIDENCE ?
                   │ sí                 │ no
                   ▼                    ▼
            ⚡ swap Lightning        ⏸ esperar
```

## 🛡️ Reglas de seguridad (hard limits)

- ❌ Nunca opera si el balance Lightning < **10.000 sats**
- 🛑 **Kill-switch**: si la pérdida diaria supera `MAX_DAILY_LOSS_PCT`, se detiene
- ⏳ Si un swap queda pendiente > 10 min, no abre otro
- 🔒 Máximo **1 swap simultáneo**
- ✅ Confianza mínima **7/10** para ejecutar

## ⚙️ Stack

- **Python 3.10+**
- [Phoenix](https://phoenix.acinq.co/) — wallet Lightning con API HTTP
- [Boltz API v2](https://docs.boltz.exchange/) — swaps Lightning ↔ on-chain
- [Polygon](https://polygon.technology/) (USDT)
- [Anthropic Claude API](https://docs.anthropic.com/)

## 📦 Instalación

```bash
git clone https://github.com/ToRyVand/BTC-USD-TRADER.git
cd BTC-USD-TRADER

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configurá tus credenciales
cp .env.example .env
$EDITOR .env
```

## 🚀 Uso

```bash
# Un solo ciclo de diagnóstico
python bot.py

# Simulación SIN ejecutar trades reales (empezá SIEMPRE por acá)
python bot.py --dry-run

# Loop automático cada 15 minutos
python bot.py --loop

# Loop en modo simulación
python bot.py --loop --dry-run
```

## ✅ Verificación antes de operar con dinero real

```bash
python check_system.py
```

Confirmá que:

1. La conexión con Phoenix responde
2. La conexión con Boltz responde
3. `USDT_POLYGON_ADDRESS` y `POLYGON_PRIVATE_KEY` están configurados
4. Hay liquidez de salida suficiente para `TRADE_AMOUNT_SATS`

## 🗂️ Estructura

```
bot.py              # Orquestador principal
claude_brain.py     # Decisiones vía API de Claude
trading_agents/     # Los 5 agentes del comité
boltz.py            # Cliente Boltz API v2
wallet.py           # Cliente wallet Lightning
polygon.py          # Cliente Polygon / USDT
backtest.py         # Backtesting
check_system.py     # Health-check pre-vuelo
journal.jsonl       # Historial de decisiones (NO versionado)
```

## 🔐 Seguridad

- El `.env` con tus claves **nunca** se versiona (ver `.gitignore`)
- **Nunca** compartas `POLYGON_PRIVATE_KEY` ni `PHOENIX_PASSWORD`
- Los logs y el `journal.jsonl` están excluidos del repo porque pueden contener montos y direcciones
- Si sospechás que una clave tocó algún commit (aunque lo borres), **rotala de inmediato**

## 📄 Licencia

[MIT](LICENSE) — usalo, aprendé, mejoralo. Sin garantías.
