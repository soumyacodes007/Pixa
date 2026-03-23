/**
 * NFD (Non-Fungible Domains) — Algorand Name Service
 * Equivalent to ENS on Ethereum. Resolves "alice.algo" → Algorand address.
 *
 * API: https://api.nf.domains
 * Docs: https://api-docs.nf.domains
 *
 * Supports:
 *   - Forward resolution: "alice.algo" → ALGO_ADDRESS
 *   - Reverse resolution: ALGO_ADDRESS → "alice.algo"
 *   - Detection: any string ending in .algo is an NFD name
 */
export interface NfdRecord {
    name: string;
    owner: string;
    depositAccount: string;
    caAlgo?: string[];
    avatar?: string;
    verified: boolean;
}
/**
 * Check if a string looks like an NFD name (e.g. "alice.algo")
 */
export declare function isNfdName(input: string): boolean;
/**
 * Resolve an NFD name to an Algorand address.
 * @param name e.g. "alice.algo"
 * @param network "testnet" or "mainnet"
 * @returns Algorand address, or null if not found
 */
export declare function resolveNfdToAddress(name: string, network?: "testnet" | "mainnet"): Promise<string | null>;
/**
 * Resolve an Algorand address to an NFD name (reverse lookup).
 * @returns NFD name like "alice.algo", or null if not found
 */
export declare function resolveAddressToNfd(address: string, network?: "testnet" | "mainnet"): Promise<string | null>;
/**
 * If input is an NFD name, resolve to address. Otherwise return as-is.
 * Throws if NFD name doesn't resolve.
 */
export declare function smartResolve(input: string, network: "testnet" | "mainnet"): Promise<{
    address: string;
    nfdName?: string;
}>;
//# sourceMappingURL=nfd.d.ts.map