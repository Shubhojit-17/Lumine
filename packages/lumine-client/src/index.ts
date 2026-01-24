/**
 * @lumine/client
 * 
 * Minimal SDK for autonomous agents consuming paid APIs.
 * Handles HTTP 402 Payment Required responses automatically.
 */

export interface LumineClientConfig {
  /** Base URL of the Lumine backend (e.g., "http://localhost:8000") */
  apiBaseUrl: string;
}

export interface LumineClient {
  /** Perform a GET request with automatic 402 payment handling */
  get: (url: string, options?: RequestInit) => Promise<Response>;
}

/**
 * Create a Lumine client that automatically handles 402 Payment Required responses.
 * 
 * When a 402 is received, the client will:
 * 1. Log the payment requirement
 * 2. Trigger the demo payment flow via POST /demo/run
 * 3. Retry the original request
 * 
 * @example
 * ```ts
 * const client = createLumineClient({ apiBaseUrl: "http://localhost:8000" });
 * const response = await client.get("http://api.example.com/paid-endpoint");
 * ```
 */
export function createLumineClient(config: LumineClientConfig): LumineClient {
  const { apiBaseUrl } = config;

  return {
    get: async (url: string, options?: RequestInit): Promise<Response> => {
      // Perform initial request
      const response = await fetch(url, {
        ...options,
        method: "GET",
      });

      // If not 402, return response as-is
      if (response.status !== 402) {
        return response;
      }

      // Handle 402 Payment Required
      console.log("[Lumine] 402 Payment Required received");
      
      // Extract payment info from headers
      const paymentAmount = response.headers.get("X-Payment-Amount");
      const paymentRecipient = response.headers.get("X-Payment-Recipient");
      const paymentNetwork = response.headers.get("X-Payment-Network");

      console.log("[Lumine] Payment details:", {
        amount: paymentAmount,
        recipient: paymentRecipient,
        network: paymentNetwork,
      });

      // Trigger demo payment flow
      console.log("[Lumine] Initiating payment via demo endpoint...");
      
      const demoResponse = await fetch(`${apiBaseUrl}/demo/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!demoResponse.ok) {
        console.error("[Lumine] Demo payment failed:", demoResponse.status);
        throw new Error(`Payment failed: ${demoResponse.status}`);
      }

      const demoResult = await demoResponse.json();
      console.log("[Lumine] Payment completed:", demoResult);

      // Retry the original request
      console.log("[Lumine] Retrying original request...");
      
      const retryResponse = await fetch(url, {
        ...options,
        method: "GET",
      });

      return retryResponse;
    },
  };
}
