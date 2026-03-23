/**
 * x402 Protocol Payment Handler
 * Req 11: pay for x402 services
 *
 * The x402 Protocol flow:
 *  1. Agent makes HTTP request to a service URL
 *  2. Service returns HTTP 402 with X-Payment header:
 *     { price: "0.05 USDC", payTo: "ALGO_ADDRESS", network: "algorand-mainnet" }
 *  3. Agent builds & signs an Algorand USDC transaction
 *  4. Agent retries the request with:
 *     Authorization: x402 <base64-encoded-tx>
 *  5. Service verifies the on-chain payment and returns data
 *
 * This module handles steps 1-5 for Algorand.
 */
export interface X402PaymentChallenge {
    price: number;
    payToAddress: string;
    network: "testnet" | "mainnet";
    serviceUrl: string;
    resourceId?: string;
}
export interface X402PayResult {
    success: boolean;
    txId?: string;
    authHeader?: string;
    responseBody?: string;
    statusCode?: number;
    error?: string;
}
/**
 * Parse the X-Payment header from a 402 response.
 * GoPlausible format: { price_usdc, pay_to, network }
 * Standard x402 format: { price, payTo, asset, network }
 */
export declare function parsePaymentChallenge(headers: Record<string, string>, serviceUrl: string): X402PaymentChallenge | null;
/**
 * Execute the complete x402 payment flow (Req 11):
 * 1. Make initial request → get 402
 * 2. Parse payment challenge
 * 3. Build & sign USDC payment via Intermezzo
 * 4. Retry with Authorization: x402 <tx>
 * 5. Return the paid response body
 */
export declare function payAndFetch(opts: {
    serviceUrl: string;
    senderAddress: string;
    sessionToken: string;
    network: "testnet" | "mainnet";
    maxPrice?: number;
    requestOptions?: RequestInit;
}): Promise<X402PayResult>;
//# sourceMappingURL=pay.d.ts.map