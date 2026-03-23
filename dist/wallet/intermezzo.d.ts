/**
 * Intermezzo Client — Wrapper for Algorand Foundation's custodial signing API
 * Req 17: All signing must go through Intermezzo
 * Req 30: Circuit breaker for health monitoring
 *
 * In production, Intermezzo runs on HashiCorp Vault and exposes REST endpoints.
 * In dev mode, we use a mock that simulates the signing flow.
 */
import algosdk from "algosdk";
export interface IntermezzoConfig {
    url: string;
    token: string;
}
export interface SignResult {
    signedTxns: Uint8Array[];
    txIds: string[];
}
export declare class IntermezzoClient {
    private url;
    private token;
    private mockMode;
    private circuitBreaker;
    constructor(config?: IntermezzoConfig);
    /**
     * Check if Intermezzo is reachable
     */
    healthCheck(): Promise<boolean>;
    /**
     * Create a new wallet/account via Intermezzo
     * Returns the public address (private key stays in Vault)
     */
    createAccount(sessionId: string): Promise<{
        address: string;
    }>;
    /**
     * Sign transactions via Intermezzo (Req 17)
     * Private keys NEVER leave Intermezzo/Vault.
     *
     * @param unsignedTxns - The unsigned transactions to sign
     * @param indices - Which transaction indices to sign (user txns only)
     * @param sessionToken - JWT session token for auth
     */
    signTransactions(unsignedTxns: algosdk.Transaction[], indices: number[], sessionToken: string): Promise<SignResult>;
}
export declare function getIntermezzoClient(): IntermezzoClient;
//# sourceMappingURL=intermezzo.d.ts.map