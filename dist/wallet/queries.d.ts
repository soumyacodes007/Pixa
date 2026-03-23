/**
 * Wallet Module — Queries Algorand via algosdk + Indexer
 * Reqs: 4 (status), 5 (balance), 6 (address), 20 (history), 26 (network), 27 (confirmation)
 */
import algosdk from "algosdk";
export declare function createAlgodClient(network: "testnet" | "mainnet"): algosdk.Algodv2;
export declare function createIndexerClient(network: "testnet" | "mainnet"): algosdk.Indexer;
export interface WalletStatus {
    address: string;
    network: string;
    authenticated: boolean;
    algodStatus: {
        lastRound: number;
        catchupTime: number;
    };
}
export interface AssetBalance {
    assetId: number;
    name: string;
    unitName: string;
    amount: number;
    decimals: number;
    displayAmount: string;
}
export interface WalletBalance {
    address: string;
    network: string;
    algo: {
        amount: number;
        displayAmount: string;
    };
    assets: AssetBalance[];
    totalUsdcBalance: string;
}
export interface TransactionRecord {
    id: string;
    type: string;
    sender: string;
    receiver: string;
    amount: number;
    assetId: number | null;
    fee: number;
    roundTime: number;
    confirmedRound: number;
    note: string;
}
/**
 * Get wallet status: account info + network status (Req 4)
 */
export declare function getStatus(address: string, network: "testnet" | "mainnet"): Promise<WalletStatus>;
/**
 * Get wallet balance: ALGO + all ASA balances (Req 5)
 */
export declare function getBalance(address: string, network: "testnet" | "mainnet"): Promise<WalletBalance>;
/**
 * Get transaction history from Indexer (Req 20)
 */
export declare function getHistory(address: string, network: "testnet" | "mainnet", options?: {
    limit?: number;
    type?: "send" | "receive" | "trade" | undefined;
}): Promise<TransactionRecord[]>;
/**
 * Get suggested transaction parameters (Req 27)
 */
export declare function getSuggestedParams(network: "testnet" | "mainnet"): Promise<any>;
/**
 * Wait for a transaction to confirm (Req 27)
 */
export declare function waitForConfirmation(txId: string, network: "testnet" | "mainnet", maxWaitRounds?: number): Promise<Record<string, unknown>>;
//# sourceMappingURL=queries.d.ts.map