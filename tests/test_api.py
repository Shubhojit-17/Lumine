# AgentPay-USDCx API Tests
"""
Unit tests for the FastAPI payment-gated server.
"""

import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Set env before importing app
os.environ["AGENTPAY_SERVER_WALLET"] = "ST1TESTSERVERWALLET123456789ABCDEFGH"

from src.api.main import app, PAYMENT_AMOUNT, PAYMENT_ASSET, PAYMENT_NETWORK
from src.api.txid_store import txid_store
from src.verification.transaction_verifier import VerificationResult, VerificationError


@pytest.fixture
def client():
    """Create test client and reset state."""
    txid_store.clear()
    return TestClient(app)


@pytest.fixture
def valid_verification_result():
    """Mock successful verification result."""
    return VerificationResult.success(
        txid="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        sender="ST1SENDER123456789ABCDEFGHIJKLMNOP",
        recipient="ST1TESTSERVERWALLET123456789ABCDEFGH",
        amount=100000,
        block_height=12345,
    )


# ============================================
# HEALTH CHECK TESTS
# ============================================

class TestHealthCheck:
    """Tests for root endpoint."""
    
    def test_root_returns_ok(self, client):
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


# ============================================
# 402 PAYMENT REQUIRED TESTS
# ============================================

class TestPaymentRequired:
    """Tests for 402 responses."""
    
    def test_no_txid_returns_402(self, client):
        """Missing X-Payment-Txid should return 402."""
        response = client.get("/v1/analysis")
        
        assert response.status_code == 402
        assert response.json()["error"] == "payment_required"
    
    def test_402_includes_payment_headers(self, client):
        """402 response must include x402 headers."""
        response = client.get("/v1/analysis")
        
        assert response.headers["X-Payment-Amount"] == str(PAYMENT_AMOUNT)
        assert response.headers["X-Payment-Asset"] == PAYMENT_ASSET
        assert response.headers["X-Payment-Recipient"] == "ST1TESTSERVERWALLET123456789ABCDEFGH"
        assert response.headers["X-Payment-Network"] == PAYMENT_NETWORK
    
    def test_402_includes_payment_body(self, client):
        """402 response body should include payment details."""
        response = client.get("/v1/analysis")
        data = response.json()
        
        assert data["payment"]["amount"] == PAYMENT_AMOUNT
        assert data["payment"]["asset"] == PAYMENT_ASSET
        assert data["payment"]["network"] == PAYMENT_NETWORK


# ============================================
# TXID VALIDATION TESTS
# ============================================

class TestTxidValidation:
    """Tests for TXID handling."""
    
    @patch("src.api.main.get_verifier")
    def test_invalid_txid_format_returns_402(self, mock_get_verifier, client):
        """Invalid TXID format should return 402."""
        mock_verifier = MagicMock()
        mock_verifier.verify.return_value = VerificationResult.failure(
            VerificationError.INVALID_TXID_FORMAT,
            "Invalid TXID format"
        )
        mock_get_verifier.return_value = mock_verifier
        
        response = client.get(
            "/v1/analysis",
            headers={"X-Payment-Txid": "not-a-valid-txid"}
        )
        
        assert response.status_code == 402
    
    @patch("src.api.main.get_verifier")
    def test_tx_not_found_returns_402(self, mock_get_verifier, client):
        """Transaction not on chain should return 402."""
        mock_verifier = MagicMock()
        mock_verifier.verify.return_value = VerificationResult.failure(
            VerificationError.TX_NOT_FOUND,
            "Transaction not found"
        )
        mock_get_verifier.return_value = mock_verifier
        
        response = client.get(
            "/v1/analysis",
            headers={"X-Payment-Txid": "0x" + "a" * 64}
        )
        
        assert response.status_code == 402


# ============================================
# SINGLE-USE TXID TESTS
# ============================================

class TestSingleUseTxid:
    """Tests for TXID single-use enforcement."""
    
    @patch("src.api.main.get_verifier")
    def test_reused_txid_returns_409(self, mock_get_verifier, client, valid_verification_result):
        """Reusing a TXID should return 409 Conflict."""
        mock_verifier = MagicMock()
        mock_verifier.verify.return_value = valid_verification_result
        mock_get_verifier.return_value = mock_verifier
        
        txid = "0x" + "a" * 64
        
        # First request succeeds
        response1 = client.get(
            "/v1/analysis",
            headers={"X-Payment-Txid": txid}
        )
        assert response1.status_code == 200
        
        # Second request with same TXID fails
        response2 = client.get(
            "/v1/analysis",
            headers={"X-Payment-Txid": txid}
        )
        assert response2.status_code == 409
        assert response2.json()["error"] == "txid_already_used"
    
    @patch("src.api.main.get_verifier")
    def test_different_txids_both_succeed(self, mock_get_verifier, client, valid_verification_result):
        """Different TXIDs should each work once."""
        mock_verifier = MagicMock()
        mock_verifier.verify.return_value = valid_verification_result
        mock_get_verifier.return_value = mock_verifier
        
        response1 = client.get(
            "/v1/analysis",
            headers={"X-Payment-Txid": "0x" + "a" * 64}
        )
        assert response1.status_code == 200
        
        response2 = client.get(
            "/v1/analysis",
            headers={"X-Payment-Txid": "0x" + "b" * 64}
        )
        assert response2.status_code == 200


# ============================================
# SUCCESS RESPONSE TESTS
# ============================================

class TestSuccessResponse:
    """Tests for successful payment verification."""
    
    @patch("src.api.main.get_verifier")
    def test_valid_payment_returns_200(self, mock_get_verifier, client, valid_verification_result):
        """Valid payment should return 200 with payload."""
        mock_verifier = MagicMock()
        mock_verifier.verify.return_value = valid_verification_result
        mock_get_verifier.return_value = mock_verifier
        
        response = client.get(
            "/v1/analysis",
            headers={"X-Payment-Txid": "0x" + "a" * 64}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "paid"
        assert "data" in data
        assert data["payment"]["amount"] == 100000
    
    @patch("src.api.main.get_verifier")
    def test_response_includes_payment_details(self, mock_get_verifier, client, valid_verification_result):
        """Success response should include payment verification details."""
        mock_verifier = MagicMock()
        mock_verifier.verify.return_value = valid_verification_result
        mock_get_verifier.return_value = mock_verifier
        
        response = client.get(
            "/v1/analysis",
            headers={"X-Payment-Txid": "0x" + "a" * 64}
        )
        
        data = response.json()
        assert data["payment"]["txid"] is not None
        assert data["payment"]["sender"] is not None
        assert data["payment"]["block_height"] is not None


# ============================================
# VERIFICATION FAILURE TESTS
# ============================================

class TestVerificationFailures:
    """Tests for various verification failure cases."""
    
    @patch("src.api.main.get_verifier")
    def test_pending_tx_returns_402(self, mock_get_verifier, client):
        """Mempool-only transaction should return 402."""
        mock_verifier = MagicMock()
        mock_verifier.verify.return_value = VerificationResult.failure(
            VerificationError.TX_NOT_CONFIRMED,
            "Transaction pending in mempool"
        )
        mock_get_verifier.return_value = mock_verifier
        
        response = client.get(
            "/v1/analysis",
            headers={"X-Payment-Txid": "0x" + "a" * 64}
        )
        
        assert response.status_code == 402
    
    @patch("src.api.main.get_verifier")
    def test_wrong_recipient_returns_402(self, mock_get_verifier, client):
        """Payment to wrong address should return 402."""
        mock_verifier = MagicMock()
        mock_verifier.verify.return_value = VerificationResult.failure(
            VerificationError.WRONG_RECIPIENT,
            "Wrong recipient"
        )
        mock_get_verifier.return_value = mock_verifier
        
        response = client.get(
            "/v1/analysis",
            headers={"X-Payment-Txid": "0x" + "a" * 64}
        )
        
        assert response.status_code == 402
    
    @patch("src.api.main.get_verifier")
    def test_insufficient_amount_returns_402(self, mock_get_verifier, client):
        """Underpayment should return 402."""
        mock_verifier = MagicMock()
        mock_verifier.verify.return_value = VerificationResult.failure(
            VerificationError.INSUFFICIENT_AMOUNT,
            "Amount insufficient"
        )
        mock_get_verifier.return_value = mock_verifier
        
        response = client.get(
            "/v1/analysis",
            headers={"X-Payment-Txid": "0x" + "a" * 64}
        )
        
        assert response.status_code == 402
