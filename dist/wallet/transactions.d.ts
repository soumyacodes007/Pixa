/**
 * Atomic Group Builder & Fee Pooling
 * Reqs: 16 (atomic groups), 32 (atomic composer), 33 (fee pooling)
 *
 * Fee pooling: the backend wallet pays ALL transaction fees for the user.
 * Algorand supports this natively via atomic groups — no smart contract needed.
 */
import algosdk from "algosdk";
export interface FeePooledGroup {
    unsignedTxns: algosdk.Transaction[];
    feePaymentIndex: number;
    userTxIndices: number[];
    totalFee: number;
}
/**
 * Build a fee-pooled atomic group (Req 33)
 */
export declare function buildFeePooledGroup(userTxns: algosdk.Transaction[], backendAddress: string, network: "testnet" | "mainnet"): Promise<FeePooledGroup>;
/**
 * Build a simple USDC transfer with fee pooling (Req 8 + 33)
 */
export declare function buildUsdcTransfer(senderAddress: string, recipientAddress: string, usdcAmount: number, usdcAssetId: number, backendAddress: string, network: "testnet" | "mainnet"): Promise<FeePooledGroup>;
/**
 * Build an ALGO transfer with fee pooling
 */
export declare function buildAlgoTransfer(senderAddress: string, recipientAddress: string, algoAmount: number, backendAddress: string, network: "testnet" | "mainnet"): Promise<FeePooledGroup>;
//# sourceMappingURL=transactions.d.ts.map