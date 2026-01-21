# AgentPay-USDCx Wallet Generator
"""
Utility to generate Stacks testnet wallet addresses.
For server wallet initialization only.

WARNING: This is for development/hackathon use.
Production systems should use proper key management (HSM, Vault, etc.)
"""

import hashlib
import secrets
from dataclasses import dataclass
from typing import Tuple


# Stacks address version bytes
STACKS_TESTNET_VERSION = 26  # 0x1a - testnet single-sig (ST prefix)
STACKS_MAINNET_VERSION = 22  # 0x16 - mainnet single-sig (SP prefix)

# C32 alphabet used by Stacks addresses
C32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def _sha256(data: bytes) -> bytes:
    """Compute SHA-256 hash."""
    return hashlib.sha256(data).digest()


def _ripemd160(data: bytes) -> bytes:
    """Compute RIPEMD-160 hash."""
    h = hashlib.new("ripemd160")
    h.update(data)
    return h.digest()


def _hash160(data: bytes) -> bytes:
    """Compute HASH160 (SHA256 then RIPEMD160)."""
    return _ripemd160(_sha256(data))


def _c32_checksum(data: bytes) -> bytes:
    """Compute 4-byte checksum for c32check (double SHA256)."""
    return _sha256(_sha256(data))[:4]


def _c32_encode(data: bytes) -> str:
    """
    Encode bytes to c32 string (Stacks address encoding).
    C32 is similar to base32 but uses a custom alphabet.
    """
    if not data:
        return ""
    
    # Convert bytes to bits
    bits = ""
    for byte in data:
        bits += bin(byte)[2:].zfill(8)
    
    # Pad to multiple of 5
    while len(bits) % 5 != 0:
        bits = "0" + bits
    
    # Convert 5-bit chunks to c32 characters
    result = ""
    for i in range(0, len(bits), 5):
        chunk = bits[i:i+5]
        index = int(chunk, 2)
        result += C32_ALPHABET[index]
    
    # Remove leading zeros (represented as '0' in c32)
    result = result.lstrip('0') or '0'
    
    return result


def _c32_check_encode(version: int, data: bytes) -> str:
    """
    Encode data with version byte and checksum using c32check.
    This produces the full Stacks address format.
    """
    # Prepend version byte
    versioned_data = bytes([version]) + data
    
    # Compute checksum
    checksum = _c32_checksum(versioned_data)
    
    # Append checksum
    full_data = data + checksum
    
    # Encode the data (without version) + checksum
    c32_data = _c32_encode(full_data)
    
    # Determine prefix based on version
    if version == STACKS_TESTNET_VERSION:
        prefix = "ST"
    elif version == STACKS_MAINNET_VERSION:
        prefix = "SP"
    else:
        prefix = "S"
    
    return prefix + c32_data


def _public_key_from_private(private_key: bytes) -> bytes:
    """
    Derive compressed public key from private key.
    
    NOTE: This is a simplified implementation using the secp256k1 curve.
    For production, use a proper cryptographic library like ecdsa or coincurve.
    """
    try:
        # Try to use coincurve if available (faster, more reliable)
        from coincurve import PrivateKey
        pk = PrivateKey(private_key)
        return pk.public_key.format(compressed=True)
    except ImportError:
        pass
    
    try:
        # Fallback to ecdsa library
        from ecdsa import SigningKey, SECP256k1
        sk = SigningKey.from_string(private_key, curve=SECP256k1)
        vk = sk.get_verifying_key()
        # Compress the public key
        x = vk.pubkey.point.x()
        y = vk.pubkey.point.y()
        prefix = b'\x02' if y % 2 == 0 else b'\x03'
        return prefix + x.to_bytes(32, 'big')
    except ImportError:
        raise ImportError(
            "Either 'coincurve' or 'ecdsa' library is required. "
            "Install with: pip install ecdsa"
        )


def _create_stacks_address(public_key: bytes, version: int) -> str:
    """
    Create a Stacks address from a public key.
    
    Args:
        public_key: Compressed public key (33 bytes)
        version: Address version byte (26 for testnet, 22 for mainnet)
        
    Returns:
        Stacks address string (starts with ST for testnet, SP for mainnet)
    """
    # Hash the public key
    hash160 = _hash160(public_key)
    
    # Encode with c32check
    return _c32_check_encode(version, hash160)


@dataclass(frozen=True)
class WalletInfo:
    """
    Generated wallet information.
    Immutable to prevent accidental modification.
    """
    
    # Private key in hex format (64 characters)
    private_key_hex: str
    
    # Stacks address (starts with ST for testnet)
    address: str
    
    # Network: "testnet" or "mainnet"
    network: str
    
    def __repr__(self) -> str:
        """Hide private key in repr for safety."""
        return f"WalletInfo(address='{self.address}', network='{self.network}')"


def generate_testnet_wallet() -> WalletInfo:
    """
    Generate a new Stacks testnet wallet.
    
    Returns:
        WalletInfo with private key and address
        
    WARNING: Store the private key securely!
    """
    # Generate 32 random bytes for private key
    private_key = secrets.token_bytes(32)
    
    # Derive public key
    public_key = _public_key_from_private(private_key)
    
    # Create testnet address
    address = _create_stacks_address(public_key, STACKS_TESTNET_VERSION)
    
    return WalletInfo(
        private_key_hex=private_key.hex(),
        address=address,
        network="testnet",
    )


def private_key_to_address(private_key_hex: str, testnet: bool = True) -> str:
    """
    Derive Stacks address from a private key.
    
    Args:
        private_key_hex: Private key as hex string (64 characters)
        testnet: If True, generate testnet address (ST prefix)
        
    Returns:
        Stacks address string
    """
    private_key = bytes.fromhex(private_key_hex)
    
    if len(private_key) != 32:
        raise ValueError("Private key must be 32 bytes (64 hex characters)")
    
    public_key = _public_key_from_private(private_key)
    version = STACKS_TESTNET_VERSION if testnet else STACKS_MAINNET_VERSION
    
    return _create_stacks_address(public_key, version)


def generate_and_print_wallet() -> None:
    """
    Generate a testnet wallet and print setup instructions.
    For initial server wallet setup.
    """
    wallet = generate_testnet_wallet()
    
    print("=" * 60)
    print("AgentPay-USDCx Server Wallet Generated")
    print("=" * 60)
    print()
    print(f"Address: {wallet.address}")
    print(f"Network: {wallet.network}")
    print()
    print("PRIVATE KEY (KEEP SECRET!):")
    print(wallet.private_key_hex)
    print()
    print("=" * 60)
    print("SETUP INSTRUCTIONS:")
    print("=" * 60)
    print()
    print("1. Save the private key securely (password manager, etc.)")
    print()
    print("2. Set the environment variable:")
    print(f'   set AGENTPAY_SERVER_WALLET={wallet.address}')
    print()
    print("3. Fund this wallet with testnet STX and USDCx:")
    print("   - STX Faucet: https://explorer.hiro.so/sandbox/faucet?chain=testnet")
    print("   - USDCx: Request from project team or mint if available")
    print()
    print("4. Never commit the private key to source control!")
    print("=" * 60)


if __name__ == "__main__":
    generate_and_print_wallet()
