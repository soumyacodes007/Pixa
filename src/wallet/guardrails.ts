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

import algosdk from "algosdk";
import { getConfig } from "../config.js";

// --- Types ---

export type AssetType = "ALGO" | "USDC" | number; // number = raw ASA ID

export interface GuardrailContext {
  senderAddress: string;
  recipientAddress: string;
  amount: number;       // in USDC or ALGO (display units, NOT micro)
  asset: AssetType;
  network: "testnet" | "mainnet";
}

export interface GuardrailResult {
  allow: boolean;
  reason?: string;
}

// ─── 1. Address Validation (Req 15) ─────────────────────────────────────────

/**
 * Validate a recipient Algorand address.
 * Returns true if valid, throws/returns error if not.
 */
export function validateAddress(address: string): GuardrailResult {
  if (!address || typeof address !== "string") {
    return { allow: false, reason: "Recipient address is required." };
  }
  try {
    algosdk.decodeAddress(address);
    return { allow: true };
  } catch {
    return { allow: false, reason: `Invalid Algorand address: "${address}"` };
  }
}

// ─── 2. Spending Limits (Req 14) ────────────────────────────────────────────

interface SpendRecord {
  timestamp: number; // epoch ms
  amount: number;    // in display units
  asset: string;
}

// In-memory spend tracking (persistent store would use Redis in prod)
const spendHistory: SpendRecord[] = [];

/**
 * Record a completed spend for limit tracking.
 */
export function recordSpend(amount: number, asset: AssetType): void {
  spendHistory.push({
    timestamp: Date.now(),
    amount,
    asset: String(asset),
  });
}

/**
 * Check if a transaction would exceed the configured spending limit.
 */
export function checkSpendingLimit(
  amount: number,
  asset: AssetType
): GuardrailResult {
  const config = getConfig();
  const limits = config.get("spendingLimits");

  // No limit configured → allow
  if (!limits) return { allow: true };

  // Determine window in ms
  const windowMs: Record<string, number> = {
    hourly: 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };
  const window = windowMs[limits.period] ?? windowMs.daily;
  const cutoff = Date.now() - window;

  // Sum all spends in this window for the same asset
  const assetKey = String(asset);
  const windowSpend = spendHistory
    .filter((r) => r.timestamp >= cutoff && r.asset === assetKey)
    .reduce((sum, r) => sum + r.amount, 0);

  const projectedTotal = windowSpend + amount;

  if (projectedTotal > limits.amount) {
    return {
      allow: false,
      reason: `Spending limit exceeded: ${projectedTotal.toFixed(2)} > ${limits.amount} (${limits.period} limit for ${assetKey}).`,
    };
  }

  return { allow: true };
}

// ─── 3. Allowlist / Blocklist (Req 15) ──────────────────────────────────────

const blocklist: Set<string> = new Set();
const allowlist: Set<string> = new Set();

export function blockAddress(address: string): void {
  blocklist.add(address.toUpperCase());
}

export function allowAddress(address: string): void {
  allowlist.add(address.toUpperCase());
}

function checkAllowBlocklist(recipientAddress: string): GuardrailResult {
  const upper = recipientAddress.toUpperCase();

  // If allowlist is configured and address is not in it → deny
  if (allowlist.size > 0 && !allowlist.has(upper)) {
    return {
      allow: false,
      reason: `Recipient ${recipientAddress} is not on the approved allowlist.`,
    };
  }

  // If address is on blocklist → deny
  if (blocklist.has(upper)) {
    return {
      allow: false,
      reason: `Recipient ${recipientAddress} is blocked.`,
    };
  }

  return { allow: true };
}

// ─── 4. Self-send Protection ─────────────────────────────────────────────────

function checkSelfSend(
  senderAddress: string,
  recipientAddress: string
): GuardrailResult {
  if (senderAddress.toUpperCase() === recipientAddress.toUpperCase()) {
    return {
      allow: false,
      reason: "Cannot send to your own wallet address.",
    };
  }
  return { allow: true };
}

// ─── 5. Zero Amount Protection ───────────────────────────────────────────────

function checkZeroAmount(amount: number): GuardrailResult {
  if (amount <= 0) {
    return { allow: false, reason: "Amount must be greater than zero." };
  }
  return { allow: true };
}

// ─── 6. Master Guardrail Check (runs all checks in order) ────────────────────

/**
 * Run all guardrail checks before signing a transaction.
 * Returns the first failing check or { allow: true } if all pass.
 *
 * Call this BEFORE building the atomic group or calling Intermezzo.
 */
export function runGuardrails(ctx: GuardrailContext): GuardrailResult {
  const checks: GuardrailResult[] = [
    validateAddress(ctx.recipientAddress),
    checkSelfSend(ctx.senderAddress, ctx.recipientAddress),
    checkZeroAmount(ctx.amount),
    checkAllowBlocklist(ctx.recipientAddress),
    checkSpendingLimit(ctx.amount, ctx.asset),
  ];

  for (const check of checks) {
    if (!check.allow) return check;
  }

  return { allow: true };
}
