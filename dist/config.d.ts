import Conf from "conf";
export interface AlgopayConfig {
    defaultNetwork: "testnet" | "mainnet";
    sessionToken: string | null;
    walletAddress: string | null;
    slippageTolerance: number;
    autoConfirm: boolean;
    spendingLimits: {
        amount: number;
        period: "hourly" | "daily" | "weekly" | "monthly";
    } | null;
}
export declare function getConfig(): Conf<AlgopayConfig>;
/**
 * Returns the current network endpoints for algod and indexer.
 */
export declare function getNetworkEndpoints(network: "testnet" | "mainnet"): {
    algodUrl: string;
    algodToken: string;
    indexerUrl: string;
    indexerToken: string;
    usdcAssetId: number;
    networkName: "mainnet";
} | {
    algodUrl: string;
    algodToken: string;
    indexerUrl: string;
    indexerToken: string;
    usdcAssetId: number;
    networkName: "testnet";
};
//# sourceMappingURL=config.d.ts.map