# AgentPay-USDCx Autonomous Agent
"""
Autonomous agent that pays for API access using USDCx.
Implements the x402 payment flow.
"""

import os
import httpx
from dataclasses import dataclass
from typing import Optional

from .stacks_wallet import StacksWallet


@dataclass
class PaymentRequirement:
    """Parsed x402 payment requirements from 402 response."""
    amount: int
    asset: str
    recipient: str
    network: str


@dataclass
class AgentResult:
    """Result of agent API call."""
    success: bool
    data: Optional[dict] = None
    txid: Optional[str] = None
    error: Optional[str] = None


class AutonomousAgent:
    """
    Autonomous agent that pays for API access using USDCx.
    
    Flow:
    1. Request API without payment
    2. Parse 402 response for payment requirements
    3. Pay via USDCx transfer
    4. Wait for confirmation
    5. Retry with TXID
    """
    
    def __init__(
        self,
        api_base_url: str,
        wallet: Optional[StacksWallet] = None,
    ):
        """
        Initialize agent.
        
        Args:
            api_base_url: Base URL of the payment-gated API
            wallet: Stacks wallet for payments (loads from env if None)
        """
        self.api_base_url = api_base_url.rstrip("/")
        self.wallet = wallet or StacksWallet.from_env()
        self._client = httpx.Client(timeout=30)
    
    def close(self):
        """Close HTTP client."""
        self._client.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, *args):
        self.close()
    
    def request_analysis(self) -> AgentResult:
        """
        Request analysis endpoint with automatic payment.
        
        Returns:
            AgentResult with success status, data, and payment info
        """
        endpoint = f"{self.api_base_url}/v1/analysis"
        
        # Step 1: Initial request (expect 402)
        print(f"[Agent] Requesting {endpoint}...")
        response = self._client.get(endpoint)
        
        if response.status_code == 200:
            # Already paid or no payment required
            return AgentResult(success=True, data=response.json())
        
        if response.status_code != 402:
            return AgentResult(
                success=False,
                error=f"Unexpected status: {response.status_code}",
            )
        
        # Step 2: Parse payment requirements
        print("[Agent] Received 402 Payment Required")
        payment = self._parse_payment_headers(response)
        
        if not payment:
            return AgentResult(
                success=False,
                error="Could not parse payment requirements",
            )
        
        print(f"[Agent] Payment required: {payment.amount} {payment.asset}")
        print(f"[Agent] Recipient: {payment.recipient}")
        
        # Validate network
        if payment.network != "stacks-testnet":
            return AgentResult(
                success=False,
                error=f"Wrong network: {payment.network}",
            )
        
        # Step 3: Execute payment
        print(f"[Agent] Sending {payment.amount} USDCx from {self.wallet.address}...")
        
        try:
            txid = self.wallet.transfer_usdcx(
                recipient=payment.recipient,
                amount=payment.amount,
            )
        except Exception as e:
            return AgentResult(
                success=False,
                error=f"Payment failed: {e}",
            )
        
        print(f"[Agent] Transaction broadcast: {txid}")
        
        # Step 4: Wait for confirmation
        print("[Agent] Waiting for anchor block confirmation...")
        
        try:
            self.wallet.wait_for_confirmation(txid)
        except TimeoutError as e:
            return AgentResult(
                success=False,
                txid=txid,
                error=str(e),
            )
        except RuntimeError as e:
            return AgentResult(
                success=False,
                txid=txid,
                error=str(e),
            )
        
        print("[Agent] Transaction confirmed!")
        
        # Step 5: Retry with TXID
        print(f"[Agent] Retrying request with X-Payment-Txid...")
        
        response = self._client.get(
            endpoint,
            headers={"X-Payment-Txid": txid},
        )
        
        if response.status_code == 200:
            print("[Agent] Success! Received paid content.")
            return AgentResult(
                success=True,
                data=response.json(),
                txid=txid,
            )
        else:
            return AgentResult(
                success=False,
                txid=txid,
                error=f"Retry failed: {response.status_code} - {response.text}",
            )
    
    def _parse_payment_headers(self, response: httpx.Response) -> Optional[PaymentRequirement]:
        """Parse x402 payment headers from 402 response."""
        try:
            return PaymentRequirement(
                amount=int(response.headers.get("X-Payment-Amount", 0)),
                asset=response.headers.get("X-Payment-Asset", ""),
                recipient=response.headers.get("X-Payment-Recipient", ""),
                network=response.headers.get("X-Payment-Network", ""),
            )
        except (ValueError, TypeError):
            return None


def main():
    """Run agent demo."""
    import sys
    
    # Get API URL from args or default
    api_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    
    print("=" * 60)
    print("AgentPay-USDCx Autonomous Agent")
    print("=" * 60)
    
    # Check environment
    if not os.environ.get("AGENTPAY_AGENT_PRIVATE_KEY"):
        print("ERROR: AGENTPAY_AGENT_PRIVATE_KEY not set")
        print()
        print("Set it with:")
        print('  $env:AGENTPAY_AGENT_PRIVATE_KEY="your_private_key_hex"')
        sys.exit(1)
    
    # Initialize agent
    try:
        with AutonomousAgent(api_url) as agent:
            print(f"Agent wallet: {agent.wallet.address}")
            print(f"API endpoint: {api_url}")
            print()
            
            # Check balance
            stx_balance = agent.wallet.get_stx_balance()
            print(f"STX balance: {stx_balance / 1_000_000:.6f} STX")
            
            if stx_balance < 10000:
                print("WARNING: Low STX balance for gas fees")
            
            print()
            print("-" * 60)
            
            # Execute request
            result = agent.request_analysis()
            
            print("-" * 60)
            print()
            
            if result.success:
                print("✅ SUCCESS")
                print(f"TXID: {result.txid}")
                print(f"Data: {result.data}")
            else:
                print("❌ FAILED")
                print(f"Error: {result.error}")
                if result.txid:
                    print(f"TXID: {result.txid}")
            
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
