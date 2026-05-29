import os
import base64
import requests
from requests.adapters import HTTPAdapter
from dotenv import load_dotenv

load_dotenv()

LND_HOST = os.getenv("LND_HOST", "https://localhost:8080")
LND_MACAROON_HEX = os.getenv("LND_MACAROON_HEX", "")
LND_MACAROON_PATH = os.getenv("LND_MACAROON_PATH", "")
LND_TLS_CERT_PATH = os.getenv("LND_TLS_CERT_PATH", "")
LND_TOR_PROXY = os.getenv("LND_TOR_PROXY", "")


def _get_headers() -> dict:
    if LND_MACAROON_HEX:
        macaroon = LND_MACAROON_HEX
    else:
        with open(LND_MACAROON_PATH, "rb") as f:
            macaroon = f.read().hex()
    return {"Grpc-Metadata-macaroon": macaroon}


def _get_session() -> requests.Session:
    session = requests.Session()
    # Always disable cert verification for Tor connections (self-signed)
    session.verify = False
    
    # Apply Tor proxy if set
    if LND_TOR_PROXY:
        session.proxies = {
            'http': LND_TOR_PROXY,
            'https': LND_TOR_PROXY
        }
    
    return session


def check_connection() -> bool:
    try:
        session = _get_session()
        r = session.get(f"{LND_HOST}/v1/getinfo", headers=_get_headers(), timeout=5)
        return r.status_code == 200
    except Exception:
        return False


def get_balance() -> dict:
    """Returns channel balance (Lightning)."""
    session = _get_session()
    r = session.get(f"{LND_HOST}/v1/balance/channels", headers=_get_headers(), timeout=10)
    r.raise_for_status()
    data = r.json()
    return {
        "local_balance_sats": int(data.get("local_balance", {}).get("sat", 0)),
        "remote_balance_sats": int(data.get("remote_balance", {}).get("sat", 0)),
        "total_balance_sats": int(data.get("balance", 0)),
    }


def get_wallet_balance() -> dict:
    """Returns on-chain wallet balance."""
    session = _get_session()
    r = session.get(f"{LND_HOST}/v1/balance/blockchain", headers=_get_headers(), timeout=10)
    r.raise_for_status()
    data = r.json()
    return {
        "confirmed_sats": int(data.get("confirmed_balance", 0)),
        "unconfirmed_sats": int(data.get("unconfirmed_balance", 0)),
        "total_sats": int(data.get("total_balance", 0)),
    }


def pay_invoice(payment_request: str) -> dict:
    """Pay a Lightning invoice. Returns payment result."""
    session = _get_session()
    payload = {"payment_request": payment_request}
    r = session.post(f"{LND_HOST}/v1/channels/transactions", headers=_get_headers(), json=payload, timeout=60)
    r.raise_for_status()
    data = r.json()
    if data.get("payment_error"):
        raise RuntimeError(f"Payment failed: {data['payment_error']}")
    return {
        "payment_hash": data.get("payment_hash", ""),
        "payment_preimage": data.get("payment_preimage", ""),
        "fee_sats": int(data.get("payment_route", {}).get("total_fees", 0)),
    }


def create_invoice(amount_sats: int, memo: str = "ark-btc-trader") -> dict:
    """Create a Lightning invoice to receive sats."""
    session = _get_session()
    payload = {"value": str(amount_sats), "memo": memo}
    r = session.post(f"{LND_HOST}/v1/invoices", headers=_get_headers(), json=payload, timeout=10)
    r.raise_for_status()
    data = r.json()
    return {
        "payment_request": data.get("payment_request", ""),
        "r_hash": base64.b64decode(data.get("r_hash", "")).hex() if data.get("r_hash") else "",
        "add_index": data.get("add_index", ""),
    }
