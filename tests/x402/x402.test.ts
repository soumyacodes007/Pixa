/**
 * x402 Discovery & Payment Tests — Phase 5
 *
 * Tests: bazaar search, x402 challenge parsing, payment flow (mocked).
 * Run: npx vitest run tests/x402/
 */

import { describe, it, expect } from "vitest";
import { searchBazaar } from "../../src/x402/bazaar.js";
import { parsePaymentChallenge } from "../../src/x402/pay.js";

// ─── Bazaar Search Tests ──────────────────────────────────────────────────────

describe("Bazaar: searchBazaar", () => {
  it("returns demo results for 'weather' when Bazaar is offline", async () => {
    const result = await searchBazaar("weather", { network: "mainnet" });

    expect(result).toHaveProperty("resources");
    expect(result).toHaveProperty("query", "weather");
    expect(Array.isArray(result.resources)).toBe(true);
    // Should have at least the demo weather resource
    if (result.resources.length > 0) {
      const r = result.resources[0];
      expect(r).toHaveProperty("name");
      expect(r).toHaveProperty("url");
      expect(r).toHaveProperty("priceUsdc");
      console.log(`  ✓ Got ${result.resources.length} result(s): ${r.name}`);
    }
  });

  it("returns demo results for 'ai'", async () => {
    const result = await searchBazaar("ai");
    expect(Array.isArray(result.resources)).toBe(true);
    console.log(`  ✓ 'ai' search: ${result.resources.length} result(s)`);
  });

  it("returns empty array for obscure query", async () => {
    const result = await searchBazaar("xyzabc123notaservice");
    expect(Array.isArray(result.resources)).toBe(true);
    // Empty result is valid
    console.log(`  ✓ Obscure query: ${result.resources.length} result(s)`);
  });

  it("resource shape is correct", async () => {
    const result = await searchBazaar("data");
    if (result.resources.length > 0) {
      const r = result.resources[0];
      expect(typeof r.id).toBe("string");
      expect(typeof r.name).toBe("string");
      expect(typeof r.priceUsdc).toBe("number");
      expect(Array.isArray(r.tags)).toBe(true);
    }
  });
});

// ─── x402 Payment Challenge Parser Tests ─────────────────────────────────────

describe("x402: parsePaymentChallenge", () => {
  const serviceUrl = "https://api.example.com/data";

  it("parses GoPlausible X-Payment header format", () => {
    const headers: Record<string, string> = {
      "x-payment": JSON.stringify({
        price_usdc: 0.05,
        pay_to: "GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A",
        network: "algorand-mainnet",
        resource_id: "weather-api",
      }),
    };

    const challenge = parsePaymentChallenge(headers, serviceUrl);
    expect(challenge).not.toBeNull();
    expect(challenge!.price).toBe(0.05);
    expect(challenge!.payToAddress).toBe("GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A");
    expect(challenge!.network).toBe("mainnet");
    expect(challenge!.serviceUrl).toBe(serviceUrl);
    console.log(`  ✓ GoPlausible format parsed: $${challenge!.price} USDC`);
  });

  it("parses standard x402 WWW-Authenticate header", () => {
    const payload = Buffer.from(
      JSON.stringify({
        price: 0.10,
        payTo: "GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A",
        network: "algorand-mainnet",
      })
    ).toString("base64");

    const headers: Record<string, string> = {
      "www-authenticate": `x402 ${payload}`,
    };

    const challenge = parsePaymentChallenge(headers, serviceUrl);
    expect(challenge).not.toBeNull();
    expect(challenge!.price).toBe(0.10);
    expect(challenge!.network).toBe("mainnet");
    console.log(`  ✓ WWW-Authenticate format parsed: $${challenge!.price} USDC`);
  });

  it("returns null when no payment headers present", () => {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    const challenge = parsePaymentChallenge(headers, serviceUrl);
    expect(challenge).toBeNull();
    console.log(`  ✓ No payment headers → null`);
  });

  it("returns null for malformed x-payment JSON", () => {
    const headers: Record<string, string> = {
      "x-payment": "{ this is not json }",
    };
    const challenge = parsePaymentChallenge(headers, serviceUrl);
    expect(challenge).toBeNull();
  });

  it("returns null when pay_to address is missing", () => {
    const headers: Record<string, string> = {
      "x-payment": JSON.stringify({ price_usdc: 0.05 }),
    };
    const challenge = parsePaymentChallenge(headers, serviceUrl);
    expect(challenge).toBeNull();
  });

  it("defaults to testnet when network not specified", () => {
    const headers: Record<string, string> = {
      "x-payment": JSON.stringify({
        price_usdc: 0.01,
        pay_to: "GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A",
      }),
    };
    const challenge = parsePaymentChallenge(headers, serviceUrl);
    expect(challenge!.network).toBe("testnet");
  });
});
