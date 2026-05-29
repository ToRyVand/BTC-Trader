# ARK BTC Trader — Boltz + LND

## Tarea
Ejecutar `bot.py --loop` cada 15 minutos (24/7).
Monitorear `journal.jsonl` y alertar si hay 3 errores consecutivos.

## Comandos

```bash
# Un solo ciclo (diagnóstico)
python bot.py

# Simulación sin ejecutar trades reales
python bot.py --dry-run

# Loop automático cada 15 minutos
python bot.py --loop

# Dry-run en loop
python bot.py --loop --dry-run
```

## Reglas absolutas
- NUNCA ejecutar si `ln_balance_sats` < 10000 sats
- SIEMPRE verificar kill-switch antes de cada ciclo (pérdida diaria > 5%)
- Si un swap queda pendiente > 10 min, loguear y no ejecutar otro
- No ejecutar más de 1 swap simultáneo
- La confianza mínima para ejecutar es 7/10

## Archivos clave
- `journal.jsonl` — historial de todas las decisiones y trades
- `.env` — configuración y claves (NO modificar, NO commitear)
- `lnd.py` — cliente REST del nodo LND
- `boltz.py` — cliente Boltz API v2 (swaps Lightning ↔ USDT)
- `claude_brain.py` — cerebro de decisiones via Claude API
- `bot.py` — orquestador principal

## Verificar antes de correr con dinero real
1. `python -c "import lnd; print(lnd.check_connection())"` → debe ser `True`
2. `python -c "import boltz; print(boltz.check_connection())"` → debe ser `True`
3. Confirmar que `USDT_ARBITRUM_ADDRESS` está configurado en `.env`
4. Tener canales LND con suficiente liquidez de salida para el monto configurado
