/**
 * Guardrails Module — Client-side spending limits & address validation
 * Reqs: 14 (spending limits), 15 (allowlists), 36 (KYT), 37 (reputation), 52 (guardrails)
 *
 * Architecture: Guardrails are enforced in the CLI/backend BEFORE any signing request
 * is sent to Intermezzo. This means no unvalidated transaction ever reaches the signing layer.
 *
 * For MVP: limits are enforced locally in ~/.algopay/config.json.
 * For Prod: limits will be cross-validated by the backend + Intermezzo session context.
 */
export type AssetType = "ALGO" | "USDC" | number;
export interface GuardrailContext {
    senderAddress: string;
    recipientAddress: string;
    amount: number;
    asset: AssetType;
    network: "testnet" | "mainnet";
}
export interface GuardrailResult {
    allow: boolean;
    reason?: string;
}
/**
 * Validate a recipient Algorand address.
 * Returns true if valid, throws/returns error if not.
 */
export declare function validateAddress(address: string): GuardrailResult;
/**
 * Record a completed spend for limit tracking.
 */
export declare function recordSpend(amount: number, asset: AssetType): void;
/**
 * Check if a transaction would exceed the configured spending limit.
 */
export declare function checkSpendingLimit(amount: number, asset: AssetType): GuardrailResult;
export declare function blockAddress(address: string): void;
export declare function allowAddress(address: string): void;
/**
 * Run all guardrail checks before signing a transaction.
 * Returns the first failing check or { allow: true } if all pass.
 *
 * Call this BEFORE building the atomic group or calling Intermezzo.
 */
export declare function runGuardrails(ctx: GuardrailContext): GuardrailResult;
//# sourceMappingURL=guardrails.d.ts.map