/**
 * Provider-neutral live pharmacy-price adapter.
 *
 * This file intentionally does not scrape pharmacy websites or invent quotes.
 * It accepts a documented partner API that returns the JSON shape described in
 * docs/TECHNICAL_REPORT.md. A URL alone does not certify a pharmacy; returned
 * product URLs must also match MEDIBOT_CERTIFIED_PHARMACY_DOMAINS.
 */
export type PartnerPriceOffer = {
  pharmacy: string;
  product_name: string;
  price: number;
  currency: "INR";
  pack_size: string;
  in_stock: boolean;
  product_url: string;
  updated_at: string;
  source: "configured_partner_api";
};

export type PartnerPriceResult = {
  status: "live" | "not_configured" | "no_valid_offers" | "provider_error";
  offers: PartnerPriceOffer[];
  message: string;
};

function allowedHosts(): string[] {
  return (process.env.MEDIBOT_CERTIFIED_PHARMACY_DOMAINS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, ""))
    .filter(Boolean);
}

function hostIsAllowed(hostname: string, allowlist: string[]): boolean {
  const host = hostname.toLowerCase();
  return allowlist.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function safeOffer(raw: unknown, allowlist: string[]): PartnerPriceOffer | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const pharmacy = typeof item.pharmacy === "string" ? item.pharmacy.trim().slice(0, 120) : "";
  const productName = typeof item.product_name === "string" ? item.product_name.trim().slice(0, 250) : "";
  const price = Number(item.price);
  const currency = item.currency;
  const packSize = typeof item.pack_size === "string" ? item.pack_size.trim().slice(0, 120) : "";
  const inStock = item.in_stock;
  const productUrl = typeof item.product_url === "string" ? item.product_url : "";
  const updatedAt = typeof item.updated_at === "string" ? item.updated_at : "";

  if (!pharmacy || !productName || !packSize || !Number.isFinite(price) || price <= 0) return null;
  if (currency !== "INR" || typeof inStock !== "boolean") return null;
  if (!updatedAt || !Number.isFinite(Date.parse(updatedAt))) return null;
  if (!productUrl) return null;

  try {
    const url = new URL(productUrl);
    if (url.protocol !== "https:" || !hostIsAllowed(url.hostname, allowlist)) return null;
  } catch {
    return null;
  }

  // Refuse stale quotes beyond 24 hours; this threshold is deliberately strict
  // for a price-comparison prototype and may be adjusted by the approved partner SLA.
  const ageMs = Date.now() - Date.parse(updatedAt);
  if (ageMs < -5 * 60_000 || ageMs > 24 * 60 * 60_000) return null;

  return {
    pharmacy,
    product_name: productName,
    price: Math.round(price * 100) / 100,
    currency: "INR",
    pack_size: packSize,
    in_stock: inStock,
    product_url: productUrl,
    updated_at: new Date(updatedAt).toISOString(),
    source: "configured_partner_api",
  };
}

/**
 * Environment variables:
 * - MEDIBOT_PHARMACY_PRICE_API_URL: approved partner aggregator endpoint
 * - MEDIBOT_PHARMACY_PRICE_API_KEY: optional bearer token
 * - MEDIBOT_CERTIFIED_PHARMACY_DOMAINS: comma-separated approved product-link hosts
 *
 * Partner response: { "offers": [{ "pharmacy", "product_name", "price",
 * "currency":"INR", "pack_size", "in_stock", "product_url", "updated_at" }] }
 */
export async function lookupPartnerPrices(input: {
  medicineName: string;
  composition?: string;
  strength?: string;
  dosageForm?: string;
  packSize?: string;
}): Promise<PartnerPriceResult> {
  const endpoint = process.env.MEDIBOT_PHARMACY_PRICE_API_URL?.trim();
  if (!endpoint) {
    return {
      status: "not_configured",
      offers: [],
      message: "No live pharmacy partner feed is configured. MediBot will not invent or label sample values as live quotes.",
    };
  }

  const allowlist = allowedHosts();
  if (allowlist.length === 0) {
    return {
      status: "provider_error",
      offers: [],
      message: "Live price provider is configured, but the approved pharmacy domain allowlist is empty.",
    };
  }

  let url: URL;
  try {
    url = new URL(endpoint);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      throw new Error("Provider URL must use HTTPS.");
    }
  } catch {
    return { status: "provider_error", offers: [], message: "Live price provider URL is invalid; HTTPS is required outside local development." };
  }

  url.searchParams.set("q", input.medicineName);
  if (input.composition) url.searchParams.set("composition", input.composition);
  if (input.strength) url.searchParams.set("strength", input.strength);
  if (input.dosageForm) url.searchParams.set("form", input.dosageForm);
  if (input.packSize) url.searchParams.set("packSize", input.packSize);

  try {
    const headers: Record<string, string> = { accept: "application/json" };
    const apiKey = process.env.MEDIBOT_PHARMACY_PRICE_API_KEY?.trim();
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) {
      return { status: "provider_error", offers: [], message: `Live price provider returned HTTP ${response.status}.` };
    }

    const payload = await response.json() as { offers?: unknown };
    const rawOffers = Array.isArray(payload?.offers) ? payload.offers : [];
    const offers = rawOffers
      .map((offer) => safeOffer(offer, allowlist))
      .filter((offer): offer is PartnerPriceOffer => offer !== null)
      .sort((a, b) => a.price - b.price)
      .slice(0, 20);

    if (!offers.length) {
      return { status: "no_valid_offers", offers: [], message: "The provider returned no offers that passed URL, pack-size, currency, stock, and freshness validation." };
    }
    return { status: "live", offers, message: "Live quotes from the configured provider; verify pack size and checkout total before purchase." };
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "The live pharmacy price provider timed out. No price was estimated."
      : "The live pharmacy price provider could not be reached. No price was estimated.";
    return { status: "provider_error", offers: [], message };
  }
}
