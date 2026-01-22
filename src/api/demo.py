# AgentPay-USDCx Demo Mode Router
"""
DEMO MODE ONLY - Hackathon demo endpoints.

This module provides:
- Demo agent wallet loading from environment
- Wallet balance reading via Stacks read-only calls
- Demo payment flow orchestration

⚠️ This is NOT production-ready.
⚠️ No user authentication implemented.
⚠️ Single demo agent wallet only.

All transactions are REAL on Stacks testnet.
"""

import os
import time
import asyncio
import threading
import subprocess
import json
from typing import Optional, List
from dataclasses import dataclass, field
from pathlib import Path

import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..agent.stacks_wallet import StacksWallet, STACKS_TESTNET_API
from ..verification.config import USDCX_CONTRACT_ADDRESS, USDCX_CONTRACT_NAME, USDCX_DECIMALS


# ============================================
# DEMO MODE CONFIGURATION
# ============================================

# Demo router - all endpoints prefixed with /demo
router = APIRouter(prefix="/demo", tags=["demo"])

# Concurrency lock for /demo/run - only one demo at a time
_demo_run_lock = threading.Lock()
_demo_in_progress = False

# Minimum STX required for gas fees (in microSTX)
# ~0.01 STX should cover most contract calls
MIN_STX_FOR_GAS = 10_000  # 0.01 STX


# ============================================
# AGENT WALLET LOADER
# ============================================

@dataclass
class AgentWalletConfig:
    """
    Demo agent wallet configuration.
    Loaded from environment variables.
    """
    private_key: str
    address: str
    wallet: Optional[StacksWallet] = None


_demo_agent: Optional[AgentWalletConfig] = None


def _validate_private_key(key: str) -> bool:
    """Validate hex private key format."""
    if not key:
        return False
    try:
        key_bytes = bytes.fromhex(key)
        return len(key_bytes) == 32
    except ValueError:
        return False


def load_demo_agent() -> AgentWalletConfig:
    """
    Load demo agent wallet from environment.
    
    Required env vars:
        AGENTPAY_AGENT_PRIVATE_KEY: 32-byte hex private key
        
    Optional env vars:
        AGENTPAY_AGENT_WALLET: Derived address (auto-derived if not set)
    
    Raises:
        EnvironmentError: If private key is missing or invalid
    """
    global _demo_agent
    
    if _demo_agent is not None:
        return _demo_agent
    
    private_key = os.environ.get("AGENTPAY_AGENT_PRIVATE_KEY", "").strip()
    
    if not private_key:
        raise EnvironmentError(
            "AGENTPAY_AGENT_PRIVATE_KEY environment variable not set. "
            "Demo mode requires a valid 32-byte hex private key."
        )
    
    if not _validate_private_key(private_key):
        raise EnvironmentError(
            "AGENTPAY_AGENT_PRIVATE_KEY is invalid. "
            "Must be a 64-character hex string (32 bytes)."
        )
    
    # Create wallet
    wallet = StacksWallet.from_private_key(private_key)
    
    # Check if address was explicitly set
    env_address = os.environ.get("AGENTPAY_AGENT_WALLET", "").strip()
    
    if env_address:
        # Validate matches derived address
        if env_address != wallet.address:
            raise EnvironmentError(
                f"AGENTPAY_AGENT_WALLET ({env_address}) does not match "
                f"address derived from private key ({wallet.address}). "
                "Either remove AGENTPAY_AGENT_WALLET to auto-derive, "
                "or fix the private key."
            )
        address = env_address
    else:
        address = wallet.address
    
    _demo_agent = AgentWalletConfig(
        private_key=private_key,
        address=address,
        wallet=wallet,
    )
    
    return _demo_agent


def get_server_wallet_address() -> str:
    """Get server wallet address from environment."""
    address = os.environ.get("AGENTPAY_SERVER_WALLET", "").strip()
    if not address:
        raise EnvironmentError("AGENTPAY_SERVER_WALLET environment variable not set")
    if not address.startswith("ST"):
        raise EnvironmentError(f"Invalid testnet address: {address}")
    return address


# ============================================
# WALLET BALANCE READER
# ============================================

def get_usdcx_balance(address: str) -> int:
    """
    Fetch USDCx balance for an address using Stacks read-only call.
    
    Args:
        address: Stacks address (STxxx)
        
    Returns:
        Balance in base units (1 USDCx = 1,000,000 base units)
    """
    url = f"{STACKS_TESTNET_API}/v2/contracts/call-read/{USDCX_CONTRACT_ADDRESS}/{USDCX_CONTRACT_NAME}/get-balance"
    
    # Prepare principal argument
    # Clarity value encoding for principal
    payload = {
        "sender": address,
        "arguments": [
            _encode_principal_for_api(address)
        ]
    }
    
    try:
        response = httpx.post(url, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("okay"):
            return 0
        
        # Parse Clarity response: (ok u<balance>) or (err ...)
        result_hex = data.get("result", "")
        return _parse_balance_response(result_hex)
        
    except Exception:
        # If read fails, try fallback method via balances endpoint
        return _get_balance_fallback(address)


def _encode_principal_for_api(address: str) -> str:
    """Encode principal for read-only API call (hex Clarity value)."""
    from ..agent.stacks_wallet import serialize_principal_standard
    serialized = serialize_principal_standard(address)
    return "0x" + serialized.hex()


def _parse_balance_response(result_hex: str) -> int:
    """
    Parse balance from Clarity response.
    Response format: (ok u<balance>) or (err ...)
    """
    if not result_hex or not result_hex.startswith("0x"):
        return 0
    
    try:
        data = bytes.fromhex(result_hex[2:])
        
        # Check if (ok ...) response - type 0x07
        if len(data) >= 1 and data[0] == 0x07:
            # ok response, next byte is inner type
            if len(data) >= 2 and data[1] == 0x01:
                # uint128
                if len(data) >= 18:
                    return int.from_bytes(data[2:18], 'big')
        
        return 0
    except Exception:
        return 0


def _get_balance_fallback(address: str) -> int:
    """
    Fallback balance check via extended API.
    Less reliable but simpler.
    """
    try:
        url = f"{STACKS_TESTNET_API}/extended/v1/address/{address}/balances"
        response = httpx.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        # Look for USDCx in fungible tokens
        ft = data.get("fungible_tokens", {})
        token_key = f"{USDCX_CONTRACT_ADDRESS}.{USDCX_CONTRACT_NAME}::usdcx-token"
        
        if token_key in ft:
            return int(ft[token_key].get("balance", 0))
        
        return 0
    except Exception:
        return 0


def format_usdcx_balance(base_units: int) -> str:
    """Format base units to human-readable USDCx string."""
    value = base_units / (10 ** USDCX_DECIMALS)
    return f"{value:.2f}"


def get_stx_balance(address: str) -> int:
    """
    Fetch STX balance for an address.
    
    Args:
        address: Stacks address (STxxx)
        
    Returns:
        Balance in microSTX (1 STX = 1,000,000 microSTX)
    """
    try:
        url = f"{STACKS_TESTNET_API}/extended/v1/address/{address}/balances"
        response = httpx.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        return int(data.get("stx", {}).get("balance", 0))
    except Exception:
        return 0


def format_stx_balance(microstx: int) -> str:
    """Format microSTX to human-readable STX string."""
    value = microstx / 1_000_000
    return f"{value:.6f}"


def wait_for_tx_confirmation(txid: str, timeout: int = 300) -> bool:
    """
    Poll Stacks API for transaction confirmation.
    
    Args:
        txid: Transaction ID (with or without 0x prefix)
        timeout: Max seconds to wait
        
    Returns:
        True if confirmed, False if timeout
        
    Raises:
        RuntimeError if transaction failed/aborted
    """
    # Normalize txid
    if txid.startswith('0x'):
        txid = txid[2:]
    
    url = f"{STACKS_TESTNET_API}/extended/v1/tx/0x{txid}"
    start = time.time()
    
    while time.time() - start < timeout:
        try:
            response = httpx.get(url, timeout=30)
            if response.status_code == 200:
                data = response.json()
                status = data.get('tx_status', '')
                
                if status == 'success':
                    return True
                elif status in ('abort_by_response', 'abort_by_post_condition'):
                    raise RuntimeError(f"Transaction aborted: {status}")
                # Still pending, keep polling
        except httpx.HTTPError:
            pass  # Network error, retry
        
        time.sleep(5)  # Poll every 5 seconds
    
    return False  # Timeout


# ============================================
# DEMO FLOW EXECUTOR
# ============================================

@dataclass
class DemoEvent:
    """Single event for frontend display."""
    text: str
    type: str  # 'info' | 'purple' | 'blue' | 'success'


@dataclass
class DemoFlowResult:
    """Result of demo flow execution."""
    success: bool
    events: List[DemoEvent] = field(default_factory=list)
    txid: Optional[str] = None
    error: Optional[str] = None


def execute_demo_flow(api_base_url: str) -> DemoFlowResult:
    """
    Execute the full demo payment flow.
    
    Steps:
    1. Call /v1/analysis (expect 402)
    2. Parse payment requirements
    3. Sign and broadcast USDCx transfer
    4. Wait for confirmation
    5. Retry with X-Payment-Txid
    
    Returns:
        DemoFlowResult with ordered events for frontend display
    """
    events: List[DemoEvent] = []
    
    def log(msg: str, event_type: str = 'info'):
        events.append(DemoEvent(text=f"> {msg}", type=event_type))
    
    try:
        # Load agent
        log("Initializing Lumine...", 'info')
        agent_config = load_demo_agent()
        wallet = agent_config.wallet
        
        if wallet is None:
            return DemoFlowResult(success=False, events=events, error="Wallet not loaded")
        
        # Get balance
        balance = get_usdcx_balance(agent_config.address)
        log(f"Agent balance: {format_usdcx_balance(balance)} USDCx", 'info')
        
        if balance < 100_000:  # 0.1 USDCx minimum
            log("ERROR: Insufficient agent USDCx balance", 'info')
            return DemoFlowResult(
                success=False,
                events=events,
                error="Insufficient agent USDCx balance"
            )
        
        # Pre-check STX balance for gas fees
        stx_balance = get_stx_balance(agent_config.address)
        log(f"Agent STX balance: {format_stx_balance(stx_balance)} STX", 'info')
        
        if stx_balance < MIN_STX_FOR_GAS:
            log("ERROR: Insufficient STX for transaction fees", 'info')
            return DemoFlowResult(
                success=False,
                events=events,
                error="Insufficient STX for transaction fees"
            )
        
        # Step 1: Call API (expect 402)
        log("Calling /v1/analysis", 'info')
        
        with httpx.Client(timeout=30) as client:
            response = client.get(f"{api_base_url}/v1/analysis")
        
        if response.status_code == 200:
            log("200 OK (no payment required)", 'success')
            return DemoFlowResult(success=True, events=events)
        
        if response.status_code != 402:
            log(f"ERROR: Unexpected status {response.status_code}", 'info')
            return DemoFlowResult(
                success=False,
                events=events,
                error=f"Unexpected response: {response.status_code}"
            )
        
        log("402 Payment Required", 'purple')
        
        # Parse payment requirements
        amount = int(response.headers.get("X-Payment-Amount", 0))
        recipient = response.headers.get("X-Payment-Recipient", "")
        
        if not amount or not recipient:
            log("ERROR: Invalid payment requirements", 'info')
            return DemoFlowResult(
                success=False,
                events=events,
                error="Could not parse payment requirements"
            )
        
        log(f"Payment: {format_usdcx_balance(amount)} USDCx to {recipient[:10]}...", 'purple')
        
        # Step 2: Sign and broadcast using Node.js signer
        # (Python stacks_wallet has signing issues, Node.js @stacks/transactions works correctly)
        log("Signing USDCx transfer", 'blue')
        
        try:
            # Find the Node.js signer script
            project_root = Path(__file__).parent.parent.parent
            signer_path = project_root / "usdcx-bridge" / "stacks-signer.js"
            
            if not signer_path.exists():
                raise Exception(f"Node.js signer not found at {signer_path}")
            
            # Get private key from environment
            private_key = os.environ.get("AGENTPAY_AGENT_PRIVATE_KEY", "").strip()
            if not private_key:
                raise Exception("AGENTPAY_AGENT_PRIVATE_KEY not set")
            
            # Call Node.js signer
            result = subprocess.run(
                ["node", str(signer_path), private_key, recipient, str(amount)],
                capture_output=True,
                text=True,
                timeout=60,
                cwd=str(project_root / "usdcx-bridge")
            )
            
            # Parse JSON response
            try:
                signer_result = json.loads(result.stdout.strip())
            except json.JSONDecodeError:
                raise Exception(f"Invalid signer response: {result.stdout} {result.stderr}")
            
            if not signer_result.get("success"):
                raise Exception(signer_result.get("error", "Unknown signer error"))
            
            txid = signer_result["txid"]
            
        except subprocess.TimeoutExpired:
            log("ERROR: Transfer timeout", 'info')
            return DemoFlowResult(
                success=False,
                events=events,
                error="Transfer timed out"
            )
        except Exception as e:
            log(f"ERROR: Transfer failed - {e}", 'info')
            return DemoFlowResult(
                success=False,
                events=events,
                error=f"Transfer failed: {e}"
            )
        
        log("Broadcasting transaction", 'blue')
        log(f"TXID: {txid[:12]}...", 'blue')
        
        # Step 3: Wait for confirmation (poll Stacks API)
        log("Waiting for confirmation", 'blue')
        
        try:
            confirmed = wait_for_tx_confirmation(txid, timeout=300)
            if not confirmed:
                log("ERROR: Confirmation timeout", 'info')
                return DemoFlowResult(
                    success=False,
                    events=events,
                    txid=txid,
                    error="Transaction not confirmed in time"
                )
        except RuntimeError as e:
            log(f"ERROR: Transaction failed - {e}", 'info')
            return DemoFlowResult(
                success=False,
                events=events,
                txid=txid,
                error=str(e)
            )
        
        log("Verified on Stacks ✓", 'success')
        
        # Step 4: Retry with TXID
        log("Retrying API request", 'info')
        
        with httpx.Client(timeout=30) as client:
            response = client.get(
                f"{api_base_url}/v1/analysis",
                headers={"X-Payment-Txid": txid}
            )
        
        if response.status_code == 200:
            log("200 OK — Payload delivered", 'success')
            return DemoFlowResult(
                success=True,
                events=events,
                txid=txid,
            )
        else:
            log(f"ERROR: Retry failed with {response.status_code}", 'info')
            return DemoFlowResult(
                success=False,
                events=events,
                txid=txid,
                error=f"Retry failed: {response.status_code}"
            )
    
    except EnvironmentError as e:
        log(f"ERROR: {e}", 'info')
        return DemoFlowResult(
            success=False,
            events=events,
            error=str(e)
        )
    except Exception as e:
        log(f"ERROR: Unexpected error - {e}", 'info')
        return DemoFlowResult(
            success=False,
            events=events,
            error=str(e)
        )


# ============================================
# DEMO ENDPOINTS
# ============================================

@router.get("/wallets")
async def demo_wallets():
    """
    Get demo wallet information.
    
    Returns agent and server wallet addresses and USDCx balances.
    No authentication required (demo mode).
    """
    try:
        agent_config = load_demo_agent()
        agent_address = agent_config.address
    except EnvironmentError as e:
        return {
            "error": "agent_not_configured",
            "message": str(e),
        }
    
    try:
        server_address = get_server_wallet_address()
    except EnvironmentError as e:
        return {
            "error": "server_not_configured",
            "message": str(e),
        }
    
    # Fetch balances
    agent_balance = get_usdcx_balance(agent_address)
    server_balance = get_usdcx_balance(server_address)
    
    return {
        "agent_wallet": {
            "address": agent_address,
            "balance": format_usdcx_balance(agent_balance),
            "balance_raw": agent_balance,
        },
        "server_wallet": {
            "address": server_address,
            "balance": format_usdcx_balance(server_balance),
            "balance_raw": server_balance,
        },
    }


@router.post("/run")
async def demo_run():
    """
    Run the demo payment flow.
    
    Executes a real USDCx payment from agent to server wallet
    and returns step-by-step events for frontend display.
    
    No authentication required (demo mode).
    
    ⚠️ This triggers a REAL on-chain transaction.
    ⚠️ Only one demo can run at a time (returns 423 if busy).
    """
    global _demo_in_progress
    
    # Concurrency guard: only one demo at a time
    with _demo_run_lock:
        if _demo_in_progress:
            return JSONResponse(
                status_code=423,
                content={
                    "error": "demo_in_progress",
                    "message": "Demo already in progress. Please wait.",
                }
            )
        _demo_in_progress = True
    
    try:
        # Determine API base URL
        # In demo mode, we call ourselves
        api_host = os.environ.get("AGENTPAY_API_HOST", "http://localhost:8000")
        
        # Run demo flow in thread pool to avoid blocking the event loop
        # Use asyncio.wait_for to add a timeout
        loop = asyncio.get_event_loop()
        try:
            result = await asyncio.wait_for(
                loop.run_in_executor(None, execute_demo_flow, api_host),
                timeout=360  # 6 minute max for entire demo
            )
        except asyncio.TimeoutError:
            return {
                "success": False,
                "events": [{"text": "> ERROR: Demo timed out", "type": "info"}],
                "error": "Demo timed out after 6 minutes",
            }
        
        response = {
            "success": result.success,
            "events": [{"text": e.text, "type": e.type} for e in result.events],
        }
        
        if result.txid:
            response["txid"] = result.txid
        
        if result.error:
            response["error"] = result.error
        
        return response
    
    except Exception as e:
        # Catch any unexpected errors
        return {
            "success": False,
            "events": [{"text": f"> ERROR: {str(e)}", "type": "info"}],
            "error": str(e),
        }
    
    finally:
        # Always release the lock, even on error
        with _demo_run_lock:
            _demo_in_progress = False


@router.get("/status")
async def demo_status():
    """
    Check demo mode configuration status.
    
    Returns whether all required environment variables are set.
    """
    issues = []
    
    # Check agent private key
    agent_key = os.environ.get("AGENTPAY_AGENT_PRIVATE_KEY", "")
    if not agent_key:
        issues.append("AGENTPAY_AGENT_PRIVATE_KEY not set")
    elif not _validate_private_key(agent_key):
        issues.append("AGENTPAY_AGENT_PRIVATE_KEY is invalid")
    
    # Check server wallet
    server_wallet = os.environ.get("AGENTPAY_SERVER_WALLET", "")
    if not server_wallet:
        issues.append("AGENTPAY_SERVER_WALLET not set")
    elif not server_wallet.startswith("ST"):
        issues.append("AGENTPAY_SERVER_WALLET must be a testnet address (ST...)")
    
    if issues:
        return {
            "ready": False,
            "issues": issues,
        }
    
    # Derive agent address for display
    try:
        agent_config = load_demo_agent()
        agent_address = agent_config.address
    except Exception as e:
        return {
            "ready": False,
            "issues": [str(e)],
        }
    
    return {
        "ready": True,
        "agent_address": agent_address,
        "server_address": server_wallet,
    }


@router.post("/reset")
async def demo_reset():
    """
    Reset demo lock state.
    
    Use this if a demo run crashed and left the lock stuck.
    """
    global _demo_in_progress
    
    with _demo_run_lock:
        was_locked = _demo_in_progress
        _demo_in_progress = False
    
    return {
        "reset": True,
        "was_locked": was_locked,
    }
