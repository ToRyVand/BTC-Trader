# Equipo de Agentes Ruflo — BTC-USDT Trading Team

> Documento de referencia para la implementación del equipo de agentes autónomos.

---

## Visión

Transformar el bot existente en un sistema multi-agente donde cada especialista
analiza el mercado desde su ángulo y el orquestador consolida las señales antes
de ejecutar cualquier operación.

---

## Estructura del Equipo

```
trader-orchestrator
├── trader-technical      → Análisis técnico
├── trader-quant          → Modelos cuantitativos
├── trader-fundamental    → Análisis on-chain
├── trader-sentiment      → Sentimiento de mercado
└── trader-risk           → Gestión de riesgo
```

---

## Agentes

### 1. `trader-orchestrator`
**Rol:** Coordinador del equipo. Recibe señales de todos los agentes,
las pondera y decide si ejecutar, esperar o cerrar posición.

- Convoca al equipo en cada ciclo de análisis
- Aplica voting ponderado (cada agente tiene un peso)
- Solo ejecuta si hay consenso mínimo (ej: 3 de 5 agentes alineados)
- Registra cada decisión con su razonamiento en memoria

---

### 2. `trader-technical`
**Rol:** Analista técnico. Lee el chart y detecta patrones de precio.

**Especialidades:**
- Patrones de velas (doji, engulfing, hammer, etc.)
- Indicadores: RSI, MACD, Bollinger Bands, EMA/SMA
- Niveles de soporte y resistencia
- Divergencias

**Output:** `{ signal: "BUY|SELL|HOLD", confidence: 0-1, reason: string }`

---

### 3. `trader-quant`
**Rol:** Cuantitativo. Aplica modelos estadísticos y matemáticos.

**Especialidades:**
- Backtesting de estrategias
- Correlaciones y estadística de retornos
- Volatilidad histórica vs implícita
- Optimización de parámetros (Sharpe ratio, Sortino)

**Output:** `{ signal: "BUY|SELL|HOLD", confidence: 0-1, model: string }`

---

### 4. `trader-fundamental`
**Rol:** Analista on-chain y macro.

**Especialidades:**
- Métricas on-chain: hashrate, dificultad, NUPL, SOPR
- Dominancia de BTC
- Flujos de exchanges (entradas/salidas)
- Macro: DXY, tasas de interés, correlación con SPX

**Output:** `{ signal: "BUY|SELL|HOLD", confidence: 0-1, timeframe: string }`

---

### 5. `trader-sentiment`
**Rol:** Analista de sentimiento y flujo de noticias.

**Especialidades:**
- Fear & Greed Index
- Análisis de noticias (eventos positivos/negativos)
- Sentimiento en redes (funding rates, liquidaciones)
- Volumen de búsquedas (Google Trends)

**Output:** `{ signal: "BUY|SELL|HOLD", confidence: 0-1, sentiment_score: -1 to 1 }`

---

### 6. `trader-risk`
**Rol:** Guardián del riesgo. Veto power — puede bloquear cualquier operación.

**Especialidades:**
- Position sizing (Kelly Criterion, % del capital)
- Stop-loss dinámico basado en ATR
- Máximo drawdown permitido
- Ratio riesgo/beneficio mínimo (ej: 1:2)
- Exposición máxima simultánea

**Output:** `{ approved: bool, position_size: float, stop_loss: float, take_profit: float }`

---

## Flujo de Decisión

```
[Cada N minutos]
        │
        ▼
trader-orchestrator convoca al equipo
        │
        ├──► trader-technical   → señal + confianza
        ├──► trader-quant       → señal + confianza
        ├──► trader-fundamental → señal + confianza
        ├──► trader-sentiment   → señal + confianza
        │
        ▼
   Voting ponderado
   (pesos ajustables por condición de mercado)
        │
        ▼
  ¿Consenso ≥ umbral?
        │
    SÍ  │  NO
        │   └──► HOLD
        ▼
trader-risk evalúa
        │
  APPROVED?
        │
    SÍ  │  NO
        │   └──► BLOCKED (log + razón)
        ▼
   EJECUTAR ORDEN
   (bot.py / claude_brain.py)
```

---

## Integración con Código Existente

| Archivo actual | Rol en el nuevo sistema |
|---|---|
| `bot.py` | Ejecutor de órdenes — lo llama el orquestador |
| `claude_brain.py` | Base del orquestador — se extiende con el equipo |
| `boltz.py` | Swaps Lightning — gestión de liquidez |
| `lnd.py` | Lightning Node — canal de pagos |

---

## Próximos Pasos

- [ ] Revisar arquitectura actual de `bot.py` y `claude_brain.py`
- [ ] Crear los 6 archivos `.md` en `~/.claude/agents/trading/`
- [ ] Definir el ciclo de análisis (cada cuánto llama el orquestador)
- [ ] Conectar outputs de agentes con `bot.py`
- [ ] Implementar logging de decisiones en memoria (ReasoningBank)
- [ ] Backtesting del sistema completo antes de producción

---

*Documento creado como referencia. Implementación pendiente.*
