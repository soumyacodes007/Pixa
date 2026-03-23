/**
 * Algopay Monetize SDK — Express/Hono paymentMiddleware
 * Req 13: 1-line API monetization for Algorand
 *
 * AWAL (Coinbase) equivalent: paymentMiddleware from x402-express (Base/EVM)
 * Algopay version: @x402-avm/express compatible + pure implementation fallback
 *
 * Usage (Express):
 * ─────────────────────────────────────────────────────────────────────
 * import { paymentMiddleware } from "@algopay/x402";
 *
 * const payment = paymentMiddleware(PAY_TO_ADDRESS, {
 *   "GET /api/data":   { price: "$0.05", network: "algorand-testnet" },
 *   "POST /api/query": { price: "$0.25", description: "Run a query" },
 * });
 *
 * app.get("/api/data", payment, (req, res) => { ... });
 * ─────────────────────────────────────────────────────────────────────
 *
 * How it works:
 *  1. REQUEST comes in
 *  2. Middleware checks "Authorization: x402 <proof>" header
 *  3. If missing → return HTTP 402 with X-Payment challenge header
 *  4. If present → verify USDC tx on Algorand Indexer
 *  5. If verified → call next() (allow request through)
 *
 * Compatible with: Express.js, Hono (via adapters)
 */
import { Request, Response, NextFunction } from "express";
/** Simple price string: "$0.05" */
type PriceString = string;
export interface RouteConfig {
    price: PriceString | number;
    network?: "algorand-testnet" | "algorand-mainnet";
    description?: string;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    maxTimeoutSeconds?: number;
}
/** Route map: "METHOD /path" → price or RouteConfig */
export type RouteMap = Record<string, PriceString | number | RouteConfig>;
export interface AlgopayMiddlewareOptions {
    network?: "algorand-testnet" | "algorand-mainnet";
    indexerUrl?: string;
    indexerToken?: string;
    facilitatorUrl?: string;
    usdcAssetId?: number;
    replayWindowSec?: number;
}
/**
 * paymentMiddleware — Drop-in Express middleware for x402 API monetization.
 *
 * @param payToAddress  Your Algorand wallet address (receives USDC payments)
 * @param routes        Route map: "GET /path" → price or RouteConfig
 * @param options       Optional network/indexer/facilitator config
 *
 * @example
 * const payment = paymentMiddleware("YOUR_ALGO_ADDRESS", {
 *   "GET /api/data": "$0.05",
 *   "POST /api/query": { price: "$0.25", description: "Run a query" },
 * });
 * app.get("/api/data", payment, (req, res) => res.json({ data: "..." }));
 */
export declare function paymentMiddleware(payToAddress: string, routes: RouteMap, options?: AlgopayMiddlewareOptions): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Convenience: create middleware for a single route config.
 * @example
 * app.get("/api/data", paywall("$0.05"), handler);
 */
export declare function paywall(price: PriceString | number, payToAddress: string, options?: AlgopayMiddlewareOptions & {
    description?: string;
}): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Generate the route manifest for GoPlausible Bazaar auto-indexing.
 * Call this to register your paid endpoints with the Bazaar discovery service.
 */
export declare function generateBazaarManifest(payToAddress: string, routes: RouteMap, metadata: {
    name: string;
    description: string;
    serviceUrl: string;
    provider?: string;
    tags?: string[];
}, options?: AlgopayMiddlewareOptions): Record<string, unknown>;
export {};
//# sourceMappingURL=middleware.d.ts.map