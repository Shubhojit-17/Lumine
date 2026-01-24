# @lumine/gateway

Minimal SDK for API providers monetizing endpoints with HTTP 402.

## What is this?

`@lumine/gateway` provides middleware to gate your API endpoints behind payments. When a request comes in without payment proof, the middleware returns **HTTP 402 Payment Required** with payment details in headers.

This enables Lumine-compatible clients to:
1. Receive the 402 response
2. Complete payment on-chain
3. Retry with payment proof

## Who is this for?

- **API providers** who want to monetize endpoints
- **Developers** building paid services for AI agents
- **Anyone** implementing HTTP 402 payment flows

## Installation

```bash
# Internal package — copy or link from packages/lumine-gateway
```

## Usage (Express)

```typescript
import express from "express";
import { requirePayment } from "@lumine/gateway";

const app = express();

// Free endpoint
app.get("/api/free", (req, res) => {
  res.json({ message: "This is free!" });
});

// Paid endpoint — requires 0.1 USDCx
app.get("/api/premium", requirePayment({ amount: "100000" }), (req, res) => {
  res.json({ 
    message: "Premium content unlocked!",
    data: { secret: "valuable-data" }
  });
});

app.listen(3000);
```

## Usage (FastAPI Reference)

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.middleware("http")
async def payment_middleware(request: Request, call_next):
    # Check if this is a paid endpoint
    if request.url.path == "/api/premium":
        payment_txid = request.headers.get("X-Payment-TxId")
        
        if not payment_txid:
            return JSONResponse(
                status_code=402,
                content={"error": "Payment Required"},
                headers={
                    "X-Payment-Amount": "100000",
                    "X-Payment-Recipient": "ST1DWX...",
                    "X-Payment-Network": "stacks-testnet"
                }
            )
    
    return await call_next(request)

@app.get("/api/premium")
async def premium():
    return {"message": "Premium content!"}
```

## How It Works

```
Client                    Your API (with Gateway)
  |                                |
  |-- GET /api/premium ----------->|
  |                                |-- requirePayment() checks headers
  |                                |-- No X-Payment-TxId found
  |<-- 402 Payment Required -------|
  |    + X-Payment-Amount          |
  |    + X-Payment-Recipient       |
  |    + X-Payment-Network         |
  |                                |
  |   [Client completes payment]   |
  |                                |
  |-- GET /api/premium ----------->|
  |    + X-Payment-TxId            |
  |                                |-- requirePayment() checks headers
  |                                |-- Payment proof found → next()
  |<-- 200 OK + Premium Data ------|
```

## Response Headers

When returning 402, the middleware sets:

| Header | Description | Example |
|--------|-------------|---------|
| `X-Payment-Amount` | Amount in base units | `100000` |
| `X-Payment-Recipient` | Wallet address | `ST1DWX...` |
| `X-Payment-Network` | Blockchain network | `stacks-testnet` |

## API

### `requirePayment(config)`

Creates a middleware that gates the endpoint.

**Config:**
- `amount` (string) — Payment amount in base units
- `recipient` (string, optional) — Wallet address (defaults to `AGENTPAY_SERVER_WALLET` env var)
- `network` (string, optional) — Network identifier (defaults to `"stacks-testnet"`)

**Returns:** Express-compatible middleware function

## Notes

- This is a demo-grade SDK for hackathon/prototype use
- Actual payment verification is handled by existing Lumine backend
- The middleware only checks for presence of `X-Payment-TxId` header
- Full transaction verification should be done server-side
