# AgentPay-USDCx Agent Tests
"""
Unit tests for the autonomous agent.
"""

import os
import pytest
from unittest.mock import MagicMock, patch

# Set env before imports
os.environ["AGENTPAY_AGENT_PRIVATE_KEY"] = "0" * 64

from src.agent.agent import AutonomousAgent, PaymentRequirement, AgentResult
from src.agent.stacks_wallet import StacksWallet


# ============================================
# FIXTURES
# ============================================

@pytest.fixture
def mock_wallet():
    """Create mock wallet."""
    wallet = MagicMock(spec=StacksWallet)
    wallet.address = "ST1TESTAGENT123456789ABCDEFGHIJ"
    wallet.get_stx_balance.return_value = 1_000_000
    wallet.transfer_usdcx.return_value = "0x" + "a" * 64
    wallet.wait_for_confirmation.return_value = True
    return wallet


@pytest.fixture
def agent(mock_wallet):
    """Create agent with mock wallet."""
    return AutonomousAgent(
        api_base_url="http://localhost:8000",
        wallet=mock_wallet,
    )


# ============================================
# PAYMENT PARSING TESTS
# ============================================

class TestPaymentParsing:
    """Tests for x402 header parsing."""
    
    def test_parse_valid_headers(self, agent):
        """Valid 402 headers should parse correctly."""
        mock_response = MagicMock()
        mock_response.headers = {
            "X-Payment-Amount": "100000",
            "X-Payment-Asset": "ST1PQ...usdcx",
            "X-Payment-Recipient": "ST1SERVER",
            "X-Payment-Network": "stacks-testnet",
        }
        
        payment = agent._parse_payment_headers(mock_response)
        
        assert payment is not None
        assert payment.amount == 100000
        assert payment.network == "stacks-testnet"
    
    def test_parse_missing_headers(self, agent):
        """Missing headers should return None or zero values."""
        mock_response = MagicMock()
        mock_response.headers = {}
        
        payment = agent._parse_payment_headers(mock_response)
        
        assert payment is not None
        assert payment.amount == 0


# ============================================
# AGENT FLOW TESTS
# ============================================

class TestAgentFlow:
    """Tests for agent payment flow."""
    
    @patch("httpx.Client.get")
    def test_already_paid_returns_success(self, mock_get, agent):
        """200 response should return success immediately."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "paid", "data": "test"}
        mock_get.return_value = mock_response
        
        result = agent.request_analysis()
        
        assert result.success is True
        assert result.data["status"] == "paid"
    
    @patch("httpx.Client.get")
    def test_402_triggers_payment(self, mock_get, agent, mock_wallet):
        """402 should trigger payment flow."""
        # First call: 402
        mock_402 = MagicMock()
        mock_402.status_code = 402
        mock_402.headers = {
            "X-Payment-Amount": "100000",
            "X-Payment-Asset": "usdcx",
            "X-Payment-Recipient": "ST1SERVER",
            "X-Payment-Network": "stacks-testnet",
        }
        
        # Second call: 200
        mock_200 = MagicMock()
        mock_200.status_code = 200
        mock_200.json.return_value = {"status": "paid"}
        
        mock_get.side_effect = [mock_402, mock_200]
        
        result = agent.request_analysis()
        
        assert result.success is True
        assert mock_wallet.transfer_usdcx.called
        assert mock_wallet.wait_for_confirmation.called
    
    @patch("httpx.Client.get")
    def test_wrong_network_fails(self, mock_get, agent):
        """Wrong network should fail."""
        mock_402 = MagicMock()
        mock_402.status_code = 402
        mock_402.headers = {
            "X-Payment-Amount": "100000",
            "X-Payment-Asset": "usdcx",
            "X-Payment-Recipient": "SP1SERVER",
            "X-Payment-Network": "stacks-mainnet",
        }
        mock_get.return_value = mock_402
        
        result = agent.request_analysis()
        
        assert result.success is False
        assert "network" in result.error.lower()


# ============================================
# WALLET TESTS
# ============================================

class TestStacksWallet:
    """Tests for wallet functionality."""
    
    def test_address_derivation(self):
        """Wallet should derive correct testnet address."""
        # Use a valid test key (not all zeros - that's invalid for secp256k1)
        wallet = StacksWallet.from_private_key("0" * 63 + "1")
        
        assert wallet.address.startswith("ST")
        assert len(wallet.public_key) == 33
    
    def test_missing_env_raises(self):
        """Missing env var should raise."""
        # Temporarily remove env var
        key = os.environ.pop("AGENTPAY_AGENT_PRIVATE_KEY", None)
        
        try:
            with pytest.raises(EnvironmentError):
                StacksWallet.from_env()
        finally:
            if key:
                os.environ["AGENTPAY_AGENT_PRIVATE_KEY"] = key
