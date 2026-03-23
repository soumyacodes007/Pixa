import Conf from "conf";
const defaults = {
    defaultNetwork: "testnet",
    sessionToken: null,
    walletAddress: null,
    slippageTolerance: 2,
    autoConfirm: false,
    spendingLimits: null,
};
let configInstance = null;
export function getConfig() {
    if (!configInstance) {
        configInstance = new Conf({
            projectName: "algopay",
            defaults,
        });
    }
    return configInstance;
}
/**
 * Returns the current network endpoints for algod and indexer.
 */
export function getNetworkEndpoints(network) {
    if (network === "mainnet") {
        return {
            algodUrl: "https://mainnet-api.algonode.cloud",
            algodToken: "",
            indexerUrl: "https://mainnet-idx.algonode.cloud",
            indexerToken: "",
            usdcAssetId: 31566704,
            networkName: "mainnet",
        };
    }
    return {
        algodUrl: "https://testnet-api.algonode.cloud",
        algodToken: "",
        indexerUrl: "https://testnet-idx.algonode.cloud",
        indexerToken: "",
        usdcAssetId: 10458941,
        networkName: "testnet",
    };
}
//# sourceMappingURL=config.js.map