/**
 * GoPlausible Bazaar Client — x402 Service Discovery
 * Req 10: discover x402-enabled services
 * Req 49: GoPlausible Bazaar integration
 *
 * API Base: https://api.goplausible.xyz
 * Endpoint: GET /discovery/resources
 *
 * The Bazaar is the official Algorand x402 service registry.
 * AI agents search for services here, then use x402 to pay.
 */
export interface BazaarResource {
    id: string;
    name: string;
    description: string;
    url: string;
    category: string;
    priceUsdc: number;
    payToAddress: string;
    network: string;
    tags: string[];
    provider: string;
}
export interface BazaarSearchResult {
    resources: BazaarResource[];
    total: number;
    query: string;
    cachedAt: number;
}
/**
 * Search for x402 services in the GoPlausible Bazaar (Req 10 + 49)
 * Results are cached for 1 hour to avoid hammering the API.
 */
export declare function searchBazaar(query: string, options?: {
    category?: string;
    limit?: number;
    network?: "testnet" | "mainnet";
}): Promise<BazaarSearchResult>;
/**
 * Get details for a specific Bazaar resource by ID
 */
export declare function getBazaarResource(id: string): Promise<BazaarResource | null>;
//# sourceMappingURL=bazaar.d.ts.map