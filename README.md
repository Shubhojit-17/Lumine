# Lumine Protocol

<p align="center">
  <img src="https://img.shields.io/badge/Stacks-Testnet-5546FF?style=for-the-badge" alt="Stacks Testnet" />
  <img src="https://img.shields.io/badge/USDCx-SIP--010-00D4AA?style=for-the-badge" alt="USDCx SIP-010" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
</p>

**Lumine** is a pay-per-request protocol enabling AI agents to make autonomous, real-time micropayments using **USDCx** stablecoins on the **Stacks blockchain**. It implements the HTTP 402 "Payment Required" standard for seamless machine-to-machine commerce.

> 🚧 **Hackathon Project** — Currently deployed on Stacks Testnet only.

---

## 🌟 Overview

Lumine solves the "wallet problem" for autonomous AI agents by enabling:

- **HTTP 402 Payment Flow**: APIs return `402 Payment Required` with payment instructions
- **Autonomous Payments**: Agents sign and broadcast USDCx transfers without human intervention  
- **Instant Verification**: On-chain transaction verification before granting access
- **Stablecoin Settlements**: No volatility — payments are in USDCx (bridged USDC)

### How It Works

```
┌─────────────┐     GET /api/resource     ┌─────────────┐
│   AI Agent  │ ────────────────────────▶ │   Server    │
│             │ ◀──────────────────────── │             │
│             │     402 Payment Required  │             │
│             │     X-Payment-Amount: 100k│             │
│             │     X-Payment-Recipient:  │             │
│             │                           │             │
│   Signs &   │                           │             │
│  Broadcasts │ ──── USDCx Transfer ────▶ │   Stacks    │
│    TXN      │                           │  Blockchain │
│             │                           │             │
│             │     GET /api/resource     │             │
│             │     X-Payment-Txid: 0x... │             │
│             │ ────────────────────────▶ │   Server    │
│             │ ◀──────────────────────── │             │
│             │     200 OK + Payload      │             │
└─────────────┘                           └─────────────┘
```

---

## 🏗️ Architecture

```
lumine/
├── src/
│   ├── api/                    # FastAPI server
│   │   ├── main.py             # API endpoints with 402 payment gating
│   │   ├── demo.py             # Demo mode endpoints
│   │   └── txid_store.py       # Transaction ID deduplication
│   │
│   ├── agent/                  # Agent wallet & signing
│   │   ├── agent.py            # Autonomous agent logic
│   │   └── stacks_wallet.py    # Stacks wallet operations
│   │
│   └── verification/           # Payment verification
│       ├── transaction_verifier.py
│       ├── config.py
│       └── wallet_generator.py
│
├── contracts/
│   └── payment-verifier.clar   # Clarity smart contract (read-only verification)
│
├── frontend/                   # React + Vite + Tailwind landing page
│   └── src/
│       ├── components/
│       │   ├── DemoRun.tsx     # Live demo execution page
│       │   └── ...             # Landing page components
│       └── api/
│           └── demo.ts         # Frontend API helpers
│
├── usdcx-bridge/               # Node.js utilities
│   ├── stacks-signer.js        # Transaction signing (uses @stacks/transactions)
│   └── index.js                # USDCx bridge helper
│
└── tests/                      # Pytest test suite
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- pnpm (recommended) or npm

### 1. Clone & Install

```bash
git clone https://github.com/Shubhojit-17/Lumine.git
cd Lumine

# Python dependencies
python -m venv .venv
.venv\Scripts\Activate.ps1  # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -e .

# Frontend dependencies
cd frontend
pnpm install
cd ..

# Node.js signer dependencies
cd usdcx-bridge
pnpm install
cd ..
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your values:
# - AGENTPAY_SERVER_WALLET: Your testnet address (ST...)
# - AGENTPAY_AGENT_PRIVATE_KEY: 64-char hex private key for demo agent
```

**Generate a new wallet:**
```bash
python -m src.verification.wallet_generator
```

### 3. Fund Wallets on Testnet

1. Get testnet STX from [Stacks Testnet Faucet](https://explorer.stacks.co/sandbox/faucet?chain=testnet)
2. Bridge USDC to USDCx using [xReserve Protocol](https://app.xreserve.io)

### 4. Run the Server

```bash
# Start backend (port 8000)
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

# Start frontend (port 3000) - in another terminal
cd frontend
pnpm dev
```

### 5. Open Demo

Navigate to [http://localhost:3000/demo-run](http://localhost:3000/demo-run) to see the live payment flow.

---

## 📡 API Endpoints

### Payment-Gated Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/analysis` | GET | Sample gated endpoint (requires 0.1 USDCx payment) |

**402 Response Headers:**
```
X-Payment-Required: true
X-Payment-Amount: 100000        # Amount in base units (6 decimals)
X-Payment-Asset: ST1PQ...usdcx  # USDCx contract address
X-Payment-Recipient: ST1DWX...  # Server wallet
X-Payment-Network: stacks-testnet
```

**Authenticated Request:**
```
X-Payment-Txid: 0x097f2f48f951148f23ac05edd7985d489d88badf57c724faaef10801405c8715
```

### Demo Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/demo/wallets` | GET | Get agent & server wallet balances |
| `/demo/run` | POST | Execute full payment demo flow |
| `/demo/reset` | POST | Reset demo lock if stuck |
| `/demo/status` | GET | Check demo configuration status |

---

## 💰 USDCx Token

**Contract:** `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx`

USDCx is a SIP-010 fungible token representing bridged USDC on Stacks testnet via [xReserve Protocol](https://xreserve.io).

| Property | Value |
|----------|-------|
| Decimals | 6 |
| 1 USDCx | 1,000,000 base units |
| Network | Stacks Testnet |

---

## 🔐 Security Notes

⚠️ **NEVER commit private keys to source control!**

- All `.env` files are gitignored
- Private keys should be stored securely (environment variables, secrets manager)
- This is a testnet demo — do not use with real funds

---

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src

# Run specific test file
pytest tests/test_verification.py -v
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Blockchain** | Stacks (Bitcoin L2) |
| **Token** | USDCx (SIP-010) |
| **Backend** | FastAPI + Python 3.10 |
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Signing** | @stacks/transactions (Node.js) |
| **Smart Contract** | Clarity 4 |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

---

## 📬 Contact

Built for the Stacks Hackathon 2026.

- GitHub: [@Shubhojit-17](https://github.com/Shubhojit-17)

---

<p align="center">
  <strong>Lumine</strong> — Enabling autonomous AI commerce on Bitcoin.
</p>
