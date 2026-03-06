/**
 * Wallet Funding Tests — Phase 7
 *
 * Tests funding methods generation, deposit watcher, and dispenser URL.
 * Run: npx vitest run tests/funding/
 */

import { describe, it, expect } from "vitest";
import {
  getFundingMethods,
  getTestnetDispenserUrl,
  checkDeposits,
} from "../../src/wallet/funding.js";

const VALID_ADDRESS = "GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A";

// ─── Funding Methods (offline) ───────────────────────────────────────────────

describe("Funding: getFundingMethods", () => {
  it("returns testnet methods with dispenser", () => {
    const info = getFundingMethods(VALID_ADDRESS, "testnet");
    expect(info.walletAddress).toBe(VALID_ADDRESS);
    expect(info.network).toBe("testnet");
    expect(info.methods.length).toBeGreaterThan(0);

    // Should have the testnet dispenser
    const dispenser = info.methods.find((m) => m.type === "testnet");
    expect(dispenser).toBeDefined();
    expect(dispenser!.url).toContain("bank.testnet.algorand.network");
    console.log(`  ✓ Testnet: ${info.methods.length} funding methods`);
  });

  it("returns mainnet methods with Pera Fund", () => {
    const info = getFundingMethods(VALID_ADDRESS, "mainnet");
    expect(info.network).toBe("mainnet");
    expect(info.methods.length).toBeGreaterThan(0);

    // Should have Pera Fund (fiat)
    const fiat = info.methods.find((m) => m.type === "fiat");
    expect(fiat).toBeDefined();
    expect(fiat!.url).toContain("perawallet.app");
    console.log(`  ✓ Mainnet: ${info.methods.length} funding methods`);
  });

  it("includes wallet address in all methods", () => {
    const info = getFundingMethods(VALID_ADDRESS, "mainnet");
    for (const m of info.methods) {
      if (m.url) {
        // URL methods should include the address
        expect(m.url).toContain(VALID_ADDRESS);
      } else {
        // Non-URL methods should describe the address
        expect(m.description).toContain(VALID_ADDRESS);
      }
    }
  });
});

describe("Funding: getTestnetDispenserUrl", () => {
  it("generates correct dispenser URL", () => {
    const url = getTestnetDispenserUrl(VALID_ADDRESS);
    expect(url).toContain("bank.testnet.algorand.network");
    expect(url).toContain(VALID_ADDRESS);
    console.log(`  ✓ Dispenser URL: ${url}`);
  });
});

// ─── Deposit Watcher (hits testnet Indexer) ──────────────────────────────────

describe("Funding: checkDeposits", () => {
  it("returns deposits array (may be empty for new address)", async () => {
    const deposits = await checkDeposits(VALID_ADDRESS, "testnet", 0, 3);
    expect(Array.isArray(deposits)).toBe(true);
    console.log(`  ✓ Found ${deposits.length} deposit(s) for ${VALID_ADDRESS.slice(0, 8)}...`);

    if (deposits.length > 0) {
      const d = deposits[0];
      expect(d).toHaveProperty("txId");
      expect(d).toHaveProperty("amount");
      expect(d).toHaveProperty("asset");
      expect(d).toHaveProperty("sender");
      console.log(`    First deposit: ${d.amount} ${d.asset} from ${d.sender.slice(0, 8)}...`);
    }
  });

  it("deposit shape is correct", async () => {
    const deposits = await checkDeposits(VALID_ADDRESS, "testnet", 0, 1);
    if (deposits.length > 0) {
      const d = deposits[0];
      expect(typeof d.txId).toBe("string");
      expect(typeof d.amount).toBe("number");
      expect(typeof d.asset).toBe("string");
      expect(typeof d.sender).toBe("string");
      expect(typeof d.confirmedRound).toBe("number");
    }
  });
});
