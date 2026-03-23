/**
 * Vestige DEX Client — Price feeds + Swap quote routing
 * Req 9: trade ALGO/USDC/ASA via DEX
 * Req 24: smart routing via Vestige aggregator
 *
 * Vestige API base: https://free-api.vestige.fi
 * Docs: https://free-api.vestige.fi/docs
 *
 * Key endpoints:
 *   GET /asset/{id}/price          — spot price in USD/ALGO
 *   GET /asset/prices              — batch prices for multiple assets
 *   GET /swap/v4/quote             — best swap route + expected output
 *   GET /swap/v4/transactions      — fetch unsigned swap txns to execute
 *
 * Note: Programmatic swap execution of the full route requires enterprise
 * key from team@vestige.fi, but the free API gives us:
 *   1. Price quotes (always available)
 *   2. The routing path to simulate/display
 *
 * For MVP, we execute single-hop swaps (AMM direct) using algosdk's
 * makeAssetTransferTxnWithSuggestedParamsFromObject with fee pooling.
 * Multi-hop routing via Vestige full aggregator is a V2 feature.
 */
export declare const WELL_KNOWN_ASSETS: Record<string, number>;
export interface AssetPrice {
    assetId: number;
    priceUsd: number;
    priceAlgo: number;
    change24h: number;
}
export interface SwapQuote {
    fromAssetId: number;
    toAssetId: number;
    fromAmount: number;
    toAmount: number;
    toAmountDisplay: number;
    priceImpact: number;
    route: string[];
    slippage: number;
}
export interface AssetInfo {
    assetId: number;
    name: string;
    unitName: string;
    decimals: number;
    totalSupply: number;
    priceUsd?: number;
}
/**
 * Get spot price for an asset (Req 24)
 */
export declare function getAssetPrice(assetId: number): Promise<AssetPrice>;
/**
 * Get ALGO price in USD
 */
export declare function getAlgoPrice(): Promise<number>;
/**
 * Resolve asset name/ticker to ASA ID
 */
export declare function resolveAssetId(nameOrId: string, network: "testnet" | "mainnet"): number;
/**
 * Get swap quote from Vestige aggregator (Req 9 + 24)
 * Returns the expected output amount and route for a swap.
 */
export declare function getSwapQuote(fromAssetId: number, toAssetId: number, fromAmount: number, // in display units (e.g., 1.5 USDC)
fromDecimals: number, toDecimals: number, slippagePct?: number, network?: "testnet" | "mainnet"): Promise<SwapQuote>;
export declare function formatAssetName(assetId: number, network: "testnet" | "mainnet"): string;
//# sourceMappingURL=vestige.d.ts.map