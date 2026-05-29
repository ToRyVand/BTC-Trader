import os
import requests
from dotenv import load_dotenv

load_dotenv()

PHOENIX_URL = os.getenv("PHOENIX_URL", "http://localhost:9740")
PHOENIX_PASSWORD = os.getenv("PHOENIX_PASSWORD", "")


def _auth():
    # phoenixd uses HTTP Basic auth: empty username, password from config
    return ("", PHOENIX_PASSWORD)


def check_connection() -> bool:
    try:
        r = requests.get(f"{PHOENIX_URL}/getinfo", auth=_auth(), timeout=5)
        return r.status_code == 200
    except Exception:
        return False


def get_balance() -> dict:
    """Returns Lightning wallet balance."""
    r = requests.get(f"{PHOENIX_URL}/getbalance", auth=_auth(), timeout=10)
    r.raise_for_status()
    data = r.json()
    balance_sats = data.get("balanceSat", 0)
    return {
        "local_balance_sats": balance_sats,
        "remote_balance_sats": 0,
        "total_balance_sats": balance_sats,
    }


def pay_invoice(payment_request: str) -> dict:
    """Pay a Lightning invoice."""
    r = requests.post(
        f"{PHOENIX_URL}/payinvoice",
        auth=_auth(),
        data={"invoice": payment_request},
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()
    return {
        "payment_hash": data.get("paymentHash", ""),
        "payment_preimage": data.get("paymentPreimage", ""),
        "fee_sats": data.get("routingFeeSat", 0),
    }


def create_invoice(amount_sats: int, memo: str = "ark-btc-trader") -> dict:
    """Create a Lightning invoice to receive sats."""
    r = requests.post(
        f"{PHOENIX_URL}/createinvoice",
        auth=_auth(),
        data={"amountSat": str(amount_sats), "description": memo},
        timeout=10,
    )
    r.raise_for_status()
    data = r.json()
    return {
        "payment_request": data.get("serialized", ""),
        "r_hash": data.get("paymentHash", ""),
        "add_index": "",
    }
