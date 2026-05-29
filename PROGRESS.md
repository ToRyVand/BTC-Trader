# ARK Trader - Estado del Proyecto
# Última actualización: 2026-05-03 (sesión noche)

## Estado: LISTO PARA FONDEAR ✅
Solo pendiente: depositar sats en Phoenix + USDT en Polygon para operar

## Lo que se hizo HOY (esta sesión)

### 1. Tracking de posiciones y P&L
- `position.json` guarda posición abierta (entry_price, monto, timestamp)
- `COMPRAR_BTC` → abre posición con precio de entrada
- `VENDER_BTC` → cierra posición, calcula `pnl_pct` (ganancia/pérdida %)
- `pnl_pct` se escribe en cada trade del journal

### 2. Dashboard con métricas reales
- KPIs: CICLOS, EJECUTADO, WINS, LOSSES, TRADE (monto en sats)
- PNL DIARIO: calculado de trades cerrados (no estimado)
- WIN RATE: basado en trades reales con pnl_pct
- Battle Log: cada entrada muestra badge con % de ganancia/pérdida

### 3. Monto de trade visible
- `trade_amount_sats` ahora se incluye en `decision` del journal
- Dashboard muestra "TRADE: 50K" (50,000 sats configurable en .env)

## Resumen Técnico Completo
- 5 agentes con datos reales de Binance (technical, quant, fundamental, sentiment, risk)
- Dashboard VGA pixel-art funcional (960x720, canvas)
- Logging estructurado (logger.py → console + bot.log)
- Ciclo: 15 min
- Seguridad: rate limiting, timeouts, .gitignore, .env chmod 600
- Dry-run funciona con datos reales de Binance
- P&L tracking por trade con position.json
- Dashboard muestra métricas reales (pnl, wins, losses, win rate, trade amount)

## Archivos Clave
- bot.py: Orquestador + tracking posiciones + P&L
- position.json: posición abierta actual (auto-generado)
- logger.py: Logging estructurado
- dashboard-v7.html: Dashboard con métricas P&L + trade amount
- trading_agents/binance_data.py: APIs Binance Spot + rate limiter
- trading_agents/technical_indicators.py: RSI, MACD, EMA, BB, ATR
- trading_agents/btc_futures_sentiment.py: Funding, L/S ratios
- trading_agents/technical_agent.py, quant_agent.py, sentiment_agent.py
- wallet.py: Phoenix wallet client (HTTP auth)
- boltz.py: Boltz swap client (reverse + submarine)
- polygon.py: USDT Polygon transfer (web3, private key)
- claude_brain.py: Claude API decision layer

## Phoenix Wallet
- URL: http://localhost:9740 (mainnet)
- Balance: 0 sats (PENDIENTE FONDEAR)
- Fee credit: 7,025 sats
- Versión: 0.7.3
- Block height: 947,812

## Polygon
- USDT0 address: 0x719566799a579c4a0F1c4998d0B7f8460B5Cec9b
- PENDIENTE: USDT + MATIC (gas)

## Flujo end-to-end (verificado en código)
- COMPRAR_BTC: USDT Polygon → Boltz submarine → Phoenix LN (sats)
- VENDER_BTC: Phoenix LN → Boltz reverse → USDT Polygon
- Ambos sentidos usan Boltz como puente
- Firmas automáticas: Phoenix (HTTP auth) + Polygon (private key)

## Pasos para Producción
1. Fondear Phoenix wallet con sats (~30K-100K recomendado)
2. Depositar USDT + MATIC (gas) en wallet Polygon
3. Primer run: `python bot.py --loop --dry-run` (verificar)
4. Run real: `python bot.py --loop`
5. Ver dashboard: abrir `dashboard-v7.html`

## Comandos
python bot.py              # Un ciclo diagnóstico
python bot.py --dry-run    # Simulación
python bot.py --loop       # Loop 15 min real
python bot.py --loop --dry-run  # Loop simulación
