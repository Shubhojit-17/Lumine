# AgentPay-USDCx Stacks Wallet
"""
Stacks wallet for signing and broadcasting transactions.
Supports SIP-010 token transfers on testnet.
"""

import os
import time
import hashlib
import struct
from dataclasses import dataclass
from typing import Optional, Tuple
from enum import IntEnum

import httpx


# ============================================
# CONSTANTS
# ============================================

STACKS_TESTNET_API = "https://api.testnet.hiro.so"

# USDCx contract on testnet
USDCX_CONTRACT_ADDRESS = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
USDCX_CONTRACT_NAME = "usdcx"

# Transaction constants
TX_VERSION_TESTNET = 0x80
ANCHOR_MODE_ANY = 0x03
POST_CONDITION_MODE_DENY = 0x02

# Address versions
ADDRESS_VERSION_TESTNET_SINGLE = 26

# C32 alphabet
C32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


class ClarityType(IntEnum):
    """Clarity value type prefixes."""
    INT = 0x00
    UINT = 0x01
    BUFFER = 0x02
    TRUE = 0x03
    FALSE = 0x04
    PRINCIPAL_STANDARD = 0x05
    PRINCIPAL_CONTRACT = 0x06
    NONE = 0x09
    SOME = 0x0a


# ============================================
# CRYPTO UTILITIES
# ============================================

def _sha256(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def _ripemd160(data: bytes) -> bytes:
    h = hashlib.new("ripemd160")
    h.update(data)
    return h.digest()


def _hash160(data: bytes) -> bytes:
    return _ripemd160(_sha256(data))


def _get_public_key(private_key: bytes) -> bytes:
    """Derive compressed public key from private key."""
    try:
        from ecdsa import SigningKey, SECP256k1
        sk = SigningKey.from_string(private_key, curve=SECP256k1)
        vk = sk.get_verifying_key()
        x = vk.pubkey.point.x()
        y = vk.pubkey.point.y()
        prefix = b'\x02' if y % 2 == 0 else b'\x03'
        return prefix + x.to_bytes(32, 'big')
    except ImportError:
        raise ImportError("ecdsa library required: pip install ecdsa")


def _sign_message(message_hash: bytes, private_key: bytes) -> Tuple[int, bytes, bytes]:
    """
    Sign a message hash and return (recovery_id, r, s).
    Returns recoverable signature components.
    """
    from ecdsa import SigningKey, SECP256k1
    from ecdsa.util import sigencode_string
    
    sk = SigningKey.from_string(private_key, curve=SECP256k1)
    
    # Sign with deterministic k (RFC 6979)
    signature = sk.sign_digest(
        message_hash,
        sigencode=sigencode_string,
    )
    
    r = int.from_bytes(signature[:32], 'big')
    s = int.from_bytes(signature[32:], 'big')
    
    # Normalize s to low-S form
    order = SECP256k1.order
    if s > order // 2:
        s = order - s
    
    # Calculate recovery ID
    public_key = _get_public_key(private_key)
    for recovery_id in range(4):
        try:
            recovered = _recover_public_key(message_hash, r, s, recovery_id)
            if recovered == public_key:
                return recovery_id, r.to_bytes(32, 'big'), s.to_bytes(32, 'big')
        except Exception:
            continue
    
    # Default to 0 if recovery fails
    return 0, r.to_bytes(32, 'big'), s.to_bytes(32, 'big')


def _recover_public_key(message_hash: bytes, r: int, s: int, recovery_id: int) -> bytes:
    """Attempt to recover public key from signature."""
    from ecdsa import SECP256k1, VerifyingKey, ellipticcurve
    
    curve = SECP256k1.curve
    order = SECP256k1.order
    generator = SECP256k1.generator
    
    # Calculate R point
    x = r + (recovery_id // 2) * order
    
    # Calculate y from x
    p = curve.p()
    y_squared = (pow(x, 3, p) + curve.a() * x + curve.b()) % p
    y = pow(y_squared, (p + 1) // 4, p)
    
    if (y % 2) != (recovery_id % 2):
        y = p - y
    
    R = ellipticcurve.Point(curve, x, y)
    
    # Calculate public key: Q = r^-1 * (s*R - e*G)
    e = int.from_bytes(message_hash, 'big')
    r_inv = pow(r, order - 2, order)
    
    # s*R
    sR = R * s
    # e*G
    eG = generator * e
    # s*R - e*G
    diff = sR + ellipticcurve.Point(curve, eG.x(), (-eG.y()) % p)
    # r^-1 * (s*R - e*G)
    Q = diff * r_inv
    
    # Compress
    prefix = b'\x02' if Q.y() % 2 == 0 else b'\x03'
    return prefix + Q.x().to_bytes(32, 'big')


# ============================================
# C32 ENCODING
# ============================================

def c32_decode(input_str: str) -> bytes:
    """Decode c32 string to bytes."""
    bits = ""
    for char in input_str.upper():
        index = C32_ALPHABET.index(char)
        bits += bin(index)[2:].zfill(5)
    
    while len(bits) % 8 != 0 and bits.startswith("0"):
        bits = bits[1:]
    while len(bits) % 8 != 0:
        bits = "0" + bits
    
    result = []
    for i in range(0, len(bits), 8):
        result.append(int(bits[i:i+8], 2))
    
    return bytes(result)


def address_to_bytes(address: str) -> Tuple[int, bytes]:
    """
    Parse Stacks address to version byte and hash160.
    Returns (version, hash160_bytes).
    """
    prefix = address[:2].upper()
    if prefix == "ST":
        version = ADDRESS_VERSION_TESTNET_SINGLE
    elif prefix == "SP":
        version = 22  # mainnet
    else:
        raise ValueError(f"Invalid address prefix: {prefix}")
    
    decoded = c32_decode(address[2:])
    # 20 bytes hash160 + 4 bytes checksum
    hash160 = decoded[:20]
    
    return version, hash160


# ============================================
# CLARITY SERIALIZATION
# ============================================

def serialize_uint(value: int) -> bytes:
    """Serialize Clarity uint (u128)."""
    return bytes([ClarityType.UINT]) + value.to_bytes(16, 'big')


def serialize_principal_standard(address: str) -> bytes:
    """Serialize standard principal."""
    version, hash160 = address_to_bytes(address)
    return bytes([ClarityType.PRINCIPAL_STANDARD, version]) + hash160


def serialize_principal_contract(address: str, contract_name: str) -> bytes:
    """Serialize contract principal."""
    version, hash160 = address_to_bytes(address)
    name_bytes = contract_name.encode('ascii')
    return (
        bytes([ClarityType.PRINCIPAL_CONTRACT, version]) +
        hash160 +
        bytes([len(name_bytes)]) +
        name_bytes
    )


def serialize_none() -> bytes:
    """Serialize Clarity none."""
    return bytes([ClarityType.NONE])


def serialize_string_ascii(s: str) -> bytes:
    """Serialize ASCII string (as buffer for memo)."""
    encoded = s.encode('ascii')
    return bytes([ClarityType.BUFFER]) + struct.pack('>I', len(encoded)) + encoded


# ============================================
# TRANSACTION BUILDING
# ============================================

def build_contract_call_payload(
    contract_address: str,
    contract_name: str,
    function_name: str,
    function_args: list[bytes],
) -> bytes:
    """Build contract call payload."""
    addr_version, addr_hash = address_to_bytes(contract_address)
    contract_name_bytes = contract_name.encode('ascii')
    function_name_bytes = function_name.encode('ascii')
    
    payload = bytes([0x02])  # TransactionPayload::ContractCall
    payload += bytes([addr_version]) + addr_hash
    payload += bytes([len(contract_name_bytes)]) + contract_name_bytes
    payload += bytes([len(function_name_bytes)]) + function_name_bytes
    payload += struct.pack('>I', len(function_args))
    for arg in function_args:
        payload += arg
    
    return payload


def build_authorization_placeholder() -> bytes:
    """Build placeholder authorization (to be replaced after signing)."""
    # Standard authorization, single signature
    auth = bytes([0x04])  # AuthType::Standard
    auth += bytes([0x00])  # SpendingConditionType::Singlesig (P2PKH)
    auth += bytes([0x00])  # HashMode::P2PKH
    auth += bytes(20)  # signer (placeholder)
    auth += bytes(8)   # nonce (placeholder)
    auth += bytes(8)   # fee (placeholder)
    auth += bytes([0x00])  # key encoding: compressed
    auth += bytes(65)  # signature (placeholder)
    return auth


def build_post_conditions_sip010(
    sender: str,
    contract_address: str,
    contract_name: str,
    asset_name: str,
    amount: int,
) -> bytes:
    """Build post-conditions for SIP-010 transfer."""
    # Post condition mode: Deny
    pc = bytes([POST_CONDITION_MODE_DENY])
    
    # Number of post conditions
    pc += struct.pack('>I', 1)
    
    # FungiblePostCondition
    pc += bytes([0x01])  # PostConditionType::Fungible
    
    # Principal: 0x02 = Standard principal, then version + hash160
    sender_version, sender_hash = address_to_bytes(sender)
    pc += bytes([0x02])  # StandardPrincipal indicator
    pc += bytes([sender_version])  # Address version (26 for testnet)
    pc += sender_hash  # 20 bytes hash160
    
    # Asset info: contract address version + hash + contract name + asset name
    asset_version, asset_addr_hash = address_to_bytes(contract_address)
    pc += bytes([asset_version])  # Asset contract address version
    pc += asset_addr_hash  # Asset contract address hash160
    pc += bytes([len(contract_name)]) + contract_name.encode('ascii')
    pc += bytes([len(asset_name)]) + asset_name.encode('ascii')
    
    # Condition: SendEq
    pc += bytes([0x01])  # FungibleConditionCode::SentEq
    pc += amount.to_bytes(8, 'big')
    
    return pc


@dataclass
class StacksWallet:
    """
    Stacks wallet for signing and broadcasting transactions.
    """
    
    private_key: bytes
    address: str
    public_key: bytes
    
    @classmethod
    def from_private_key(cls, private_key_hex: str) -> "StacksWallet":
        """Create wallet from hex private key."""
        private_key = bytes.fromhex(private_key_hex)
        if len(private_key) != 32:
            raise ValueError("Private key must be 32 bytes")
        
        public_key = _get_public_key(private_key)
        
        # Derive address
        hash160 = _hash160(public_key)
        
        # C32 encode for testnet
        from ..verification.wallet_generator import _c32_check_encode
        address = _c32_check_encode(ADDRESS_VERSION_TESTNET_SINGLE, hash160)
        
        return cls(
            private_key=private_key,
            address=address,
            public_key=public_key,
        )
    
    @classmethod
    def from_env(cls) -> "StacksWallet":
        """Create wallet from AGENTPAY_AGENT_PRIVATE_KEY env var."""
        key = os.environ.get("AGENTPAY_AGENT_PRIVATE_KEY")
        if not key:
            raise EnvironmentError("AGENTPAY_AGENT_PRIVATE_KEY not set")
        return cls.from_private_key(key)
    
    def get_nonce(self) -> int:
        """Fetch current nonce from Stacks API."""
        url = f"{STACKS_TESTNET_API}/extended/v1/address/{self.address}/nonces"
        response = httpx.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data.get("possible_next_nonce", 0)
    
    def get_stx_balance(self) -> int:
        """Get STX balance for gas fees."""
        url = f"{STACKS_TESTNET_API}/extended/v1/address/{self.address}/balances"
        response = httpx.get(url, timeout=30)
        response.raise_for_status()
        return int(response.json()["stx"]["balance"])
    
    def transfer_usdcx(
        self,
        recipient: str,
        amount: int,
        fee: int = 2000,
    ) -> str:
        """
        Transfer USDCx to recipient.
        Returns transaction ID.
        """
        nonce = self.get_nonce()
        
        # Build function args for SIP-010 transfer:
        # (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
        function_args = [
            serialize_uint(amount),
            serialize_principal_standard(self.address),
            serialize_principal_standard(recipient),
            serialize_none(),  # no memo
        ]
        
        # Build payload
        payload = build_contract_call_payload(
            USDCX_CONTRACT_ADDRESS,
            USDCX_CONTRACT_NAME,
            "transfer",
            function_args,
        )
        
        # Build post-conditions
        post_conditions = build_post_conditions_sip010(
            self.address,
            USDCX_CONTRACT_ADDRESS,
            USDCX_CONTRACT_NAME,
            "usdcx-token",  # asset name in contract
            amount,
        )
        
        # Build transaction
        tx = self._build_and_sign_tx(payload, post_conditions, nonce, fee)
        
        # Broadcast
        return self._broadcast(tx)
    
    def _build_and_sign_tx(
        self,
        payload: bytes,
        post_conditions: bytes,
        nonce: int,
        fee: int,
    ) -> bytes:
        """Build and sign a transaction."""
        # Transaction prefix (for signing)
        prefix = bytes([TX_VERSION_TESTNET])
        prefix += bytes([0x00, 0x00, 0x00, 0x00])  # chain ID (testnet)
        
        # Authorization
        signer_hash = _hash160(self.public_key)
        
        # Build auth for signing (with signature placeholder for sighash)
        # Format: auth_type(1) + hash_mode(1) + signer(20) + nonce(8) + fee(8) + key_encoding(1) + signature(65)
        auth_presign = bytes([0x04])  # Standard auth
        auth_presign += bytes([0x00])  # Singlesig P2PKH
        auth_presign += signer_hash
        auth_presign += nonce.to_bytes(8, 'big')
        auth_presign += fee.to_bytes(8, 'big')
        auth_presign += bytes([0x00])  # key encoding: compressed
        auth_presign += bytes(65)  # signature placeholder (65 zero bytes)
        
        # Anchor mode and post-condition mode are part of tx body
        tx_body = bytes([ANCHOR_MODE_ANY])
        tx_body += post_conditions
        tx_body += payload
        
        # Build sighash (double SHA256 of presign transaction)
        sighash_presign = prefix + auth_presign + tx_body
        sighash = _sha256(_sha256(sighash_presign))
        
        # Sign
        recovery_id, r, s = _sign_message(sighash, self.private_key)
        signature = bytes([recovery_id]) + r + s
        
        # Build final auth with signature
        final_auth = bytes([0x04])  # Standard auth
        final_auth += bytes([0x00])  # Singlesig P2PKH
        final_auth += signer_hash
        final_auth += nonce.to_bytes(8, 'big')
        final_auth += fee.to_bytes(8, 'big')
        final_auth += bytes([0x00])  # compressed key
        final_auth += signature
        
        # Final transaction
        return prefix + final_auth + tx_body
    
    def _broadcast(self, tx: bytes) -> str:
        """Broadcast transaction and return txid."""
        url = f"{STACKS_TESTNET_API}/v2/transactions"
        response = httpx.post(
            url,
            content=tx,
            headers={"Content-Type": "application/octet-stream"},
            timeout=30,
        )
        
        if response.status_code != 200:
            raise RuntimeError(f"Broadcast failed: {response.text}")
        
        # Response is the txid as a string
        txid = response.text.strip().strip('"')
        return txid
    
    def wait_for_confirmation(self, txid: str, timeout: int = 600) -> bool:
        """
        Wait for transaction to be confirmed in an anchor block.
        Returns True if confirmed, raises TimeoutError if not.
        """
        url = f"{STACKS_TESTNET_API}/extended/v1/tx/{txid}"
        start = time.time()
        
        while time.time() - start < timeout:
            try:
                response = httpx.get(url, timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    status = data.get("tx_status")
                    
                    if status == "success":
                        block_height = data.get("block_height")
                        if block_height and block_height > 0:
                            return True
                    elif status not in ("pending", None):
                        # Failed
                        raise RuntimeError(f"Transaction failed: {status}")
            except httpx.HTTPError:
                pass
            
            time.sleep(10)
        
        raise TimeoutError(f"Transaction {txid} not confirmed within {timeout}s")
