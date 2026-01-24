# @lumine/client

Minimal SDK for autonomous agents consuming paid APIs via HTTP 402.

## What is this?

`@lumine/client` is a lightweight HTTP client wrapper that automatically handles **HTTP 402 Payment Required** responses. When your agent hits a paid endpoint, the client will:

1. Detect the 402 response
2. Trigger the Lumine payment flow
3. Retry your original request

No wallet logic or crypto code in the client — payment execution is handled by the Lumine backend.

## Who is this for?

- **Autonomous agents** that need to consume paid APIs
- **Developers** building AI applications that interact with monetized services
- **Anyone** who wants seamless HTTP 402 payment handling

## Installation

```bash
# Internal package — copy or link from packages/lumine-client
```

## Usage

```typescript
import { createLumineClient } from "@lumine/client";

// Create a client pointing to your Lumine backend
const client = createLumineClient({
  apiBaseUrl: "http://localhost:8000",
});

// Make requests — 402 handling is automatic
const response = await client.get("https://api.example.com/paid-endpoint");
const data = await response.json();

console.log(data); // Your paid content!
```

## How 402 Handling Works

```
Agent                     Paid API                  Lumine Backend
  |                          |                            |
  |-- GET /resource -------->|                            |
  |<-- 402 Payment Required -|                            |
  |                          |                            |
  |-- POST /demo/run ---------------------------------->|
  |<-- Payment Completed --------------------------------|
  |                          |                            |
  |-- GET /resource -------->|                            |
  |<-- 200 OK + Data --------|                            |
```

The client reads payment requirements from response headers:

- `X-Payment-Amount` — Amount required (in base units)
- `X-Payment-Recipient` — Wallet address to pay
- `X-Payment-Network` — Blockchain network (e.g., "stacks-testnet")

## API

### `createLumineClient(config)`

Creates a Lumine client instance.

**Config:**
- `apiBaseUrl` (string) — Base URL of the Lumine backend

**Returns:**
- `get(url, options?)` — Perform a GET request with automatic 402 handling

## Notes

- This is a demo-grade SDK for hackathon/prototype use
- Payment execution uses the existing `/demo/run` endpoint
- No wallet keys or signing happens in the client
