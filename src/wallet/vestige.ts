/**
 * Vestige DEX Client — Price feeds + Swap quote routing
 * Req 9: trade ALGO/USDC/ASA via DEX
 * Req 24: smart routing via Vestige aggregator
 *
 * Vestige API base: https://free-api.vestige.fi
 * Docs: https://free-api.vestige.fi/docs
 *
 * Key endpoints:
 *   GET /asset/{id}/price          — spot price in USD/ALGO
 *   GET /asset/prices              — batch prices for multiple assets
 *   GET /swap/v4/quote             — best swap route + expected output
 *   GET /swap/v4/transactions      — fetch unsigned swap txns to execute
 *
 * Note: Programmatic swap execution of the full route requires enterprise
 * key from team@vestige.fi, but the free API gives us:
 *   1. Price quotes (always available)
 *   2. The routing path to simulate/display
 *
 * For MVP, we execute single-hop swaps (AMM direct) using algosdk's
 * makeAssetTransferTxnWithSuggestedParamsFromObject with fee pooling.
 * Multi-hop routing via Vestige full aggregator is a V2 feature.
 */

const VESTIGE_API = "https://free-api.vestige.fi";

// --- Common Well-Known Asset IDs ---
export const WELL_KNOWN_ASSETS: Record<string, number> = {
  ALGO: 0,
  USDC: 31566704,      // Mainnet
  USDT: 312769,        // Mainnet
  WETH: 887406851,     // Mainnet
  // Testnet
  USDC_TESTNET: 10458941,
};

// --- Types ---

export interface AssetPrice {
  assetId: number;
  priceUsd: number;
  priceAlgo: number;
  change24h: number;
}

export interface SwapQuote {
  fromAssetId: number;
  toAssetId: number;
  fromAmount: number;       // in raw units (micro)
  toAmount: number;         // in raw units (micro)
  toAmountDisplay: number;  // in display units
  priceImpact: number;      // percentage
  route: string[];          // pool addresses in route
  slippage: number;
}

export interface AssetInfo {
  assetId: number;
  name: string;
  unitName: string;
  decimals: number;
  totalSupply: number;
  priceUsd?: number;
}

// --- Helpers ---

function vestigeHeaders(): Record<string, string> {
  return {
    "User-Agent": "algopay/1.0",
    "Accept": "application/json",
  };
}

async function vestigeFetch<T>(path: string): Promise<T> {
  const url = `${VESTIGE_API}${path}`;
  const res = await fetch(url, { headers: vestigeHeaders() });

  if (!res.ok) {
    throw new Error(
      `Vestige API error: ${res.status} for ${path}`
    );
  }

  return (await res.json()) as T;
}

// --- Asset Info ---

/**
 * Get spot price for an asset (Req 24)
 */
export async function getAssetPrice(
  assetId: number
): Promise<AssetPrice> {
  // Vestige endpoint: /asset/{id}/price
  const data = await vestigeFetch<{
    price: number;
    price_algo?: number;
    change_24h?: number;
  }>(`/asset/${assetId}/price?currency=usd`);

  return {
    assetId,
    priceUsd: data.price ?? 0,
    priceAlgo: data.price_algo ?? 0,
    change24h: data.change_24h ?? 0,
  };
}

/**
 * Get ALGO price in USD
 */
export async function getAlgoPrice(): Promise<number> {
  // ALGO price is ASA 0
  try {
    const price = await vestigeFetch<{ price: number }>(
      `/asset/0/price?currency=usd`
    );
    return price.price ?? 0;
  } catch {
    // Fallback: well-known price range
    return 0.18; // approximate ALGO price fallback
  }
}

/**
 * Resolve asset name/ticker to ASA ID
 */
export function resolveAssetId(
  nameOrId: string,
  network: "testnet" | "mainnet"
): number {
  const upper = nameOrId.toUpperCase().trim();

  // Handle numeric ASA ID
  if (/^\d+$/.test(nameOrId)) {
    return parseInt(nameOrId, 10);
  }

  // Handle well-known names
  if (upper === "ALGO") return 0;
  if (upper === "USDC") {
    return network === "mainnet"
      ? WELL_KNOWN_ASSETS.USDC
      : WELL_KNOWN_ASSETS.USDC_TESTNET;
  }
  if (upper === "USDT") return WELL_KNOWN_ASSETS.USDT;
  if (upper === "WETH") return WELL_KNOWN_ASSETS.WETH;

  throw new Error(
    `Unknown asset: "${nameOrId}". Use ALGO, USDC, USDT, WETH, or an ASA ID number.`
  );
}

// --- Swap Quote ---

/**
 * Get swap quote from Vestige aggregator (Req 9 + 24)
 * Returns the expected output amount and route for a swap.
 */
export async function getSwapQuote(
  fromAssetId: number,
  toAssetId: number,
  fromAmount: number,  // in display units (e.g., 1.5 USDC)
  fromDecimals: number,
  toDecimals: number,
  slippagePct = 1.0,
  network: "testnet" | "mainnet" = "mainnet"
): Promise<SwapQuote> {
  const microAmount = Math.round(fromAmount * Math.pow(10, fromDecimals));

  try {
    // Vestige swap/v4 quote endpoint
    const data = await vestigeFetch<{
      amount_out?: number;
      price_impact?: number;
      routes?: string[];
    }>(
      `/swap/v4?asset_id_from=${fromAssetId}&asset_id_to=${toAssetId}&amount=${microAmount}&slippage=${slippagePct}`
    );

    const toMicro = data.amount_out ?? 0;
    const toDisplay = toMicro / Math.pow(10, toDecimals);

    return {
      fromAssetId,
      toAssetId,
      fromAmount: microAmount,
      toAmount: toMicro,
      toAmountDisplay: toDisplay,
      priceImpact: data.price_impact ?? 0,
      route: data.routes ?? [],
      slippage: slippagePct,
    };
  } catch {
    // Vestige API unreachable — use hardcoded price estimates for known assets
    const KNOWN_PRICES: Record<number, number> = {
      0: 0,        // ALGO — will be fetched below
      31566704: 1.00,   // USDC mainnet
      10458941: 1.00,   // USDC testnet
      312769: 1.00,     // USDT
    };

    const algoPrice = await getAlgoPrice().catch(() => 0.18);

    KNOWN_PRICES[0] = algoPrice;

    const fromPrice = KNOWN_PRICES[fromAssetId] ?? 0;
    const toPrice = KNOWN_PRICES[toAssetId] ?? 0;

    const usdValue = fromAmount * fromPrice;
    const toAmountDisplay = toPrice > 0 ? usdValue / toPrice : 0;
    const toMicro = Math.round(toAmountDisplay * Math.pow(10, toDecimals));

    return {
      fromAssetId,
      toAssetId,
      fromAmount: microAmount,
      toAmount: toMicro,
      toAmountDisplay,
      priceImpact: 0.5,
      route: ["price-estimate-fallback"],
      slippage: slippagePct,
    };
  }
}

// --- Display Helpers ---

export function formatAssetName(assetId: number, network: "testnet" | "mainnet"): string {
  if (assetId === 0) return "ALGO";
  const ep = network === "mainnet" ? WELL_KNOWN_ASSETS : WELL_KNOWN_ASSETS;
  for (const [name, id] of Object.entries(ep)) {
    if (id === assetId) return name.replace("_TESTNET", "").replace("_MAINNET", "");
  }
  return `ASA-${assetId}`;
}
