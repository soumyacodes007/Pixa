/**
 * Batch Transaction Processing — Phase 9
 * Req 38: Execute multiple transactions atomically (max 16 per group)
 *
 * Usage: algopay batch transactions.json
 *
 * File format:
 * {
 *   "transactions": [
 *     { "type": "send", "amount": 1.0, "recipient": "ADDR...", "asset": "USDC" },
 *     { "type": "send", "amount": 2.0, "recipient": "ADDR...", "asset": "ALGO" }
 *   ]
 * }
 */
export interface BatchTransaction {
    type: "send" | "trade" | "opt-in";
    amount?: number;
    recipient?: string;
    asset?: string;
    from?: string;
    to?: string;
    assetId?: number;
}
export interface BatchFile {
    transactions: BatchTransaction[];
    network?: "testnet" | "mainnet";
    dryRun?: boolean;
}
export interface BatchResult {
    success: boolean;
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    results: Array<{
        index: number;
        transaction: BatchTransaction;
        success: boolean;
        txId?: string;
        error?: string;
    }>;
    groupTxId?: string;
    error?: string;
}
export declare function executeBatch(filePath: string, senderAddress: string, sessionToken: string, options?: {
    network?: "testnet" | "mainnet";
    dryRun?: boolean;
    backendAddress?: string;
}): Promise<BatchResult>;
export declare function generateBatchTemplate(): BatchFile;
//# sourceMappingURL=batch.d.ts.map