# AgentPay-USDCx Verification Configuration
"""
Configuration constants for payment verification.
All values are for Stacks TESTNET only.
"""

import os
from dataclasses import dataclass
from typing import Final


# ============================================
# NETWORK CONFIGURATION
# ============================================

# Stacks testnet API endpoint (Hiro)
STACKS_TESTNET_API: Final[str] = "https://api.testnet.hiro.so"

# Network identifier - MUST be testnet
STACKS_NETWORK: Final[str] = "testnet"

# ============================================
# USDCx TOKEN CONFIGURATION
# ============================================

# USDCx contract address on testnet
USDCX_CONTRACT_ADDRESS: Final[str] = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
USDCX_CONTRACT_NAME: Final[str] = "usdcx"
USDCX_CONTRACT_ID: Final[str] = f"{USDCX_CONTRACT_ADDRESS}.{USDCX_CONTRACT_NAME}"

# USDCx decimal places (1 USDCx = 1,000,000 base units)
USDCX_DECIMALS: Final[int] = 6

# ============================================
# PAYMENT CONFIGURATION
# ============================================

# Fixed payment amount for MVP: 0.1 USDCx = 100,000 base units
PAYMENT_AMOUNT_BASE_UNITS: Final[int] = 100_000

# SIP-010 transfer function name
SIP010_TRANSFER_FUNCTION: Final[str] = "transfer"

# ============================================
# VERIFICATION REQUIREMENTS
# ============================================

# Minimum anchor block confirmations required
MIN_CONFIRMATIONS: Final[int] = 1

# Transaction must be in "success" status
REQUIRED_TX_STATUS: Final[str] = "success"


@dataclass(frozen=True)
class VerificationConfig:
    """
    Immutable configuration for payment verification.
    Server wallet address is loaded from environment.
    """
    
    # API endpoint
    stacks_api_url: str = STACKS_TESTNET_API
    
    # Network (always testnet for MVP)
    network: str = STACKS_NETWORK
    
    # USDCx contract identifier
    usdcx_contract: str = USDCX_CONTRACT_ID
    
    # Required payment amount in base units
    required_amount: int = PAYMENT_AMOUNT_BASE_UNITS
    
    # Minimum confirmations
    min_confirmations: int = MIN_CONFIRMATIONS
    
    @property
    def server_wallet_address(self) -> str:
        """
        Server wallet address - MUST be set via environment variable.
        Never hardcode this value.
        """
        address = os.environ.get("AGENTPAY_SERVER_WALLET")
        if not address:
            raise EnvironmentError(
                "AGENTPAY_SERVER_WALLET environment variable is not set. "
                "This must be a valid Stacks testnet address."
            )
        # Basic validation: Stacks testnet addresses start with ST
        if not address.startswith("ST"):
            raise ValueError(
                f"Invalid testnet address: {address}. "
                "Stacks testnet addresses must start with 'ST'."
            )
        return address
    
    def validate(self) -> bool:
        """Validate the configuration is complete and correct."""
        # This will raise if server wallet is not configured
        _ = self.server_wallet_address
        
        # Ensure we're on testnet
        if self.network != "testnet":
            raise ValueError(
                f"Network must be 'testnet', got '{self.network}'. "
                "Mainnet is not supported in MVP."
            )
        
        # Ensure USDCx contract is testnet
        if not self.usdcx_contract.startswith("ST"):
            raise ValueError(
                f"USDCx contract must be on testnet (ST prefix), "
                f"got '{self.usdcx_contract}'."
            )
        
        return True
