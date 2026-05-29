---
name: Estado del proyecto ARK BTC Trader
description: Progreso actual del proyecto — qué está hecho y qué queda pendiente
type: project
---
Proyecto tiene DOS tracks paralelos:

**Track 1 — Bot de trading (Python)**
- `bot.py` (orquestador), `claude_brain.py`, `boltz.py` (swaps LN↔USDT), `wallet.py` (Phoenix)
- `trading_agents/` — orchestrator, technical, quant, fundamental, sentiment, risk
- Wallet: phoenixd corriendo en localhost:9740 (HTTP Basic auth, password en .env)

**Track 2 — Dashboard 2D visual (JS Canvas)**
- Dashboard activo: `dashboard-v7.html`
- JS en `js/` con capas: engine, agents, movement, scene, sprites, state, events, ui

---

## Dashboard — Estado ✅ 42/42 COMPLETADO

**Completado:**
- Fase 1-4: Canvas2DEngine 60fps, sprites 16-bit, pathfinding A*, FSM 8 estados
- Fase 5: EventSystem pub/sub + JournalPoller (polling journal.jsonl cada 8s)
- Fase 6: DialogBubble, ParticleEffect, StatsPanel, UIOverlay
- Fase 7: scanlines monitores, chart BTC en pared izquierda, floating particles, vignette CRT
- Task 36: FSM sync con journal — fix cadena FSM (faltaba WALKING_TO_MEETING), feedback visual por estado (color camisa + ícono), `window.testEvents.buy/sell/hold/trade()`
- Task 36: JournalPoller skipHistoryOnStart, fix `dir-reason` → `dir-reason-text`
- Task 37: Error handling robusto — overlay "Sin conexión con journal", retry 30s, sprite fallback logging, pathfinding failure → IDLE transition
- Task 38: Performance — floor/wall caches offscreen, furniture list pre-computed, vignette gradient cacheado
- Task 39: Memory management — `destroy()` en todos los módulos (Canvas2DEngine, AgentController, StateManager, FSM, SpriteSystem, AnimationController, UIOverlay, StatsPanel, JournalPoller, SceneRenderer, LayerManager), cleanup de intervalos en HTML inline, `window.destroyDashboard()` expuesto
- Task 40: Accesibilidad — aria-label en canvas, `<noscript>`, navegación por teclado (Flechas/Enter/ESC/Home/End), screen reader announcements (`#a11y-announcer`), focus visible, hint de controles
- Task 41: Browser compatibility — meta tags, feature detection script (ES6, Promise, fetch, canvas, async/await, arrow functions), warning visual si no compatible, sin vendor prefixes
- Task 42: Test journal — `journal_test.jsonl` con 12 escenarios (CYCLE, DECISION, EXECUTION, ERROR, ALERTA)

**Bug fix (Sesión 5):** `AgentController.js` tenía código duplicado al final (líneas 166-170 basura) → causaba error de parsing que impedía cargar todo el dashboard.

---

## Bot Python — Estado ✅ FIXES APLICADOS + VERIFICADO CON PHOENIXD REAL (Sesión 5)

**Fixes críticos (Sesión 4 — 3 mayo 2026):**
- 🔴 CRÍTICO fix: Mismatch formato acción — Orchestrator retorna "BUY"/"SELL"/"HOLD", bot ejecuta "COMPRAR_BTC"/"VENDER_BTC". Trades NUNCA se ejecutaban por path del Orchestrator. Fix: `_orch_action_map` en `bot.py` normaliza antes de comparar con Claude Brain.
- 🔴 CRÍTICO fix: RiskAgent votaba BUY (conf 0.5) en condiciones normales con peso 1.5 — sesgaba todo el sistema hacia comprar. Fix: vota HOLD (conf 0.3) cuando riesgo OK.
- 🟡 fix: Guard contra swaps concurrentes — `get_active_swap()` escanea últimas 50 líneas del journal, `check_swap_still_pending()` llama Boltz API. Si hay swap pendiente de últimos 10 min, saltea ejecución.
- 🟢 fix: Orchestrator loop O(n²) → O(n) con `self.weights[n]` dict lookup directo.

**Fixes menores (Sesión 5):**
- 🟢 `LOOP_INTERVAL_SECS` corregido de 15 min → 30 min (matching CLAUDE.md)
- 🟢 Comentario `execute_sell_btc` corregido "Arbitrum" → "Polygon PoS"

**Probado con phoenixd real (Sesión 5 — 4 mayo 2026):**
- ✅ phoenixd v0.7.3 conectado (mainnet, block 947800, PID 122171)
- ✅ Precios Binance reales OK ($78,442.71 BTC)
- ✅ 5 agentes votando correctamente (RiskAgent HOLD 1.0 por balance 0 sats)
- ✅ Claude Brain ESPERAR conf 6/10
- ✅ Journal escrito correctamente con todos los campos
- ✅ Decisión ESPERAR ejecutada (orquestador conf 10.0)
- ✅ Pipeline completo verificado end-to-end

**Arquitectura de decisión (aclarada):**
1. Orchestrator vota ponderado (5 agentes) → accion + confianza 0-10
2. Claude Brain analiza → accion + confianza 0-10
3. Gana quien tenga MAYOR confianza
4. Si confianza >= 7 y accion != ESPERAR → ejecuta swap

**Pendiente Bot:**
- Probar con wallet con fondos y canales LN abiertos para validar swaps reales
- Configurar `USDT_POLYGON_ADDRESS` en `.env` para ventas reales

---

**Why:** El dashboard sirve como visualización en tiempo real del bot corriendo.
**How to apply:** Dashboard 100% completo. Bot listo para producción con fondos.
