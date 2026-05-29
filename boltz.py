import os
import requests
from dotenv import load_dotenv

load_dotenv()

BOLTZ_API = "https://api.boltz.exchange/v2"
TIMEOUT = 15

# Boltz asset identifiers
ASSET_BTC = "BTC"     # Lightning side is always "BTC" in Boltz
ASSET_USDT = "USDT0-POL"  # USDT0 on Polygon PoS (chainId 137, canSend: true)


def check_connection() -> bool:
    try:
        r = requests.get(f"{BOLTZ_API}/version", timeout=5)
        return r.status_code == 200
    except Exception:
        return False


def get_pair_info() -> dict:
    """Get available swap pair info from Boltz."""
    result = {}
    try:
        r = requests.get(f"{BOLTZ_API}/swap/reverse", timeout=TIMEOUT)
        if r.status_code == 200:
            data = r.json()
            if ASSET_USDT in data.get(ASSET_BTC, {}):
                result["ln_to_usdt"] = data[ASSET_BTC][ASSET_USDT]
    except Exception:
        pass
    try:
        r = requests.get(f"{BOLTZ_API}/swap/submarine", timeout=TIMEOUT)
        if r.status_code == 200:
            data = r.json()
            if ASSET_BTC in data.get(ASSET_USDT, {}):
                result["usdt_to_ln"] = data[ASSET_USDT][ASSET_BTC]
    except Exception:
        pass
    return result


def create_swap_ln_to_usdt(amount_sats: int, usdt_address: str) -> dict:
    """
    Reverse swap: pay Lightning invoice → receive USDT0 on Arbitrum.
    Boltz generates the LN invoice; the bot pays it via the wallet.
    """
    payload = {
        "from": ASSET_BTC,
        "to": ASSET_USDT,
        "invoiceAmount": amount_sats,
        "address": usdt_address,
        "referralId": "ark-btc-trader",
    }
    r = requests.post(f"{BOLTZ_API}/swap/reverse", json=payload, timeout=TIMEOUT)
    r.raise_for_status()
    data = r.json()
    return {
        "swap_id": data.get("id", ""),
        "invoice": data.get("invoice", ""),
        "onchain_amount": data.get("onchainAmount", 0),
        "fee_sats": data.get("fees", {}).get("boltz", 0),
        "timeout_block_height": data.get("timeoutBlockHeight", 0),
        "raw": data,
    }


def create_reverse_swap_usdt_to_ln(amount_sats: int, invoice: str) -> dict:
    """
    Submarine swap: send USDT0 on Arbitrum → receive sats via Lightning.
    Boltz returns an Arbitrum address to send USDT0 to.
    """
    payload = {
        "from": ASSET_USDT,
        "to": ASSET_BTC,
        "invoice": invoice,
        "referralId": "ark-btc-trader",
    }
    r = requests.post(f"{BOLTZ_API}/swap/submarine", json=payload, timeout=TIMEOUT)
    r.raise_for_status()
    data = r.json()
    return {
        "swap_id": data.get("id", ""),
        "usdt_address": data.get("address", ""),
        "onchain_amount": data.get("expectedAmount", 0),
        "fee_sats": data.get("fees", {}).get("boltz", 0),
        "timeout_block_height": data.get("timeoutBlockHeight", 0),
        "raw": data,
    }


def get_swap_status(swap_id: str) -> dict:
    """Poll swap status by ID."""
    r = requests.get(f"{BOLTZ_API}/swap/{swap_id}", timeout=TIMEOUT)
    r.raise_for_status()
    data = r.json()
    return {
        "swap_id": swap_id,
        "status": data.get("status", "unknown"),
        "raw": data,
    }
