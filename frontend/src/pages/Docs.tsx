import React from 'react';
import { Link } from 'react-router-dom';

// Reusable code block component
function CodeBlock({ children, language = 'typescript' }: { children: string; language?: string }) {
  return (
    <pre className="bg-black/50 border border-white/10 rounded-lg p-4 overflow-x-auto text-sm font-mono text-gray-300">
      <code>{children}</code>
    </pre>
  );
}

// Section container with glass effect
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16">
      <h2 className="text-2xl font-bold text-white mb-6 font-mono">{title}</h2>
      <div className="space-y-4 text-gray-300 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export function Docs() {
  return (
    <main className="w-full min-h-screen bg-[#0B0E14] text-white">
      {/* Grain Texture Overlay */}
      <div 
        className="fixed inset-0 z-50 pointer-events-none opacity-20 mix-blend-overlay"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1498248529262-f5084e1d0d36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdWJ0bGUlMjBkYXJrJTIwZ3JhaW4lMjB0ZXh0dXJlJTIwbm9pc2UlMjBiYWNrZ3JvdW5kfGVufDF8fHx8MTc2OTAyNDU5Mnww&ixlib=rb-4.1.0&q=80&w=1080')` }}
      />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-40 px-6 py-6 flex justify-between items-center bg-[#0B0E14]/80 backdrop-blur-sm border-b border-white/5">
        <Link to="/" className="font-mono font-bold text-xl tracking-tighter hover:text-[#BFFF00] transition-colors">Lumine</Link>
        <div className="flex items-center gap-4">
          <Link to="/docs" className="text-sm font-mono text-[#BFFF00] transition-colors">Docs</Link>
          <a href="https://github.com/Shubhojit-17/Lumine" target="_blank" rel="noopener noreferrer" className="text-sm font-mono text-gray-400 hover:text-white transition-colors">GitHub</a>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 pt-24 pb-16 px-6 max-w-4xl mx-auto">
        {/* Page Header */}
        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-mono">Lumine Documentation</h1>
          <p className="text-xl text-gray-400">Learn how to integrate pay-per-request APIs with on-chain settlement.</p>
        </header>

        {/* Table of Contents */}
        <nav className="mb-16 p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
          <h3 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-4">Contents</h3>
          <ul className="space-y-2 text-gray-300">
            <li><a href="#introduction" className="hover:text-[#BFFF00] transition-colors">1. Introduction</a></li>
            <li><a href="#x402-flow" className="hover:text-[#BFFF00] transition-colors">2. Core Concept: x402 Payment Flow</a></li>
            <li><a href="#getting-started" className="hover:text-[#BFFF00] transition-colors">3. Getting Started (Demo)</a></li>
            <li><a href="#client-sdk" className="hover:text-[#BFFF00] transition-colors">4. Using Lumine as an API Consumer</a></li>
            <li><a href="#gateway-sdk" className="hover:text-[#BFFF00] transition-colors">5. Using Lumine as an API Provider</a></li>
            <li><a href="#demo-mode" className="hover:text-[#BFFF00] transition-colors">6. Demo Mode Explanation</a></li>
            <li><a href="#faq" className="hover:text-[#BFFF00] transition-colors">7. FAQ</a></li>
            <li><a href="#roadmap" className="hover:text-[#BFFF00] transition-colors">8. Roadmap</a></li>
          </ul>
        </nav>

        {/* 1. Introduction */}
        <Section id="introduction" title="1. Introduction">
          <p>
            <strong className="text-white">Lumine</strong> is an infrastructure layer for <strong className="text-[#BFFF00]">pay-per-request APIs</strong> with on-chain settlement. It enables API providers to monetize endpoints and allows autonomous systems (AI agents, bots, services) to pay for API access programmatically.
          </p>
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg mt-4">
            <h4 className="text-white font-mono text-sm mb-3">Key Concepts</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="text-[#BFFF00] font-mono">HTTP 402</span> — The "Payment Required" status code, finally put to use</li>
              <li><span className="text-[#BFFF00] font-mono">Pay-per-request</span> — Pay only for what you use, no subscriptions</li>
              <li><span className="text-[#BFFF00] font-mono">On-chain settlement</span> — Payments verified on Stacks blockchain</li>
              <li><span className="text-[#BFFF00] font-mono">Autonomous systems</span> — Built for AI agents that need to pay for resources</li>
            </ul>
          </div>
          <p className="mt-4">
            Lumine solves a fundamental problem: how do autonomous systems pay for API access without human intervention? Traditional payment methods (credit cards, OAuth tokens) require human setup. Lumine enables machines to pay machines, instantly and verifiably.
          </p>
        </Section>

        {/* 2. x402 Payment Flow */}
        <Section id="x402-flow" title="2. Core Concept: x402 Payment Flow">
          <p>
            The x402 protocol is simple. When a client requests a paid endpoint without payment, the server responds with HTTP 402 and payment details. The client pays on-chain, then retries with proof.
          </p>
          <div className="p-4 bg-black/50 border border-white/10 rounded-lg font-mono text-sm mt-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-gray-500">1.</span>
                <span><span className="text-blue-400">Client</span> → <span className="text-purple-400">GET /api/resource</span></span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-500">2.</span>
                <span><span className="text-orange-400">Server</span> → <span className="text-yellow-400">402 Payment Required</span> + payment headers</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-500">3.</span>
                <span><span className="text-blue-400">Client</span> → <span className="text-green-400">Pays on-chain</span> (USDCx on Stacks)</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-500">4.</span>
                <span><span className="text-blue-400">Client</span> → <span className="text-purple-400">GET /api/resource</span> + <span className="text-[#BFFF00]">X-Payment-TxId</span></span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-500">5.</span>
                <span><span className="text-orange-400">Server</span> → Verifies tx → <span className="text-green-400">200 OK</span> + data</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            Payment headers include: <code className="text-[#BFFF00]">X-Payment-Amount</code>, <code className="text-[#BFFF00]">X-Payment-Recipient</code>, <code className="text-[#BFFF00]">X-Payment-Network</code>
          </p>
        </Section>

        {/* 3. Getting Started */}
        <Section id="getting-started" title="3. Getting Started (Demo)">
          <p>
            Lumine includes a live demo that executes <strong className="text-white">real blockchain transactions</strong> on Stacks testnet. No payments are mocked—every transaction is verifiable on-chain.
          </p>
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg mt-4">
            <h4 className="text-white font-mono text-sm mb-3">Try the Demo</h4>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>Navigate to <Link to="/demo-run" className="text-[#BFFF00] hover:underline">/demo-run</Link></li>
              <li>Watch as the agent requests a paid endpoint</li>
              <li>See the 402 response with payment requirements</li>
              <li>Observe the on-chain payment execution</li>
              <li>Verify the transaction on the Stacks explorer</li>
            </ol>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            The demo uses testnet STX and USDCx. Transactions are real and can be verified on any Stacks block explorer.
          </p>
        </Section>

        {/* 4. Client SDK */}
        <Section id="client-sdk" title="4. Using Lumine as an API Consumer">
          <p>
            <code className="text-[#BFFF00]">@lumine/client</code> is a lightweight SDK for agents and applications that need to consume paid APIs. It handles the 402 flow automatically.
          </p>
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg mt-4">
            <h4 className="text-white font-mono text-sm mb-3">Who is this for?</h4>
            <ul className="space-y-1 text-sm">
              <li>• AI agents that need to pay for API access</li>
              <li>• Automated systems consuming premium endpoints</li>
              <li>• Developers building autonomous applications</li>
            </ul>
          </div>
          <h4 className="text-white font-mono text-sm mt-6 mb-3">Usage Example</h4>
          <CodeBlock>{`import { createLumineClient } from "@lumine/client";

// Create a client pointing to your Lumine backend
const client = createLumineClient({
  apiBaseUrl: "http://localhost:8000",
});

// Make requests — 402 handling is automatic
const response = await client.get("https://api.example.com/paid-endpoint");
const data = await response.json();

console.log(data); // Your paid content!`}</CodeBlock>
          <p className="mt-4 text-sm text-gray-400">
            The client automatically detects 402 responses, triggers payment, and retries the request. No manual payment handling required.
          </p>
        </Section>

        {/* 5. Gateway SDK */}
        <Section id="gateway-sdk" title="5. Using Lumine as an API Provider">
          <p>
            <code className="text-[#BFFF00]">@lumine/gateway</code> provides middleware to gate your API endpoints behind payments. Add pay-per-request monetization to any endpoint.
          </p>
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg mt-4">
            <h4 className="text-white font-mono text-sm mb-3">Who is this for?</h4>
            <ul className="space-y-1 text-sm">
              <li>• API providers who want to monetize endpoints</li>
              <li>• Developers building paid services for AI agents</li>
              <li>• Anyone implementing HTTP 402 payment flows</li>
            </ul>
          </div>
          <h4 className="text-white font-mono text-sm mt-6 mb-3">Express Example</h4>
          <CodeBlock>{`import express from "express";
import { requirePayment } from "@lumine/gateway";

const app = express();

// Free endpoint
app.get("/api/free", (req, res) => {
  res.json({ message: "This is free!" });
});

// Paid endpoint — requires 0.1 USDCx
app.get("/api/premium", requirePayment({ amount: "100000" }), (req, res) => {
  res.json({ data: "Premium content unlocked!" });
});

app.listen(3000);`}</CodeBlock>
          <h4 className="text-white font-mono text-sm mt-6 mb-3">FastAPI Example</h4>
          <CodeBlock language="python">{`from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/api/premium")
async def premium(request: Request):
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
    
    return {"data": "Premium content unlocked!"}`}</CodeBlock>
        </Section>

        {/* 6. Demo Mode */}
        <Section id="demo-mode" title="6. Demo Mode Explanation">
          <p>
            The Lumine demo is designed to showcase real functionality, not simulated behavior.
          </p>
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mt-4">
            <h4 className="text-yellow-400 font-mono text-sm mb-3">⚠️ Demo Environment</h4>
            <ul className="space-y-2 text-sm">
              <li><strong className="text-white">Shared agent wallet</strong> — Demo uses a pre-funded testnet wallet</li>
              <li><strong className="text-white">Testnet only</strong> — All transactions occur on Stacks testnet</li>
              <li><strong className="text-white">Real transactions</strong> — Every payment is a real blockchain transaction</li>
              <li><strong className="text-white">Verifiable</strong> — Transaction IDs can be checked on any block explorer</li>
            </ul>
          </div>
          <p className="mt-4">
            In production, each user or agent would have their own wallet. The demo uses a shared wallet to simplify the onboarding experience while still demonstrating real on-chain settlement.
          </p>
        </Section>

        {/* 7. FAQ */}
        <Section id="faq" title="7. FAQ">
          <div className="space-y-6">
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <h4 className="text-white font-mono mb-2">Is this production ready?</h4>
              <p className="text-sm text-gray-400">
                Lumine is currently in demo/testnet phase. The core protocol works end-to-end, but production deployment would require additional security audits, mainnet integration, and per-user wallet management.
              </p>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <h4 className="text-white font-mono mb-2">Why blockchain for API payments?</h4>
              <p className="text-sm text-gray-400">
                Blockchain enables permissionless, programmable payments. An AI agent can pay for API access without a credit card, bank account, or human approval. Payments are instant, verifiable, and irreversible.
              </p>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <h4 className="text-white font-mono mb-2">Why HTTP 402?</h4>
              <p className="text-sm text-gray-400">
                HTTP 402 "Payment Required" has existed since 1999 but was never widely adopted due to lack of payment infrastructure. Blockchain finally provides the programmable payment layer that makes 402 practical.
              </p>
            </div>
          </div>
        </Section>

        {/* 8. Roadmap */}
        <Section id="roadmap" title="8. Roadmap">
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-[#BFFF00] mt-1">○</span>
                <div>
                  <span className="text-white font-medium">Per-user agent wallets</span>
                  <p className="text-sm text-gray-400">Each user/agent gets their own wallet for isolated payments</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#BFFF00] mt-1">○</span>
                <div>
                  <span className="text-white font-medium">Mainnet deployment</span>
                  <p className="text-sm text-gray-400">Production deployment on Stacks mainnet with real USDC</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#BFFF00] mt-1">○</span>
                <div>
                  <span className="text-white font-medium">Rate limiting & quotas</span>
                  <p className="text-sm text-gray-400">Built-in rate limiting based on payment history</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#BFFF00] mt-1">○</span>
                <div>
                  <span className="text-white font-medium">Extended SDK features</span>
                  <p className="text-sm text-gray-400">Webhooks, batch payments, subscription patterns</p>
                </div>
              </li>
            </ul>
          </div>
        </Section>

        {/* Footer */}
        <footer className="pt-12 mt-16 border-t border-white/10 text-center text-gray-600 text-sm font-mono">
          <p>&copy; 2026 Lumine Protocol. Built on Stacks.</p>
          <div className="mt-4 flex justify-center gap-4">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/demo-run" className="hover:text-white transition-colors">Demo</Link>
            <a href="https://github.com/Shubhojit-17/Lumine" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
