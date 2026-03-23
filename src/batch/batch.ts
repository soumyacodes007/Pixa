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

import { readFile } from "fs/promises";
import { sendPayment } from "../wallet/send.js";
import { logger } from "../utils/production.js";

// --- Types ---

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

// --- Validation ---

function validateBatchFile(batch: BatchFile): { valid: boolean; error?: string } {
  if (!batch.transactions || !Array.isArray(batch.transactions)) {
    return { valid: false, error: "Missing or invalid 'transactions' array" };
  }

  if (batch.transactions.length === 0) {
    return { valid: false, error: "No transactions specified" };
  }

  if (batch.transactions.length > 16) {
    return { valid: false, error: "Maximum 16 transactions per batch (Algorand atomic group limit)" };
  }

  for (let i = 0; i < batch.transactions.length; i++) {
    const tx = batch.transactions[i];
    
    if (!tx.type) {
      return { valid: false, error: `Transaction ${i}: missing 'type' field` };
    }

    if (tx.type === "send") {
      if (!tx.amount || !tx.recipient || !tx.asset) {
        return { valid: false, error: `Transaction ${i}: send requires amount, recipient, and asset` };
      }
    } else if (tx.type === "trade") {
      if (!tx.amount || !tx.from || !tx.to) {
        return { valid: false, error: `Transaction ${i}: trade requires amount, from, and to` };
      }
    } else if (tx.type === "opt-in") {
      if (!tx.assetId) {
        return { valid: false, error: `Transaction ${i}: opt-in requires assetId` };
      }
    } else {
      return { valid: false, error: `Transaction ${i}: unsupported type '${tx.type}'` };
    }
  }

  return { valid: true };
}

// --- Batch Execution ---

export async function executeBatch(
  filePath: string,
  senderAddress: string,
  sessionToken: string,
  options: {
    network?: "testnet" | "mainnet";
    dryRun?: boolean;
    backendAddress?: string;
  } = {}
): Promise<BatchResult> {
  try {
    // Read and parse batch file
    const fileContent = await readFile(filePath, "utf-8");
    let batch: BatchFile;
    
    try {
      batch = JSON.parse(fileContent);
    } catch (parseError) {
      return {
        success: false,
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        results: [],
        error: `Invalid JSON in batch file: ${parseError}`,
      };
    }

    // Validate batch file
    const validation = validateBatchFile(batch);
    if (!validation.valid) {
      return {
        success: false,
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        results: [],
        error: validation.error,
      };
    }

    const network = options.network || batch.network || "testnet";
    const dryRun = options.dryRun || batch.dryRun || false;

    logger.info(`Executing batch of ${batch.transactions.length} transactions`, {
      network,
      dryRun,
      filePath,
    });

    // Execute transactions sequentially for now
    // TODO: In production, build atomic group for true atomicity
    const results: BatchResult["results"] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < batch.transactions.length; i++) {
      const tx = batch.transactions[i];
      
      try {
        if (tx.type === "send") {
          const result = await sendPayment({
            senderAddress,
            recipientAddress: tx.recipient!,
            amount: tx.amount!,
            asset: tx.asset! as any,
            network,
            sessionToken,
            dryRun,
            backendAddress: options.backendAddress,
          });

          if (result.success) {
            results.push({
              index: i,
              transaction: tx,
              success: true,
              txId: result.txId,
            });
            successCount++;
          } else {
            results.push({
              index: i,
              transaction: tx,
              success: false,
              error: result.error,
            });
            failCount++;
          }
        } else if (tx.type === "trade") {
          // TODO: Implement trade execution via Vestige
          results.push({
            index: i,
            transaction: tx,
            success: false,
            error: "Trade execution not yet implemented in batch mode",
          });
          failCount++;
        } else if (tx.type === "opt-in") {
          // TODO: Implement asset opt-in
          results.push({
            index: i,
            transaction: tx,
            success: false,
            error: "Asset opt-in not yet implemented in batch mode",
          });
          failCount++;
        }
      } catch (error: any) {
        results.push({
          index: i,
          transaction: tx,
          success: false,
          error: error.message,
        });
        failCount++;
      }
    }

    const success = failCount === 0;
    
    logger.info(`Batch execution completed`, {
      success,
      total: batch.transactions.length,
      successful: successCount,
      failed: failCount,
    });

    return {
      success,
      totalTransactions: batch.transactions.length,
      successfulTransactions: successCount,
      failedTransactions: failCount,
      results,
    };

  } catch (error: any) {
    return {
      success: false,
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      results: [],
      error: `Batch execution failed: ${error.message}`,
    };
  }
}

// --- CLI Helper ---

export function generateBatchTemplate(): BatchFile {
  return {
    transactions: [
      {
        type: "send",
        amount: 1.0,
        recipient: "EXAMPLE_ADDRESS_HERE",
        asset: "USDC",
      },
      {
        type: "send",
        amount: 0.5,
        recipient: "ANOTHER_ADDRESS_HERE",
        asset: "ALGO",
      },
    ],
    network: "testnet",
    dryRun: true,
  };
}