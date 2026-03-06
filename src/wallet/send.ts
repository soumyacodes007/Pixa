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

import algosdk from "algosdk";
import { getNetworkEndpoints } from "../config.js";
import { buildUsdcTransfer, buildAlgoTransfer } from "./transactions.js";
import { createAlgodClient, waitForConfirmation } from "./queries.js";
import { getIntermezzoClient } from "./intermezzo.js";
import { runGuardrails, recordSpend, type GuardrailContext } from "./guardrails.js";

// --- Types ---

export type SendAsset = "ALGO" | "USDC";

export interface SendOptions {
  senderAddress: string;
  recipientAddress: string;
  amount: number;        // display units (e.g. 1.5 USDC or 1.5 ALGO)
  asset: SendAsset;
  network: "testnet" | "mainnet";
  sessionToken: string;  // JWT from auth — passed to Intermezzo
  dryRun?: boolean;      // If true, build the group but don't broadcast
  // In production, Intermezzo backend wallet pays fees.
  // For dev/mock mode, we use the sender address as a stand-in.
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

// --- Send Executor ---

export async function sendPayment(opts: SendOptions): Promise<SendResult> {
  const {
    senderAddress,
    recipientAddress,
    amount,
    asset,
    network,
    sessionToken,
    dryRun = false,
    backendAddress = senderAddress, // mock: sender pays own fee
  } = opts;

  const ep = getNetworkEndpoints(network);

  // ─── Step 1: Guardrail checks ────────────────────────────────────────────
  const ctx: GuardrailContext = {
    senderAddress,
    recipientAddress,
    amount,
    asset,
    network,
  };

  const guardrail = runGuardrails(ctx);
  if (!guardrail.allow) {
    return { success: false, error: `Guardrail blocked: ${guardrail.reason}` };
  }

  // ─── Step 2: Build fee-pooled atomic group ───────────────────────────────
  let group;
  try {
    if (asset === "USDC") {
      group = await buildUsdcTransfer(
        senderAddress,
        recipientAddress,
        amount,
        ep.usdcAssetId,
        backendAddress,
        network
      );
    } else {
      group = await buildAlgoTransfer(
        senderAddress,
        recipientAddress,
        amount,
        backendAddress,
        network
      );
    }
  } catch (err: any) {
    return { success: false, error: `Failed to build transaction: ${err.message}` };
  }

  // ─── Step 3: Dry run — return without broadcasting ───────────────────────
  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      fee: group.totalFee,
      txId: group.unsignedTxns[1]?.txID() ?? "DRY-RUN",
    };
  }

  // ─── Step 4: Sign via Intermezzo ─────────────────────────────────────────
  const intermezzo = getIntermezzoClient();
  let signResult;
  try {
    signResult = await intermezzo.signTransactions(
      group.unsignedTxns,
      group.userTxIndices, // only sign user txns; fee-pooling tx is signed by backend
      sessionToken
    );
  } catch (err: any) {
    return { success: false, error: `Signing failed: ${err.message}` };
  }

  // ─── Step 5: Broadcast ───────────────────────────────────────────────────
  const algod = createAlgodClient(network);
  let txId: string;
  try {
    // In mock mode, signResult.signedTxns are encoded UNSIGNED txns.
    // In prod mode, they are properly signed.
    const sendResult = await algod.sendRawTransaction(signResult.signedTxns).do();
    txId = String(signResult.txIds[1] ?? (sendResult as any).txId ?? "");
  } catch (err: any) {
    return { success: false, error: `Broadcast failed: ${err.message}` };
  }

  // ─── Step 6: Wait for confirmation ───────────────────────────────────────
  try {
    const confirmed = await waitForConfirmation(txId, network, 10);
    const confirmedRound = Number((confirmed as any)["confirmed-round"] ?? (confirmed as any).confirmedRound ?? 0);

    // Record the spend for guardrail tracking
    recordSpend(amount, asset);

    return {
      success: true,
      txId,
      confirmedRound,
      fee: group.totalFee,
    };
  } catch (err: any) {
    // Tx might still be pending — return txId so user can check manually
    return {
      success: true,
      txId,
      error: `Sent but confirmation timed out: ${err.message}`,
    };
  }
}
