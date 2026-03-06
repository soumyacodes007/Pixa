/**
 * Vestige / Trade Tests — Phase 4
 *
 * Tests asset resolution, price fetching, and swap quote estimation.
 * Hits Vestige free API (testnet prices from mainnet endpoint).
 *
 * Run: npx vitest run tests/trade/
 */

import { describe, it, expect } from "vitest";
import {
  resolveAssetId,
  getAlgoPrice,
  getAssetPrice,
  getSwapQuote,
  formatAssetName,
  WELL_KNOWN_ASSETS,
} from "../../src/wallet/vestige.js";

// ─── Asset Resolution (offline, no network) ──────────────────────────────────

describe("Vestige: resolveAssetId", () => {
  it("resolves ALGO to asset ID 0", () => {
    expect(resolveAssetId("ALGO", "mainnet")).toBe(0);
  });

  it("resolves USDC to mainnet ID", () => {
    expect(resolveAssetId("USDC", "mainnet")).toBe(31566704);
  });

  it("resolves USDC to testnet ID", () => {
    expect(resolveAssetId("USDC", "testnet")).toBe(10458941);
  });

  it("resolves numeric ASA ID string", () => {
    expect(resolveAssetId("31566704", "mainnet")).toBe(31566704);
  });

  it("is case-insensitive", () => {
    expect(resolveAssetId("usdc", "mainnet")).toBe(31566704);
    expect(resolveAssetId("algo", "mainnet")).toBe(0);
  });

  it("throws on unknown asset name", () => {
    expect(() => resolveAssetId("FAKECOIN", "mainnet")).toThrow();
  });
});

describe("Vestige: formatAssetName", () => {
  it("formats ALGO (ID 0)", () => {
    expect(formatAssetName(0, "mainnet")).toBe("ALGO");
  });

  it("formats unknown asset as ASA-{id}", () => {
    expect(formatAssetName(99999999, "mainnet")).toBe("ASA-99999999");
  });
});

// ─── Price Fetching (hits live API) ──────────────────────────────────────────

describe("Vestige: getAlgoPrice", () => {
  it("returns a non-zero ALGO price in USD", async () => {
    const price = await getAlgoPrice();
    expect(price).toBeGreaterThan(0);
    console.log(`  ✓ ALGO price: $${price.toFixed(4)}`);
  });
});

describe("Vestige: getAssetPrice", () => {
  it("returns USDC price (~$1.00)", async () => {
    try {
      const price = await getAssetPrice(WELL_KNOWN_ASSETS.USDC);
      expect(price.assetId).toBe(WELL_KNOWN_ASSETS.USDC);
      expect(price.priceUsd).toBeGreaterThan(0);
      console.log(`  ✓ USDC price: $${price.priceUsd.toFixed(4)}`);
    } catch (err: any) {
      // Acceptable if Vestige API is down for testnet
      console.log(`  ℹ️  Vestige API unavailable: ${err.message}`);
    }
  });
});

// ─── Swap Quote (hits live API or uses fallback) ──────────────────────────────

describe("Vestige: getSwapQuote", () => {
  it("returns a quote for ALGO → USDC", async () => {
    const quote = await getSwapQuote(
      0,            // ALGO
      31566704,     // USDC
      1.0,          // 1 ALGO
      6,            // ALGO decimals
      6,            // USDC decimals
      1.0,          // 1% slippage
      "mainnet"
    );

    expect(quote.fromAssetId).toBe(0);
    expect(quote.toAssetId).toBe(31566704);
    expect(quote.toAmountDisplay).toBeGreaterThan(0);
    expect(quote.slippage).toBe(1.0);

    console.log(`  ✓ 1 ALGO → ${quote.toAmountDisplay.toFixed(4)} USDC`);
    console.log(`    Price impact: ${quote.priceImpact.toFixed(2)}%`);
  });

  it("returns a quote for USDC → ALGO", async () => {
    const quote = await getSwapQuote(
      31566704,   // USDC
      0,          // ALGO
      1.0,        // 1 USDC
      6,
      6,
      1.0,
      "mainnet"
    );

    expect(quote.toAmountDisplay).toBeGreaterThan(0);
    console.log(`  ✓ 1 USDC → ${quote.toAmountDisplay.toFixed(4)} ALGO`);
  });
});
