/**
 * Monetize SDK Tests — Phase 6
 *
 * Tests the paymentMiddleware, 402 challenge generation,
 * replay protection, and Bazaar manifest generation.
 * Uses Express + supertest-like direct HTTP calls.
 *
 * Run: npx vitest run tests/monetize/
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import http from "http";
import { paymentMiddleware, generateBazaarManifest } from "../../src/monetize/middleware.js";

const PAY_TO = "GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A";
const PORT = 3333;
let server: http.Server;

// ─── Setup test server ────────────────────────────────────────────────────────

beforeAll(async () => {
  const app = express();
  app.use(express.json());

  const routes = {
    "GET /api/data": { price: "$0.01", description: "Test endpoint" },
    "POST /api/query": { price: "$0.25", description: "Query runner" },
  };

  const payment = paymentMiddleware(PAY_TO, routes, {
    network: "algorand-testnet",
  });

  // Free endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Paid endpoints
  app.get("/api/data", payment, (_req, res) => {
    res.json({ data: "premium data", paid: true });
  });

  app.post("/api/query", payment, (req, res) => {
    res.json({ result: "answer", paid: true });
  });

  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => resolve());
  });
});

afterAll(() => {
  server?.close();
});

// ─── Helper ──────────────────────────────────────────────────────────────────

async function fetchLocal(path: string, init?: RequestInit) {
  return fetch(`http://localhost:${PORT}${path}`, init);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Monetize: free endpoint", () => {
  it("/health returns 200 (no payment needed)", async () => {
    const res = await fetchLocal("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});

describe("Monetize: 402 Payment Challenge", () => {
  it("GET /api/data returns 402 without auth header", async () => {
    const res = await fetchLocal("/api/data");
    expect(res.status).toBe(402);
    const body = (await res.json()) as any;
    expect(body.x402).toBe(true);
    expect(body.payment.price_usdc).toBe(0.01);
    expect(body.payment.pay_to).toBe(PAY_TO);
    console.log(`  ✓ 402 challenge: pay $${body.payment.price_usdc} USDC to ${body.payment.pay_to.slice(0, 8)}...`);
  });

  it("POST /api/query returns 402 without auth header", async () => {
    const res = await fetchLocal("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "test" }),
    });
    expect(res.status).toBe(402);
    const body = (await res.json()) as any;
    expect(body.payment.price_usdc).toBe(0.25);
  });

  it("402 response includes X-Payment header", async () => {
    const res = await fetchLocal("/api/data");
    const xPayment = res.headers.get("x-payment");
    expect(xPayment).toBeTruthy();
    const parsed = JSON.parse(xPayment!);
    expect(parsed.pay_to).toBe(PAY_TO);
    expect(parsed.asset_id).toBe(10458941); // testnet USDC
    console.log(`  ✓ X-Payment header includes asset_id: ${parsed.asset_id}`);
  });

  it("402 response includes human-readable instructions", async () => {
    const res = await fetchLocal("/api/data");
    const body = (await res.json()) as any;
    expect(body.instructions).toBeDefined();
    expect(body.instructions.length).toBeGreaterThan(0);
  });
});

describe("Monetize: malformed auth header", () => {
  it("rejects malformed x402 header", async () => {
    const res = await fetchLocal("/api/data", {
      headers: { Authorization: "x402 not-valid-base64!!!" },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toContain("Malformed");
  });

  it("rejects missing txId in payment proof", async () => {
    const proof = Buffer.from(JSON.stringify({ network: "testnet" })).toString("base64");
    const res = await fetchLocal("/api/data", {
      headers: { Authorization: `x402 ${proof}` },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toContain("txId");
  });

  it("rejects a fake txId (on-chain verification fail)", async () => {
    const proof = Buffer.from(JSON.stringify({
      txId: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      network: "algorand-testnet",
      asset: "USDC",
    })).toString("base64");
    const res = await fetchLocal("/api/data", {
      headers: { Authorization: `x402 ${proof}` },
    });
    expect(res.status).toBe(402);
    const body = (await res.json()) as any;
    expect(body.error).toBe("Payment Verification Failed");
    console.log(`  ✓ Fake txId rejected: ${body.reason}`);
  });
});

describe("Monetize: generateBazaarManifest", () => {
  it("generates correct manifest structure", () => {
    const manifest = generateBazaarManifest(
      PAY_TO,
      { "GET /api/data": "$0.05" },
      {
        name: "Test API",
        description: "A test API",
        serviceUrl: "http://localhost:3002",
        tags: ["test"],
      }
    );

    expect(manifest.name).toBe("Test API");
    expect(manifest.x402).toBe(true);
    expect(manifest.blockchain).toBe("algorand");
    expect(Array.isArray(manifest.routes)).toBe(true);
    const routes = manifest.routes as any[];
    expect(routes[0].price_usdc).toBe(0.05);
    expect(routes[0].pay_to).toBe(PAY_TO);
    console.log(`  ✓ Manifest generated: ${routes.length} route(s)`);
  });
});
