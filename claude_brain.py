import os
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = "claude-sonnet-4-6"
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

SYSTEM_PROMPT = """Sos un experto en trading de Bitcoin. Analizás datos de mercado y tomás decisiones de trading.

Siempre respondés en JSON puro (sin markdown, sin texto extra) con esta estructura exacta:
{
  "accion": "COMPRAR_BTC" | "VENDER_BTC" | "ESPERAR",
  "razon": "explicación concisa de la decisión",
  "confianza": <número del 1 al 10>,
  "precio_objetivo": <precio BTC en USD donde cerrar la posición, o null si ESPERAR>,
  "alerta": "mensaje de alerta si hay riesgo alto, o null"
}

Reglas:
- COMPRAR_BTC: cuando el precio está subiendo o hay una oportunidad clara de entrada
- VENDER_BTC: cuando el precio está bajando o hay señal de toma de ganancias
- ESPERAR: cuando no hay señal clara o el riesgo es alto
- confianza >= 7 para que el bot ejecute la operación
- Considerá fees de swap (~0.5%) en tu análisis de rentabilidad
- Nunca recomendés operar si la pérdida diaria acumulada es alta"""


def _mock_response(market_data: dict) -> dict:
    """Mock response when no API client is available."""
    price = market_data.get("btc_price_usd", 0)
    price_1h = market_data.get("price_1h_ago", price)
    change = ((price / price_1h) - 1) * 100 if price_1h else 0
    
    if change > 1:
        return {"accion": "COMPRAR_BTC", "razon": "Mock: precio subiendo", "confianza": 8, "precio_objetivo": price * 1.05, "alerta": None}
    elif change < -1:
        return {"accion": "VENDER_BTC", "razon": "Mock: precio bajando", "confianza": 8, "precio_objetivo": price * 0.95, "alerta": None}
    else:
        return {"accion": "ESPERAR", "razon": "Mock: sin tendencia clara", "confianza": 5, "precio_objetivo": None, "alerta": None}


def analyze_market(market_data: dict) -> dict:
    """
    Calls Claude API via OpenRouter or Anthropic and returns a trading decision.
    Supports OpenRouter (sk-or- keys) and direct Anthropic API.
    """
    user_message = f"""Analizá estos datos de mercado y dame tu decisión de trading:
    
Precio BTC actual: ${market_data.get('btc_price_usd', 0):,.2f} USD
Precio hace 1h: ${market_data.get('price_1h_ago', 0):,.2f} USD
Precio hace 24h: ${market_data.get('price_24h_ago', 0):,.2f} USD
Variación 1h: {((market_data.get('btc_price_usd', 0) / market_data.get('price_1h_ago', 1)) - 1) * 100:.2f}%
Variación 24h: {((market_data.get('btc_price_usd', 0) / market_data.get('price_24h_ago', 1)) - 1) * 100:.2f}%
PnL del día: {market_data.get('daily_pnl_pct', 0):.2f}%
Balance Lightning: {market_data.get('ln_balance_sats', 0):,} sats
Monto a operar: {market_data.get('trade_amount_sats', 0):,} sats (~${market_data.get('trade_amount_sats', 0) * market_data.get('btc_price_usd', 0) / 100_000_000:.2f} USD)

Respondé solo con el JSON."""

    raw_response = None
    
    # Try OpenRouter first (if key starts with sk-or-)
    if API_KEY and API_KEY.startswith("sk-or-"):
        try:
            from openai import OpenAI
            client = OpenAI(
                api_key=API_KEY,
                base_url=OPENROUTER_BASE_URL
            )
            
            response = client.chat.completions.create(
                model=OPENROUTER_MODEL,
                max_tokens=512,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message}
                ]
            )
            
            raw_response = response.choices[0].message.content.strip()
        except ImportError:
            pass  # Fall through to next option
    
    # If OpenRouter didn't work, try Anthropic directly
    if raw_response is None:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=API_KEY)
            
            message = client.messages.create(
                model=MODEL,
                max_tokens=512,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            
            raw_response = message.content[0].text.strip()
        except (ImportError, ModuleNotFoundError):
            pass  # Fall through to mock
    
    # If nothing worked, use mock
    if raw_response is None:
        return _mock_response(market_data)
    
    # Process the response
    try:
        decision = json.loads(raw_response)
    except json.JSONDecodeError:
        decision = {
            "accion": "ESPERAR",
            "razon": f"Error parseando respuesta: {raw_response[:200]}",
            "confianza": 1,
            "precio_objetivo": None,
            "alerta": "Respuesta inválida del modelo — revisá logs",
        }
    
    return decision
