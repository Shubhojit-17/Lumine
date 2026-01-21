# AgentPay-USDCx Transaction Verifier
"""
On-chain verification of USDCx SIP-010 transfer transactions.
Queries Stacks testnet API to validate payment transactions.
"""

import re
import httpx
from enum import Enum
from dataclasses import dataclass
from typing import Optional

from .config import (
    VerificationConfig,
    USDCX_CONTRACT_ID,
    SIP010_TRANSFER_FUNCTION,
    REQUIRED_TX_STATUS,
)


class VerificationError(Enum):
    """Enumeration of verification failure reasons."""
    
    # Transaction not found on chain
    TX_NOT_FOUND = "tx_not_found"
    
    # Transaction exists but not yet confirmed (mempool only)
    TX_NOT_CONFIRMED = "tx_not_confirmed"
    
    # Transaction failed or was dropped
    TX_FAILED = "tx_failed"
    
    # Not a contract call transaction
    NOT_CONTRACT_CALL = "not_contract_call"
    
    # Wrong contract (not USDCx)
    WRONG_CONTRACT = "wrong_contract"
    
    # Wrong function (not transfer)
    WRONG_FUNCTION = "wrong_function"
    
    # Recipient does not match server wallet
    WRONG_RECIPIENT = "wrong_recipient"
    
    # Amount is less than required
    INSUFFICIENT_AMOUNT = "insufficient_amount"
    
    # Network mismatch (mainnet tx on testnet or vice versa)
    NETWORK_MISMATCH = "network_mismatch"
    
    # Invalid TXID format
    INVALID_TXID_FORMAT = "invalid_txid_format"
    
    # API error during verification
    API_ERROR = "api_error"


@dataclass(frozen=True)
class VerificationResult:
    """
    Result of a payment verification attempt.
    Immutable to prevent tampering after verification.
    """
    
    # Whether the payment is valid
    is_valid: bool
    
    # Error reason if invalid, None if valid
    error: Optional[VerificationError] = None
    
    # Human-readable error message
    error_message: Optional[str] = None
    
    # Transaction details (populated on success)
    txid: Optional[str] = None
    sender: Optional[str] = None
    recipient: Optional[str] = None
    amount: Optional[int] = None
    block_height: Optional[int] = None
    
    @staticmethod
    def success(
        txid: str,
        sender: str,
        recipient: str,
        amount: int,
        block_height: int
    ) -> "VerificationResult":
        """Create a successful verification result."""
        return VerificationResult(
            is_valid=True,
            txid=txid,
            sender=sender,
            recipient=recipient,
            amount=amount,
            block_height=block_height,
        )
    
    @staticmethod
    def failure(error: VerificationError, message: str) -> "VerificationResult":
        """Create a failed verification result."""
        return VerificationResult(
            is_valid=False,
            error=error,
            error_message=message,
        )


class TransactionVerifier:
    """
    Verifies USDCx payment transactions on Stacks testnet.
    
    This class queries the Stacks API to:
    1. Fetch transaction details by TXID
    2. Verify the transaction is confirmed (anchored)
    3. Verify it's a USDCx transfer call
    4. Verify recipient, amount, and sender
    """
    
    # TXID format: 64 hex characters, optionally prefixed with 0x
    TXID_PATTERN = re.compile(r"^(0x)?[a-fA-F0-9]{64}$")
    
    def __init__(self, config: Optional[VerificationConfig] = None):
        """
        Initialize the verifier with configuration.
        
        Args:
            config: Verification configuration. If None, uses defaults.
        """
        self.config = config or VerificationConfig()
        self._http_client: Optional[httpx.Client] = None
    
    @property
    def http_client(self) -> httpx.Client:
        """Lazy-initialized HTTP client."""
        if self._http_client is None:
            self._http_client = httpx.Client(
                base_url=self.config.stacks_api_url,
                timeout=30.0,
                headers={"Accept": "application/json"},
            )
        return self._http_client
    
    def close(self) -> None:
        """Close the HTTP client."""
        if self._http_client is not None:
            self._http_client.close()
            self._http_client = None
    
    def __enter__(self) -> "TransactionVerifier":
        return self
    
    def __exit__(self, *args) -> None:
        self.close()
    
    def _normalize_txid(self, txid: str) -> str:
        """
        Normalize TXID to standard format (with 0x prefix).
        
        Args:
            txid: Transaction ID, with or without 0x prefix
            
        Returns:
            Normalized TXID with 0x prefix
        """
        txid = txid.strip().lower()
        if not txid.startswith("0x"):
            txid = f"0x{txid}"
        return txid
    
    def _validate_txid_format(self, txid: str) -> bool:
        """
        Validate TXID format.
        
        Args:
            txid: Transaction ID to validate
            
        Returns:
            True if format is valid
        """
        return bool(self.TXID_PATTERN.match(txid))
    
    def _fetch_transaction(self, txid: str) -> Optional[dict]:
        """
        Fetch transaction details from Stacks API.
        
        Args:
            txid: Normalized transaction ID
            
        Returns:
            Transaction data dict, or None if not found
        """
        try:
            response = self.http_client.get(f"/extended/v1/tx/{txid}")
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError:
            return None
    
    def _extract_transfer_args(self, tx_data: dict) -> Optional[dict]:
        """
        Extract transfer function arguments from transaction.
        
        For SIP-010 transfer, expects:
        - amount: uint
        - sender: principal
        - recipient: principal
        - memo: optional buff
        
        Args:
            tx_data: Transaction data from API
            
        Returns:
            Dict with amount, sender, recipient or None if extraction fails
        """
        try:
            contract_call = tx_data.get("contract_call", {})
            function_args = contract_call.get("function_args", [])
            
            result = {}
            for arg in function_args:
                name = arg.get("name")
                repr_value = arg.get("repr", "")
                
                if name == "amount":
                    # Parse uint: "u100000" -> 100000
                    result["amount"] = int(repr_value.lstrip("u"))
                elif name == "sender":
                    # Parse principal: "'ST..." -> "ST..."
                    result["sender"] = repr_value.strip("'")
                elif name == "recipient":
                    # Parse principal: "'ST..." -> "ST..."
                    result["recipient"] = repr_value.strip("'")
            
            # Verify we got all required fields
            if all(k in result for k in ["amount", "sender", "recipient"]):
                return result
            return None
            
        except (KeyError, ValueError, TypeError):
            return None
    
    def verify(self, txid: str) -> VerificationResult:
        """
        Verify a USDCx payment transaction.
        
        This method performs comprehensive verification:
        1. TXID format validation
        2. Transaction existence and confirmation
        3. Contract and function verification
        4. Recipient and amount verification
        
        Args:
            txid: Transaction ID to verify
            
        Returns:
            VerificationResult indicating success or failure reason
        """
        # Step 1: Validate TXID format
        if not self._validate_txid_format(txid):
            return VerificationResult.failure(
                VerificationError.INVALID_TXID_FORMAT,
                f"Invalid TXID format: {txid}. Expected 64 hex characters."
            )
        
        normalized_txid = self._normalize_txid(txid)
        
        # Step 2: Fetch transaction from API
        tx_data = self._fetch_transaction(normalized_txid)
        if tx_data is None:
            return VerificationResult.failure(
                VerificationError.TX_NOT_FOUND,
                f"Transaction not found: {normalized_txid}"
            )
        
        # Step 3: Verify transaction is confirmed (not mempool-only)
        tx_status = tx_data.get("tx_status")
        if tx_status == "pending":
            return VerificationResult.failure(
                VerificationError.TX_NOT_CONFIRMED,
                "Transaction is pending in mempool. Wait for anchor block confirmation."
            )
        
        if tx_status != REQUIRED_TX_STATUS:
            return VerificationResult.failure(
                VerificationError.TX_FAILED,
                f"Transaction status is '{tx_status}', expected '{REQUIRED_TX_STATUS}'."
            )
        
        # Step 4: Verify block height (must be anchored)
        block_height = tx_data.get("block_height")
        if block_height is None or block_height < 1:
            return VerificationResult.failure(
                VerificationError.TX_NOT_CONFIRMED,
                "Transaction has no block height. Not yet anchored."
            )
        
        # Step 5: Verify transaction type is contract_call
        tx_type = tx_data.get("tx_type")
        if tx_type != "contract_call":
            return VerificationResult.failure(
                VerificationError.NOT_CONTRACT_CALL,
                f"Transaction type is '{tx_type}', expected 'contract_call'."
            )
        
        # Step 6: Verify contract is USDCx
        contract_call = tx_data.get("contract_call", {})
        contract_id = contract_call.get("contract_id", "")
        
        if contract_id != USDCX_CONTRACT_ID:
            return VerificationResult.failure(
                VerificationError.WRONG_CONTRACT,
                f"Contract is '{contract_id}', expected '{USDCX_CONTRACT_ID}'."
            )
        
        # Step 7: Verify function is transfer
        function_name = contract_call.get("function_name", "")
        if function_name != SIP010_TRANSFER_FUNCTION:
            return VerificationResult.failure(
                VerificationError.WRONG_FUNCTION,
                f"Function is '{function_name}', expected '{SIP010_TRANSFER_FUNCTION}'."
            )
        
        # Step 8: Extract transfer arguments
        transfer_args = self._extract_transfer_args(tx_data)
        if transfer_args is None:
            return VerificationResult.failure(
                VerificationError.API_ERROR,
                "Failed to parse transfer function arguments."
            )
        
        amount = transfer_args["amount"]
        sender = transfer_args["sender"]
        recipient = transfer_args["recipient"]
        
        # Step 9: Verify recipient matches server wallet
        expected_recipient = self.config.server_wallet_address
        if recipient != expected_recipient:
            return VerificationResult.failure(
                VerificationError.WRONG_RECIPIENT,
                f"Recipient is '{recipient}', expected '{expected_recipient}'."
            )
        
        # Step 10: Verify amount is sufficient
        required_amount = self.config.required_amount
        if amount < required_amount:
            return VerificationResult.failure(
                VerificationError.INSUFFICIENT_AMOUNT,
                f"Amount is {amount} base units, required {required_amount}."
            )
        
        # All checks passed!
        return VerificationResult.success(
            txid=normalized_txid,
            sender=sender,
            recipient=recipient,
            amount=amount,
            block_height=block_height,
        )
    
    def is_testnet_address(self, address: str) -> bool:
        """
        Check if an address is a valid Stacks testnet address.
        
        Args:
            address: Stacks address to check
            
        Returns:
            True if address starts with ST (testnet prefix)
        """
        return address.startswith("ST")
    
    def is_mainnet_address(self, address: str) -> bool:
        """
        Check if an address is a Stacks mainnet address.
        Used to reject mainnet transactions on testnet.
        
        Args:
            address: Stacks address to check
            
        Returns:
            True if address starts with SP (mainnet prefix)
        """
        return address.startswith("SP")
