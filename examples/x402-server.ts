/**
 * Example x402 Server — Powered by Algopay Monetize SDK
 *
 * This is a complete working example of a paid API using Algopay's
 * paymentMiddleware. Drop this in front of any Express API to monetize it.
 *
 * Run:
 *   npx tsx examples/x402-server.ts
 *
 * Test (no payment → gets 402):
 *   curl -i http://localhost:3002/api/weather
 *
 * Test (with algopay):
 *   npx algopay x402 pay http://localhost:3002/api/weather
 */

import express from "express";
import { paymentMiddleware, generateBazaarManifest } from "../src/monetize/middleware.js";

const app = express();
app.use(express.json());

// ─── Configuration ────────────────────────────────────────────────────────────

const PAY_TO = process.env.ALGOPAY_PAY_TO ?? "GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A";
const PORT = parseInt(process.env.PORT ?? "3002", 10);
const NETWORK = (process.env.ALGOPAY_NETWORK ?? "algorand-testnet") as "algorand-testnet" | "algorand-mainnet";

// ─── Protected Routes ─────────────────────────────────────────────────────────

const routes = {
  "GET /api/weather": {
    price: "$0.01",
    description: "Real-time weather data for any city",
    network: NETWORK,
  },
  "GET /api/ai/summary": {
    price: "$0.05",
    description: "AI-powered text summarization",
    network: NETWORK,
  },
  "POST /api/ai/query": {
    price: "$0.25",
    description: "Run a natural language query against a dataset",
    network: NETWORK,
  },
};

// ─── Apply Payment Middleware ─────────────────────────────────────────────────

const payment = paymentMiddleware(PAY_TO, routes, { network: NETWORK });

// ─── Free Endpoints (no payment needed) ───────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "algopay-x402-example", version: "1.0.0" });
});

app.get("/", (_req, res) => {
  res.json({
    name: "Algopay x402 Example API",
    description: "Pay-per-request API powered by Algorand USDC",
    endpoints: [
      { path: "/api/weather", method: "GET", price: "$0.01 USDC" },
      { path: "/api/ai/summary", method: "GET", price: "$0.05 USDC" },
      { path: "/api/ai/query", method: "POST", price: "$0.25 USDC" },
    ],
    payTo: PAY_TO,
    x402: true,
  });
});

// ─── Paid Endpoints ───────────────────────────────────────────────────────────

app.get("/api/weather", payment, (_req, res) => {
  res.json({
    city: "Mumbai",
    temperature: 31.4,
    humidity: 72,
    aqi: 48,
    conditions: "Partly cloudy",
    timestamp: new Date().toISOString(),
    paid: true,
    txId: (_req as any).algopay?.txId,
  });
});

app.get("/api/ai/summary", payment, (_req, res) => {
  res.json({
    summary: "Algorand is a pure proof-of-stake blockchain that achieves instant finality in under 3 seconds.",
    model: "algopay-demo-v1",
    tokens_used: 42,
    paid: true,
    txId: (_req as any).algopay?.txId,
  });
});

app.post("/api/ai/query", payment, (req, res) => {
  const query = req.body?.query ?? "What is Algorand?";
  res.json({
    query,
    answer: `You asked: "${query}". Algorand processes over 6,000 TPS with instant finality.`,
    model: "algopay-demo-v1",
    paid: true,
    txId: (req as any).algopay?.txId,
  });
});

// ─── Bazaar Manifest Endpoint ─────────────────────────────────────────────────

app.get("/x402/manifest", (_req, res) => {
  const manifest = generateBazaarManifest(PAY_TO, routes, {
    name: "Algopay Example API",
    description: "Demo weather + AI service monetized with Algorand USDC",
    serviceUrl: `http://localhost:${PORT}`,
    provider: "Algopay",
    tags: ["weather", "ai", "algorand", "x402", "demo"],
  }, { network: NETWORK });

  res.json(manifest);
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 Algopay x402 Example Server`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Pay-to: ${PAY_TO}`);
  console.log(`   Network: ${NETWORK}\n`);
  console.log(`   Endpoints:`);
  console.log(`     GET  /api/weather     → $0.01 USDC`);
  console.log(`     GET  /api/ai/summary  → $0.05 USDC`);
  console.log(`     POST /api/ai/query    → $0.25 USDC`);
  console.log(`\n   Test: curl -i http://localhost:${PORT}/api/weather`);
  console.log(`   Pay:  npx algopay x402 pay http://localhost:${PORT}/api/weather\n`);
});
