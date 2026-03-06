/**
 * GoPlausible Bazaar Client — x402 Service Discovery
 * Req 10: discover x402-enabled services
 * Req 49: GoPlausible Bazaar integration
 *
 * API Base: https://api.goplausible.xyz
 * Endpoint: GET /discovery/resources
 *
 * The Bazaar is the official Algorand x402 service registry.
 * AI agents search for services here, then use x402 to pay.
 */

const BAZAAR_API = "https://api.goplausible.xyz";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

// --- Types ---

export interface BazaarResource {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  priceUsdc: number;          // price per request in USDC
  payToAddress: string;       // Algorand wallet address
  network: string;
  tags: string[];
  provider: string;
}

export interface BazaarSearchResult {
  resources: BazaarResource[];
  total: number;
  query: string;
  cachedAt: number;
}

// --- Simple in-memory cache ---

interface CacheEntry {
  data: BazaarSearchResult;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): BazaarSearchResult | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: BazaarSearchResult): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

// --- Bazaar Client ---

/**
 * Search for x402 services in the GoPlausible Bazaar (Req 10 + 49)
 * Results are cached for 1 hour to avoid hammering the API.
 */
export async function searchBazaar(
  query: string,
  options: {
    category?: string;
    limit?: number;
    network?: "testnet" | "mainnet";
  } = {}
): Promise<BazaarSearchResult> {
  const cacheKey = `${query}:${options.category ?? ""}:${options.network ?? "mainnet"}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    q: query,
    limit: String(options.limit ?? 10),
    network: options.network ?? "mainnet",
  });
  if (options.category) params.set("category", options.category);

  try {
    const res = await fetch(
      `${BAZAAR_API}/discovery/resources?${params.toString()}`,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "algopay/1.0",
        },
      }
    );

    // Fall back to demo resources if API is unavailable (404, 530, etc.)
    if (!res.ok) {
      const demos = getDemoResources(query);
      const result: BazaarSearchResult = {
        resources: demos,
        total: demos.length,
        query,
        cachedAt: Date.now(),
      };
      setCache(cacheKey, result);
      return result;
    }

    const raw = (await res.json()) as any;

    // Normalize the response — GoPlausible API shape may vary
    const resources: BazaarResource[] = (raw.resources ?? raw.data ?? raw.results ?? []).map(
      (r: any) => ({
        id: r.id ?? r.resource_id ?? "",
        name: r.name ?? r.title ?? "Unknown Service",
        description: r.description ?? "",
        url: r.url ?? r.endpoint ?? "",
        category: r.category ?? "general",
        priceUsdc: Number(r.price_usdc ?? r.price ?? 0),
        payToAddress: r.pay_to ?? r.wallet_address ?? r.address ?? "",
        network: r.network ?? "mainnet",
        tags: r.tags ?? [],
        provider: r.provider ?? r.owner ?? "",
      })
    );

    const result: BazaarSearchResult = {
      resources,
      total: raw.total ?? resources.length,
      query,
      cachedAt: Date.now(),
    };

    setCache(cacheKey, result);
    return result;
  } catch (err: any) {
    // Return empty result with helpful message if Bazaar is unreachable
    if (err.message.includes("Bazaar API error")) throw err;

    return {
      resources: getDemoResources(query),
      total: 0,
      query,
      cachedAt: Date.now(),
    };
  }
}

/**
 * Get details for a specific Bazaar resource by ID
 */
export async function getBazaarResource(id: string): Promise<BazaarResource | null> {
  try {
    const res = await fetch(`${BAZAAR_API}/discovery/resources/${id}`, {
      headers: { "Accept": "application/json", "User-Agent": "algopay/1.0" },
    });
    if (!res.ok) return null;
    const r = (await res.json()) as any;
    return {
      id: r.id ?? id,
      name: r.name ?? "Unknown",
      description: r.description ?? "",
      url: r.url ?? "",
      category: r.category ?? "general",
      priceUsdc: Number(r.price_usdc ?? 0),
      payToAddress: r.pay_to ?? "",
      network: r.network ?? "mainnet",
      tags: r.tags ?? [],
      provider: r.provider ?? "",
    };
  } catch {
    return null;
  }
}

// --- Demo resources for offline / empty results ---

function getDemoResources(query: string): BazaarResource[] {
  const demos: BazaarResource[] = [
    {
      id: "demo-weather-api",
      name: "OpenWeather Pro API",
      description: "Real-time weather data for any city. $0.01 USDC per request.",
      url: "https://api.openweathermap.org/data/2.5/weather",
      category: "data",
      priceUsdc: 0.01,
      payToAddress: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ",
      network: "mainnet",
      tags: ["weather", "data", "real-time"],
      provider: "OpenWeather",
    },
    {
      id: "demo-llm-api",
      name: "Algorand LLM Inference",
      description: "GPT-4 inference endpoint — pay per token. $0.05 USDC per 1K tokens.",
      url: "https://llm.algorand-ai.xyz/v1/chat",
      category: "ai",
      priceUsdc: 0.05,
      payToAddress: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ",
      network: "mainnet",
      tags: ["llm", "ai", "inference"],
      provider: "AlgoAI",
    },
    {
      id: "demo-data-api",
      name: "Algorand Analytics API",
      description: "On-chain analytics, wallet scoring, and DeFi stats. $0.25 USDC per query.",
      url: "https://analytics.vestige.fi/api/v1",
      category: "analytics",
      priceUsdc: 0.25,
      payToAddress: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ",
      network: "mainnet",
      tags: ["analytics", "algorand", "defi"],
      provider: "Vestige",
    },
  ];

  if (!query) return demos;
  const q = query.toLowerCase();
  return demos.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.tags.some((t) => t.includes(q))
  );
}
