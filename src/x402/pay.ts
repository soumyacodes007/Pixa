/**
 * x402 Protocol Payment Handler
 * Req 11: pay for x402 services
 *
 * The x402 Protocol flow:
 *  1. Agent makes HTTP request to a service URL
 *  2. Service returns HTTP 402 with X-Payment header:
 *     { price: "0.05 USDC", payTo: "ALGO_ADDRESS", network: "algorand-mainnet" }
 *  3. Agent builds & signs an Algorand USDC transaction
 *  4. Agent retries the request with:
 *     Authorization: x402 <base64-encoded-tx>
 *  5. Service verifies the on-chain payment and returns data
 *
 * This module handles steps 1-5 for Algorand.
 */

import algosdk from "algosdk";
import { getNetworkEndpoints } from "../config.js";
import { runGuardrails } from "../wallet/guardrails.js";
import { buildUsdcTransfer } from "../wallet/transactions.js";
import { createAlgodClient } from "../wallet/queries.js";
import { getIntermezzoClient } from "../wallet/intermezzo.js";

// --- Types ---

export interface X402PaymentChallenge {
  price: number;           // in USDC
  payToAddress: string;    // Algorand wallet address to pay
  network: "testnet" | "mainnet";
  serviceUrl: string;
  resourceId?: string;
}

export interface X402PayResult {
  success: boolean;
  txId?: string;
  authHeader?: string;       // "x402 <base64-encoded-tx>"
  responseBody?: string;     // the actual paid response from the service
  statusCode?: number;
  error?: string;
}

// --- x402 Header Parser ---

/**
 * Parse the X-Payment header from a 402 response.
 * GoPlausible format: { price_usdc, pay_to, network }
 * Standard x402 format: { price, payTo, asset, network }
 */
export function parsePaymentChallenge(
  headers: Record<string, string>,
  serviceUrl: string
): X402PaymentChallenge | null {
  // Try X-Payment header (GoPlausible style)
  const xPayment = headers["x-payment"] ?? headers["X-Payment"];
  if (xPayment) {
    try {
      const parsed = JSON.parse(xPayment);
      const price =
        parsed.price_usdc ??
        parsed.price?.replace?.("$", "").replace?.(" USDC", "") ??
        parsed.amount ?? 0;
      const payTo =
        parsed.pay_to ?? parsed.payTo ?? parsed.wallet_address ?? "";
      const network =
        parsed.network === "algorand-mainnet"
          ? "mainnet"
          : "testnet";

      if (!payTo) return null;

      return {
        price: parseFloat(String(price)),
        payToAddress: payTo,
        network,
        serviceUrl,
        resourceId: parsed.resource_id ?? parsed.id,
      };
    } catch {
      return null;
    }
  }

  // Try WWW-Authenticate: x402 header
  const wwwAuth = headers["www-authenticate"] ?? headers["WWW-Authenticate"];
  if (wwwAuth?.startsWith("x402 ")) {
    try {
      const b64 = wwwAuth.slice(5).trim();
      const parsed = JSON.parse(Buffer.from(b64, "base64").toString());
      return {
        price: parsed.price ?? 0,
        payToAddress: parsed.payTo ?? "",
        network: parsed.network?.includes("mainnet") ? "mainnet" : "testnet",
        serviceUrl,
      };
    } catch {
      return null;
    }
  }

  return null;
}

// --- x402 Full Payment Flow ---

/**
 * Execute the complete x402 payment flow (Req 11):
 * 1. Make initial request → get 402
 * 2. Parse payment challenge
 * 3. Build & sign USDC payment via Intermezzo
 * 4. Retry with Authorization: x402 <tx>
 * 5. Return the paid response body
 */
export async function payAndFetch(opts: {
  serviceUrl: string;
  senderAddress: string;
  sessionToken: string;
  network: "testnet" | "mainnet";
  maxPrice?: number;           // guardrail: refuse if price > this
  requestOptions?: RequestInit;
}): Promise<X402PayResult> {
  const {
    serviceUrl,
    senderAddress,
    sessionToken,
    network,
    maxPrice = 10.0, // default: refuse payments > $10 USDC
    requestOptions = {},
  } = opts;

  // ─── Step 1: Initial request ───────────────────────────────────────────────
  let res: Response;
  try {
    res = await fetch(serviceUrl, requestOptions);
  } catch (err: any) {
    return { success: false, error: `Network error: ${err.message}` };
  }

  // If not 402, return directly
  if (res.status !== 402) {
    const body = await res.text();
    return {
      success: res.ok,
      statusCode: res.status,
      responseBody: body,
      error: res.ok ? undefined : `HTTP ${res.status}: ${body.slice(0, 200)}`,
    };
  }

  // ─── Step 2: Parse payment challenge ──────────────────────────────────────
  const headersObj: Record<string, string> = {};
  res.headers.forEach((value, key) => { headersObj[key] = value; });

  const challenge = parsePaymentChallenge(headersObj, serviceUrl);
  if (!challenge) {
    return {
      success: false,
      statusCode: 402,
      error: "Received 402 but could not parse payment challenge from headers",
    };
  }

  // ─── Step 3: Price guardrail ───────────────────────────────────────────────
  if (challenge.price > maxPrice) {
    return {
      success: false,
      error: `Refused: service price $${challenge.price} USDC exceeds your max-price limit of $${maxPrice} USDC`,
    };
  }

  // ─── Step 4: Run standard guardrails ──────────────────────────────────────
  const guardResult = runGuardrails({
    senderAddress,
    recipientAddress: challenge.payToAddress,
    amount: challenge.price,
    asset: "USDC",
    network: challenge.network,
  });

  if (!guardResult.allow) {
    return {
      success: false,
      error: `Guardrail blocked payment: ${guardResult.reason}`,
    };
  }

  // ─── Step 5: Build USDC payment transaction ────────────────────────────────
  const ep = getNetworkEndpoints(challenge.network);
  let group;
  try {
    group = await buildUsdcTransfer(
      senderAddress,
      challenge.payToAddress,
      challenge.price,
      ep.usdcAssetId,
      senderAddress, // backend address (same for mock)
      challenge.network
    );
  } catch (err: any) {
    return { success: false, error: `Failed to build payment tx: ${err.message}` };
  }

  // ─── Step 6: Sign via Intermezzo ─────────────────────────────────────────
  const intermezzo = getIntermezzoClient();
  let signResult;
  try {
    signResult = await intermezzo.signTransactions(
      group.unsignedTxns,
      group.userTxIndices,
      sessionToken
    );
  } catch (err: any) {
    return { success: false, error: `Signing failed: ${err.message}` };
  }

  // ─── Step 7: Broadcast transaction ───────────────────────────────────────
  const algod = createAlgodClient(challenge.network);
  let txId: string;
  try {
    await algod.sendRawTransaction(signResult.signedTxns).do();
    txId = signResult.txIds[1] ?? signResult.txIds[0] ?? "";
  } catch (err: any) {
    return { success: false, error: `Broadcast failed: ${err.message}` };
  }

  // ─── Step 8: Build x402 auth header ──────────────────────────────────────
  // x402 standard: Authorization: x402 <base64(JSON { txId, network })>
  const authPayload = Buffer.from(
    JSON.stringify({ txId, network: challenge.network, asset: "USDC" })
  ).toString("base64");
  const authHeader = `x402 ${authPayload}`;

  // ─── Step 9: Retry request with payment proof ─────────────────────────────
  try {
    const retryRes = await fetch(serviceUrl, {
      ...requestOptions,
      headers: {
        ...(requestOptions.headers as Record<string, string> ?? {}),
        Authorization: authHeader,
      },
    });

    const body = await retryRes.text();
    return {
      success: retryRes.ok,
      txId,
      authHeader,
      statusCode: retryRes.status,
      responseBody: body,
      error: retryRes.ok ? undefined : `Service returned ${retryRes.status} after payment`,
    };
  } catch (err: any) {
    // Payment sent but retry failed — return txId so user can verify
    return {
      success: false,
      txId,
      authHeader,
      error: `Payment sent (txId: ${txId}) but retry request failed: ${err.message}`,
    };
  }
}
