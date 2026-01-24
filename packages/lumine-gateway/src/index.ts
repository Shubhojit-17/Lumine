/**
 * @lumine/gateway
 * 
 * Minimal SDK for API providers monetizing endpoints with HTTP 402.
 */

export interface PaymentConfig {
  /** Payment amount in base units (e.g., "100000" for 0.1 USDCx) */
  amount: string;
  /** Recipient wallet address */
  recipient?: string;
  /** Network identifier (default: "stacks-testnet") */
  network?: string;
}

/**
 * Express/Connect-style request object
 */
export interface GatewayRequest {
  headers: Record<string, string | string[] | undefined>;
  [key: string]: unknown;
}

/**
 * Express/Connect-style response object
 */
export interface GatewayResponse {
  status: (code: number) => GatewayResponse;
  setHeader: (name: string, value: string) => GatewayResponse;
  set?: (name: string, value: string) => GatewayResponse;
  json: (body: unknown) => void;
  [key: string]: unknown;
}

/**
 * Next function for middleware chain
 */
export type NextFunction = (err?: unknown) => void;

/**
 * Middleware handler type
 */
export type PaymentMiddleware = (
  req: GatewayRequest,
  res: GatewayResponse,
  next: NextFunction
) => Promise<void> | void;

/**
 * Create a middleware that returns HTTP 402 Payment Required.
 * 
 * This middleware gates an endpoint behind a payment requirement.
 * It returns 402 with payment details in headers, allowing Lumine-enabled
 * clients to complete payment and retry.
 * 
 * @example
 * ```ts
 * // Express
 * app.get("/premium", requirePayment({ amount: "100000" }), (req, res) => {
 *   res.json({ data: "premium content" });
 * });
 * ```
 */
export function requirePayment(config: PaymentConfig): PaymentMiddleware {
  const {
    amount,
    recipient = process.env.AGENTPAY_SERVER_WALLET || "",
    network = "stacks-testnet",
  } = config;

  return async function handler(
    req: GatewayRequest,
    res: GatewayResponse,
    next: NextFunction
  ): Promise<void> {
    // Check for payment proof in headers (simplified check)
    const paymentProof = req.headers["x-payment-txid"];
    
    if (paymentProof) {
      // Payment proof provided — let the request through
      // Actual verification is handled by existing Lumine backend logic
      next();
      return;
    }

    // No payment — return 402 Payment Required
    const setHeader = res.setHeader?.bind(res) || res.set?.bind(res);
    
    if (setHeader) {
      setHeader("X-Payment-Amount", amount);
      setHeader("X-Payment-Recipient", recipient);
      setHeader("X-Payment-Network", network);
    }

    res.status(402).json({
      error: "Payment Required",
      message: "This endpoint requires payment to access",
      payment: {
        amount,
        recipient,
        network,
        currency: "USDCx",
      },
    });
  };
}

/**
 * FastAPI/Starlette-style dependency for Python interop reference.
 * 
 * This is a reference implementation showing the equivalent pattern.
 * For actual Python usage, see the existing Lumine backend.
 * 
 * @example
 * ```python
 * # FastAPI equivalent (reference only)
 * from fastapi import HTTPException
 * 
 * def require_payment(amount: str):
 *     async def dependency():
 *         raise HTTPException(
 *             status_code=402,
 *             detail="Payment Required",
 *             headers={
 *                 "X-Payment-Amount": amount,
 *                 "X-Payment-Recipient": WALLET,
 *                 "X-Payment-Network": "stacks-testnet"
 *             }
 *         )
 *     return dependency
 * ```
 */
export const FASTAPI_EXAMPLE = `
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

def require_payment(amount: str, recipient: str):
    async def middleware(request: Request, call_next):
        payment_txid = request.headers.get("X-Payment-TxId")
        
        if payment_txid:
            # Payment provided — continue to handler
            return await call_next(request)
        
        # Return 402 Payment Required
        return JSONResponse(
            status_code=402,
            content={
                "error": "Payment Required",
                "payment": {
                    "amount": amount,
                    "recipient": recipient,
                    "network": "stacks-testnet"
                }
            },
            headers={
                "X-Payment-Amount": amount,
                "X-Payment-Recipient": recipient,
                "X-Payment-Network": "stacks-testnet"
            }
        )
    return middleware
`;
