# AgentPay-USDCx Verification Tests
"""
Unit tests for the transaction verification module.
"""

import os
import pytest
from unittest.mock import MagicMock, patch

from src.verification.config import (
    VerificationConfig,
    PAYMENT_AMOUNT_BASE_UNITS,
    USDCX_CONTRACT_ID,
)
from src.verification.transaction_verifier import (
    TransactionVerifier,
    VerificationResult,
    VerificationError,
)


# ============================================
# TEST FIXTURES
# ============================================

@pytest.fixture
def mock_server_wallet():
    """Set up mock server wallet environment variable."""
    os.environ["AGENTPAY_SERVER_WALLET"] = "ST1TESTSERVERWALLET123456789ABCDEFGH"
    yield "ST1TESTSERVERWALLET123456789ABCDEFGH"
    del os.environ["AGENTPAY_SERVER_WALLET"]


@pytest.fixture
def verifier(mock_server_wallet):
    """Create a TransactionVerifier instance."""
    config = VerificationConfig()
    return TransactionVerifier(config)


@pytest.fixture
def valid_tx_response(mock_server_wallet):
    """Mock response for a valid USDCx transfer transaction."""
    return {
        "tx_id": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "tx_status": "success",
        "tx_type": "contract_call",
        "block_height": 12345,
        "contract_call": {
            "contract_id": USDCX_CONTRACT_ID,
            "function_name": "transfer",
            "function_args": [
                {"name": "amount", "repr": "u100000"},
                {"name": "sender", "repr": "'ST1SENDERWALLET123456789ABCDEFGHIJKL"},
                {"name": "recipient", "repr": f"'{mock_server_wallet}"},
                {"name": "memo", "repr": "none"},
            ],
        },
    }


# ============================================
# CONFIG TESTS
# ============================================

class TestVerificationConfig:
    """Tests for VerificationConfig."""
    
    def test_server_wallet_from_env(self, mock_server_wallet):
        """Server wallet should be loaded from environment."""
        config = VerificationConfig()
        assert config.server_wallet_address == mock_server_wallet
    
    def test_server_wallet_missing_raises(self):
        """Missing server wallet should raise EnvironmentError."""
        if "AGENTPAY_SERVER_WALLET" in os.environ:
            del os.environ["AGENTPAY_SERVER_WALLET"]
        
        config = VerificationConfig()
        with pytest.raises(EnvironmentError):
            _ = config.server_wallet_address
    
    def test_mainnet_address_rejected(self):
        """Mainnet addresses (SP prefix) should be rejected."""
        os.environ["AGENTPAY_SERVER_WALLET"] = "SP1MAINNETWALLET"
        
        config = VerificationConfig()
        with pytest.raises(ValueError, match="testnet"):
            _ = config.server_wallet_address
        
        del os.environ["AGENTPAY_SERVER_WALLET"]
    
    def test_payment_amount_is_correct(self):
        """Payment amount should be 100,000 base units (0.1 USDCx)."""
        assert PAYMENT_AMOUNT_BASE_UNITS == 100_000


# ============================================
# TXID VALIDATION TESTS
# ============================================

class TestTxidValidation:
    """Tests for TXID format validation."""
    
    def test_valid_txid_with_prefix(self, verifier):
        """Valid TXID with 0x prefix should pass."""
        txid = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        assert verifier._validate_txid_format(txid) is True
    
    def test_valid_txid_without_prefix(self, verifier):
        """Valid TXID without 0x prefix should pass."""
        txid = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        assert verifier._validate_txid_format(txid) is True
    
    def test_invalid_txid_too_short(self, verifier):
        """TXID with wrong length should fail."""
        txid = "0x1234abcd"
        assert verifier._validate_txid_format(txid) is False
    
    def test_invalid_txid_bad_chars(self, verifier):
        """TXID with invalid characters should fail."""
        txid = "0xGGGG567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        assert verifier._validate_txid_format(txid) is False
    
    def test_normalize_txid_adds_prefix(self, verifier):
        """Normalize should add 0x prefix if missing."""
        txid = "1234567890ABCDEF1234567890abcdef1234567890abcdef1234567890abcdef"
        normalized = verifier._normalize_txid(txid)
        assert normalized.startswith("0x")
        assert normalized == "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"


# ============================================
# VERIFICATION TESTS
# ============================================

class TestTransactionVerification:
    """Tests for full transaction verification."""
    
    def test_invalid_txid_format_fails(self, verifier):
        """Invalid TXID format should fail immediately."""
        result = verifier.verify("not-a-valid-txid")
        
        assert result.is_valid is False
        assert result.error == VerificationError.INVALID_TXID_FORMAT
    
    @patch.object(TransactionVerifier, "_fetch_transaction")
    def test_tx_not_found_fails(self, mock_fetch, verifier):
        """Transaction not found should fail."""
        mock_fetch.return_value = None
        
        result = verifier.verify(
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )
        
        assert result.is_valid is False
        assert result.error == VerificationError.TX_NOT_FOUND
    
    @patch.object(TransactionVerifier, "_fetch_transaction")
    def test_pending_tx_fails(self, mock_fetch, verifier):
        """Pending (mempool) transaction should fail."""
        mock_fetch.return_value = {"tx_status": "pending"}
        
        result = verifier.verify(
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )
        
        assert result.is_valid is False
        assert result.error == VerificationError.TX_NOT_CONFIRMED
    
    @patch.object(TransactionVerifier, "_fetch_transaction")
    def test_failed_tx_fails(self, mock_fetch, verifier):
        """Failed transaction should fail verification."""
        mock_fetch.return_value = {"tx_status": "abort_by_response"}
        
        result = verifier.verify(
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )
        
        assert result.is_valid is False
        assert result.error == VerificationError.TX_FAILED
    
    @patch.object(TransactionVerifier, "_fetch_transaction")
    def test_wrong_contract_fails(self, mock_fetch, verifier):
        """Transaction to wrong contract should fail."""
        mock_fetch.return_value = {
            "tx_status": "success",
            "tx_type": "contract_call",
            "block_height": 100,
            "contract_call": {
                "contract_id": "ST1WRONG.wrongtoken",
                "function_name": "transfer",
            },
        }
        
        result = verifier.verify(
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )
        
        assert result.is_valid is False
        assert result.error == VerificationError.WRONG_CONTRACT
    
    @patch.object(TransactionVerifier, "_fetch_transaction")
    def test_wrong_recipient_fails(self, mock_fetch, verifier, mock_server_wallet):
        """Transaction to wrong recipient should fail."""
        mock_fetch.return_value = {
            "tx_status": "success",
            "tx_type": "contract_call",
            "block_height": 100,
            "contract_call": {
                "contract_id": USDCX_CONTRACT_ID,
                "function_name": "transfer",
                "function_args": [
                    {"name": "amount", "repr": "u100000"},
                    {"name": "sender", "repr": "'ST1SENDER"},
                    {"name": "recipient", "repr": "'ST1WRONGRECIPIENT"},
                ],
            },
        }
        
        result = verifier.verify(
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )
        
        assert result.is_valid is False
        assert result.error == VerificationError.WRONG_RECIPIENT
    
    @patch.object(TransactionVerifier, "_fetch_transaction")
    def test_insufficient_amount_fails(self, mock_fetch, verifier, mock_server_wallet):
        """Underpayment should fail."""
        mock_fetch.return_value = {
            "tx_status": "success",
            "tx_type": "contract_call",
            "block_height": 100,
            "contract_call": {
                "contract_id": USDCX_CONTRACT_ID,
                "function_name": "transfer",
                "function_args": [
                    {"name": "amount", "repr": "u50000"},  # Only 0.05 USDCx
                    {"name": "sender", "repr": "'ST1SENDER"},
                    {"name": "recipient", "repr": f"'{mock_server_wallet}"},
                ],
            },
        }
        
        result = verifier.verify(
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )
        
        assert result.is_valid is False
        assert result.error == VerificationError.INSUFFICIENT_AMOUNT
    
    @patch.object(TransactionVerifier, "_fetch_transaction")
    def test_valid_transaction_succeeds(self, mock_fetch, verifier, valid_tx_response):
        """Valid transaction should pass all checks."""
        mock_fetch.return_value = valid_tx_response
        
        result = verifier.verify(
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )
        
        assert result.is_valid is True
        assert result.error is None
        assert result.amount == 100000
        assert result.block_height == 12345
    
    @patch.object(TransactionVerifier, "_fetch_transaction")
    def test_overpayment_succeeds(self, mock_fetch, verifier, mock_server_wallet):
        """Overpayment should be accepted."""
        mock_fetch.return_value = {
            "tx_status": "success",
            "tx_type": "contract_call",
            "block_height": 100,
            "contract_call": {
                "contract_id": USDCX_CONTRACT_ID,
                "function_name": "transfer",
                "function_args": [
                    {"name": "amount", "repr": "u200000"},  # 0.2 USDCx
                    {"name": "sender", "repr": "'ST1SENDER"},
                    {"name": "recipient", "repr": f"'{mock_server_wallet}"},
                ],
            },
        }
        
        result = verifier.verify(
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )
        
        assert result.is_valid is True
        assert result.amount == 200000


# ============================================
# NETWORK VALIDATION TESTS
# ============================================

class TestNetworkValidation:
    """Tests for network safety checks."""
    
    def test_testnet_address_detected(self, verifier):
        """Testnet addresses (ST prefix) should be detected."""
        assert verifier.is_testnet_address("ST1ABC123") is True
        assert verifier.is_testnet_address("SP1ABC123") is False
    
    def test_mainnet_address_detected(self, verifier):
        """Mainnet addresses (SP prefix) should be detected."""
        assert verifier.is_mainnet_address("SP1ABC123") is True
        assert verifier.is_mainnet_address("ST1ABC123") is False


# ============================================
# VERIFICATION RESULT TESTS
# ============================================

class TestVerificationResult:
    """Tests for VerificationResult dataclass."""
    
    def test_success_result(self):
        """Success result should have valid=True and no error."""
        result = VerificationResult.success(
            txid="0xabc",
            sender="ST1SENDER",
            recipient="ST1RECIPIENT",
            amount=100000,
            block_height=123,
        )
        
        assert result.is_valid is True
        assert result.error is None
        assert result.txid == "0xabc"
        assert result.amount == 100000
    
    def test_failure_result(self):
        """Failure result should have valid=False and error info."""
        result = VerificationResult.failure(
            VerificationError.WRONG_RECIPIENT,
            "Wrong recipient address",
        )
        
        assert result.is_valid is False
        assert result.error == VerificationError.WRONG_RECIPIENT
        assert "Wrong recipient" in result.error_message
