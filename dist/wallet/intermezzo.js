/**
 * Intermezzo Client — Wrapper for Algorand Foundation's custodial signing API
 * Req 17: All signing must go through Intermezzo
 * Req 30: Circuit breaker for health monitoring
 *
 * In production, Intermezzo runs on HashiCorp Vault and exposes REST endpoints.
 * In dev mode, we use a mock that simulates the signing flow.
 */
import algosdk from "algosdk";
import { logger } from "../utils/production.js";
// --- Circuit Breaker ---
class CircuitBreaker {
    failureThreshold;
    recoveryTimeMs;
    failures = 0;
    lastFailureTime = 0;
    state = 'CLOSED';
    constructor(failureThreshold = 5, recoveryTimeMs = 60000 // 1 minute
    ) {
        this.failureThreshold = failureThreshold;
        this.recoveryTimeMs = recoveryTimeMs;
    }
    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.recoveryTimeMs) {
                this.state = 'HALF_OPEN';
                logger.info('Circuit breaker transitioning to HALF_OPEN');
            }
            else {
                throw new Error('Circuit breaker is OPEN - Intermezzo unavailable');
            }
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.failures = 0;
        if (this.state === 'HALF_OPEN') {
            this.state = 'CLOSED';
            logger.info('Circuit breaker reset to CLOSED');
        }
    }
    onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
            logger.error(`Circuit breaker opened after ${this.failures} failures`);
        }
    }
    getState() {
        return {
            state: this.state,
            failures: this.failures,
            lastFailureTime: this.lastFailureTime,
        };
    }
}
// --- Client ---
export class IntermezzoClient {
    url;
    token;
    mockMode;
    circuitBreaker;
    constructor(config) {
        this.url =
            config?.url ?? process.env.INTERMEZZO_URL ?? "http://localhost:8200";
        this.token =
            config?.token ?? process.env.INTERMEZZO_TOKEN ?? "";
        this.mockMode = !config?.url && !process.env.INTERMEZZO_URL;
        this.circuitBreaker = new CircuitBreaker();
        if (this.mockMode) {
            logger.info("Intermezzo running in MOCK mode — no real signing");
        }
    }
    /**
     * Check if Intermezzo is reachable
     */
    async healthCheck() {
        if (this.mockMode)
            return true;
        return this.circuitBreaker.execute(async () => {
            const response = await fetch(`${this.url}/v1/health`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`,
                },
                signal: AbortSignal.timeout(5000), // 5 second timeout
            });
            if (!response.ok) {
                throw new Error(`Intermezzo health check failed: ${response.status}`);
            }
            return true;
        });
    }
    /**
     * Create a new wallet/account via Intermezzo
     * Returns the public address (private key stays in Vault)
     */
    async createAccount(sessionId) {
        if (this.mockMode) {
            // Generate a real Algorand account for testing
            const account = algosdk.generateAccount();
            return { address: account.addr.toString() };
        }
        const res = await fetch(`${this.url}/v1/accounts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.token}`,
            },
            body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) {
            throw new Error(`Intermezzo createAccount failed: ${res.status}`);
        }
        return (await res.json());
    }
    /**
     * Sign transactions via Intermezzo (Req 17)
     * Private keys NEVER leave Intermezzo/Vault.
     *
     * @param unsignedTxns - The unsigned transactions to sign
     * @param indices - Which transaction indices to sign (user txns only)
     * @param sessionToken - JWT session token for auth
     */
    async signTransactions(unsignedTxns, indices, sessionToken) {
        if (this.mockMode) {
            // In mock mode, we can't actually sign since we don't have keys.
            // Return empty signed txns — the caller should handle this gracefully.
            console.log(`[Intermezzo Mock] Would sign ${indices.length} transaction(s)`);
            return {
                signedTxns: unsignedTxns.map((tx) => algosdk.encodeUnsignedTransaction(tx)),
                txIds: unsignedTxns.map((tx) => tx.txID()),
            };
        }
        // Encode transactions for transport
        const encodedTxns = unsignedTxns.map((tx) => Buffer.from(algosdk.encodeUnsignedTransaction(tx)).toString("base64"));
        const res = await fetch(`${this.url}/v1/transactions/sign`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.token}`,
                "X-Session-Token": sessionToken,
            },
            body: JSON.stringify({
                transactions: encodedTxns,
                indicesToSign: indices,
            }),
        });
        if (!res.ok) {
            const error = (await res.json());
            throw new Error(`Intermezzo signing failed: ${error.message ?? res.status}`);
        }
        const data = (await res.json());
        return {
            signedTxns: data.signedTransactions.map((b64) => new Uint8Array(Buffer.from(b64, "base64"))),
            txIds: data.transactionIds,
        };
    }
}
// --- Singleton ---
let clientInstance = null;
export function getIntermezzoClient() {
    if (!clientInstance) {
        clientInstance = new IntermezzoClient();
    }
    return clientInstance;
}
//# sourceMappingURL=intermezzo.js.map