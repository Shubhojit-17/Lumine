# AgentPay-USDCx FastAPI Server
"""
Payment-gated API using HTTP 402 and USDCx on Stacks testnet.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional

# Load .env file from project root
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from ..verification import TransactionVerifier, VerificationConfig, VerificationResult
from ..verification.transaction_verifier import VerificationError
from .txid_store import txid_store
from .demo import router as demo_router


# ============================================
# CONFIGURATION
# ============================================

# Payment configuration
PAYMENT_AMOUNT = 100_000  # 0.1 USDCx in base units
PAYMENT_ASSET = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx"
PAYMENT_NETWORK = "stacks-testnet"


def get_server_wallet() -> str:
    """Get server wallet from environment."""
    wallet = os.environ.get("AGENTPAY_SERVER_WALLET")
    if not wallet:
        raise RuntimeError("AGENTPAY_SERVER_WALLET environment variable not set")
    return wallet


# ============================================
# FASTAPI APP
# ============================================

app = FastAPI(
    title="AgentPay-USDCx",
    description="Pay-per-request API using USDCx on Stacks testnet",
    version="0.1.0",
)

# Include demo mode router
app.include_router(demo_router)

# CORS middleware to allow frontend requests
# Get allowed origins from environment or use defaults
cors_origins = os.environ.get("CORS_ORIGINS", "").split(",") if os.environ.get("CORS_ORIGINS") else []
cors_origins.extend([
    "http://localhost:3000", 
    "http://127.0.0.1:3000", 
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "https://lumine-teal.vercel.app",  # Production frontend
])
# Remove empty strings
cors_origins = [o.strip() for o in cors_origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Payment-Amount", "X-Payment-Asset", "X-Payment-Recipient", "X-Payment-Network"],
)

# Verifier instance (lazy init)
_verifier: Optional[TransactionVerifier] = None


def get_verifier() -> TransactionVerifier:
    """Get or create the transaction verifier."""
    global _verifier
    if _verifier is None:
        config = VerificationConfig()
        _verifier = TransactionVerifier(config)
    return _verifier


# ============================================
# RESPONSE HELPERS
# ============================================

def payment_required_response(reason: Optional[str] = None) -> Response:
    """
    Build HTTP 402 Payment Required response with x402 headers.
    """
    content = {
        "error": "payment_required",
        "message": reason or "Payment required to access this resource",
        "payment": {
            "amount": PAYMENT_AMOUNT,
            "asset": PAYMENT_ASSET,
            "recipient": get_server_wallet(),
            "network": PAYMENT_NETWORK,
        },
    }
    
    response = JSONResponse(
        status_code=402,
        content=content,
    )
    
    # x402 protocol headers
    response.headers["X-Payment-Amount"] = str(PAYMENT_AMOUNT)
    response.headers["X-Payment-Asset"] = PAYMENT_ASSET
    response.headers["X-Payment-Recipient"] = get_server_wallet()
    response.headers["X-Payment-Network"] = PAYMENT_NETWORK
    
    return response


def conflict_response(txid: str) -> Response:
    """
    Build HTTP 409 Conflict response for reused TXID.
    """
    return JSONResponse(
        status_code=409,
        content={
            "error": "txid_already_used",
            "message": f"Transaction {txid} has already been consumed",
        },
    )


def verification_failed_response(result: VerificationResult) -> Response:
    """
    Build HTTP 402 response for failed verification.
    """
    error_messages = {
        VerificationError.TX_NOT_FOUND: "Transaction not found on chain",
        VerificationError.TX_NOT_CONFIRMED: "Transaction not yet confirmed (wait for anchor block)",
        VerificationError.TX_FAILED: "Transaction failed on chain",
        VerificationError.NOT_CONTRACT_CALL: "Transaction is not a contract call",
        VerificationError.WRONG_CONTRACT: "Payment must be in USDCx",
        VerificationError.WRONG_FUNCTION: "Transaction is not a transfer",
        VerificationError.WRONG_RECIPIENT: "Payment sent to wrong recipient",
        VerificationError.INSUFFICIENT_AMOUNT: "Payment amount insufficient",
        VerificationError.NETWORK_MISMATCH: "Wrong network (testnet required)",
        VerificationError.INVALID_TXID_FORMAT: "Invalid transaction ID format",
        VerificationError.API_ERROR: "Error verifying transaction",
    }
    
    reason = error_messages.get(result.error, result.error_message)
    return payment_required_response(reason)


# ============================================
# ENDPOINTS
# ============================================

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "AgentPay-USDCx"}


@app.get("/v1/analysis")
async def analysis(
    x_payment_txid: Optional[str] = Header(None, alias="X-Payment-Txid"),
):
    """
    Payment-gated analysis endpoint.
    
    Requires USDCx payment on Stacks testnet.
    Include X-Payment-Txid header with confirmed transaction ID.
    """
    
    # Case 1: No payment provided
    if not x_payment_txid:
        return payment_required_response()
    
    txid = x_payment_txid.strip()
    
    # Case 2: Check if TXID already consumed
    if txid_store.is_consumed(txid):
        return conflict_response(txid)
    
    # Case 3: Verify payment on-chain
    verifier = get_verifier()
    result = verifier.verify(txid)
    
    if not result.is_valid:
        return verification_failed_response(result)
    
    # Case 4: Payment verified - mark as consumed and deliver content
    if not txid_store.mark_consumed(txid):
        # Race condition: another request consumed it
        return conflict_response(txid)
    
    # Success - return paid content
    return JSONResponse(
        status_code=200,
        content={
            "status": "paid",
            "data": "mock analysis payload",
            "payment": {
                "txid": result.txid,
                "amount": result.amount,
                "sender": result.sender,
                "block_height": result.block_height,
            },
        },
    )


@app.get("/v1/status")
async def status():
    """
    Server status endpoint (public).
    """
    return {
        "status": "ok",
        "payment": {
            "amount": PAYMENT_AMOUNT,
            "asset": PAYMENT_ASSET,
            "network": PAYMENT_NETWORK,
        },
        "consumed_txids": txid_store.count(),
    }
