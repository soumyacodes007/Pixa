/**
 * Send Module — Executes fee-pooled transactions via Intermezzo
 * Reqs: 8 (send USDC), 28 (tx confirmation), 33 (fee pooling)
 *
 * Flow:
 *   1. Guardrails checks (address, limits)
 *   2. Build atomic group (user tx + fee tx)
 *   3. Intermezzo signs user tx + backend signs fee tx
 *   4. Broadcast to Algorand
 *   5. Wait for confirmation
 */
export type SendAsset = "ALGO" | "USDC";
export interface SendOptions {
    senderAddress: string;
    recipientAddress: string;
    amount: number;
    asset: SendAsset;
    network: "testnet" | "mainnet";
    sessionToken: string;
    dryRun?: boolean;
    backendAddress?: string;
}
export interface SendResult {
    success: boolean;
    txId?: string;
    confirmedRound?: number;
    fee?: number;
    dryRun?: boolean;
    error?: string;
}
export declare function sendPayment(opts: SendOptions): Promise<SendResult>;
//# sourceMappingURL=send.d.ts.map