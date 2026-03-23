/**
 * Advanced Wallet Features — Phase 9
 *
 * - Transaction history (recent tx lookup via Indexer)
 * - Asset opt-in (required for receiving ASAs on Algorand)
 * - Multi-asset balance display
 * - Network status/health check
 */
import algosdk from "algosdk";
export interface TxHistoryEntry {
    txId: string;
    type: string;
    direction: "sent" | "received" | "self" | "other";
    amount: number;
    asset: string;
    counterparty: string;
    round: number;
    timestamp: number;
}
export interface AssetHolding {
    assetId: number;
    name: string;
    unitName: string;
    amount: number;
    decimals: number;
    isFrozen: boolean;
}
export interface NetworkStatus {
    network: string;
    healthy: boolean;
    lastRound: number;
    catchupTime: number;
    version: string;
    genesisId: string;
}
/**
 * Fetch recent transaction history for a wallet address.
 */
export declare function getTransactionHistory(address: string, network: "testnet" | "mainnet", limit?: number): Promise<TxHistoryEntry[]>;
/**
 * Get full asset holdings for a wallet address, including ALGO and all ASAs.
 */
export declare function getAssetHoldings(address: string, network: "testnet" | "mainnet"): Promise<AssetHolding[]>;
/**
 * Build an asset opt-in transaction (zero-amount transfer to self).
 * Required before receiving any ASA on Algorand.
 */
export declare function buildOptInTransaction(address: string, assetId: number, network: "testnet" | "mainnet"): Promise<algosdk.Transaction>;
/**
 * Check Algorand network health and status.
 */
export declare function getNetworkStatus(network: "testnet" | "mainnet"): Promise<NetworkStatus>;
//# sourceMappingURL=advanced.d.ts.map