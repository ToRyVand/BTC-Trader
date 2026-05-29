import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

POLYGON_RPC = os.getenv("POLYGON_RPC", "https://polygon-rpc.com")
POLYGON_PRIVATE_KEY = os.getenv("POLYGON_PRIVATE_KEY", "")

# USDT on Polygon PoS (Tether official contract)
USDT_ADDRESS = Web3.to_checksum_address("0xc2132D05D31c914a87C6611C10748AEb04B58e8F")
USDT_DECIMALS = 6

# Minimal ERC20 ABI — only what the bot needs
_ERC20_ABI = [
    {
        "name": "balanceOf",
        "type": "function",
        "inputs": [{"name": "account", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
    },
    {
        "name": "transfer",
        "type": "function",
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
    },
]


def _connect() -> Web3:
    w3 = Web3(Web3.HTTPProvider(POLYGON_RPC))
    if not w3.is_connected():
        raise ConnectionError(f"No se puede conectar a Polygon RPC: {POLYGON_RPC}")
    return w3


def _account(w3: Web3):
    if not POLYGON_PRIVATE_KEY:
        raise ValueError("POLYGON_PRIVATE_KEY no configurado en .env")
    return w3.eth.account.from_key(POLYGON_PRIVATE_KEY)


def check_connection() -> bool:
    try:
        return _connect().is_connected()
    except Exception:
        return False


def get_address() -> str:
    """Returns the bot's Polygon wallet address derived from the private key."""
    if not POLYGON_PRIVATE_KEY:
        raise ValueError("POLYGON_PRIVATE_KEY no configurado en .env")
    return Web3().eth.account.from_key(POLYGON_PRIVATE_KEY).address


def get_usdt_balance() -> float:
    """Returns USDT balance in human units (e.g. 10.50 = $10.50)."""
    w3 = _connect()
    account = _account(w3)
    contract = w3.eth.contract(address=USDT_ADDRESS, abi=_ERC20_ABI)
    raw = contract.functions.balanceOf(account.address).call()
    return raw / (10 ** USDT_DECIMALS)


def send_usdt(to_address: str, amount_usdt: float) -> str:
    """
    Send USDT to an address (e.g. Boltz lockup address).
    amount_usdt: human units (e.g. 10.5 = $10.50 USDT)
    Returns the transaction hash.
    """
    w3 = _connect()
    account = _account(w3)
    contract = w3.eth.contract(address=USDT_ADDRESS, abi=_ERC20_ABI)

    amount_raw = int(amount_usdt * (10 ** USDT_DECIMALS))
    to_checksum = Web3.to_checksum_address(to_address)

    tx = contract.functions.transfer(to_checksum, amount_raw).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "gas": 100_000,
        "gasPrice": w3.eth.gas_price,
        "chainId": 137,  # Polygon PoS mainnet
    })

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

    if receipt.status != 1:
        raise RuntimeError(f"Transacción fallida: {tx_hash.hex()}")

    return tx_hash.hex()
