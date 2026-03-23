/**
 * Wallet Funding Module — Onramp & deposit watching
 * Req 12: Fund wallet with USDC/ALGO
 *
 * AWAL equivalent: Coinbase Pay onramp (Card, Apple Pay, Bank)
 * Algopay equivalents:
 *   1. Pera Fund (Meld fiat + Exodus cross-chain swaps)
 *   2. Direct USDC/ALGO deposit to wallet address
 *   3. Algorand Testnet Dispenser (for development)
 *
 * This module generates funding links and watches for deposits.
 */
export interface FundingInfo {
    walletAddress: string;
    network: "testnet" | "mainnet";
    methods: FundingMethod[];
}
export interface FundingMethod {
    name: string;
    type: "fiat" | "crypto" | "testnet";
    url: string;
    description: string;
    processingTime: string;
}
export interface DepositEvent {
    txId: string;
    amount: number;
    asset: string;
    sender: string;
    confirmedRound: number;
    timestamp: number;
}
/**
 * Generate all available funding methods for a wallet address (Req 12)
 */
export declare function getFundingMethods(walletAddress: string, network: "testnet" | "mainnet"): FundingInfo;
/**
 * Request free testnet ALGO from the Algorand dispenser.
 * Returns the dispenser URL for the user to visit.
 */
export declare function getTestnetDispenserUrl(walletAddress: string): string;
/**
 * Watch for incoming deposits to a wallet address (Req 12).
 * Polls the Indexer for new transactions.
 *
 * @param walletAddress The address to monitor
 * @param network testnet or mainnet
 * @param afterRound Only show txns after this round (0 = all recent)
 * @param limit Max transactions to return
 */
export declare function checkDeposits(walletAddress: string, network: "testnet" | "mainnet", afterRound?: number, limit?: number): Promise<DepositEvent[]>;
//# sourceMappingURL=funding.d.ts.map