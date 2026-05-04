import * as cheerio from "cheerio";
import type { ProductProfile } from "./types";

type FetchHtmlResult = {
  html: string;
  httpStatus: number;
};

const DEFAULT_TIMEOUT_MS = 15000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(obj: unknown, key: string): string | undefined {
  if (!isRecord(obj)) return undefined;
  const value = obj[key];
  return typeof value === "string" ? value : undefined;
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function uniqNonEmpty(items: Array<string | undefined | null>, limit = 20): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const value = (item ?? "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function flattenJsonLdCandidates(value: unknown): Array<Record<string, unknown>> {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLdCandidates);
  if (typeof value !== "object") return [];

  const obj = value as Record<string, unknown>;
  const graph = obj["@graph"];
  if (graph) return flattenJsonLdCandidates(graph);
  return [obj];
}

function jsonLdTypeIncludesProduct(typeValue: unknown): boolean {
  const types = asArray(typeValue).map((t) => (typeof t === "string" ? t : ""));
  return types.some((t) => t.toLowerCase() === "product");
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

async function fetchHtml(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<FetchHtmlResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    const httpStatus = res.status;
    const html = await res.text();
    return { html, httpStatus };
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.warn(`[Scraper Timeout] Fetching ${url} took longer than ${timeoutMs}ms.`);
      return { html: "", httpStatus: 408 };
    }
    console.warn(`[Scraper Error] Fetching ${url} failed:`, err.message);
    return { html: "", httpStatus: 0 };
  } finally {
    clearTimeout(timeout);
  }
}

function extractFromJsonLd($: cheerio.CheerioAPI): {
  product?: Partial<ProductProfile>;
  jsonLdProductFound: boolean;
} {
  const scripts = $("script[type='application/ld+json']")
    .toArray()
    .map((el) => $(el).text())
    .map((raw) => raw.trim())
    .filter(Boolean);

  const candidates: Array<Record<string, unknown>> = [];
  for (const raw of scripts) {
    const parsed = safeParseJson(raw);
    const flattened = flattenJsonLdCandidates(parsed);
    for (const obj of flattened) candidates.push(obj);
  }

  const productObjects = candidates.filter((obj) => jsonLdTypeIncludesProduct(obj["@type"]));
  if (productObjects.length === 0) return { jsonLdProductFound: false };

  const p = productObjects[0] as Record<string, unknown>;

  const name = getString(p, "name");
  const description = getString(p, "description");
  const category = getString(p, "category");

  const brandObj = p["brand"];
  const brand =
    typeof brandObj === "string" ? brandObj : getString(isRecord(brandObj) ? brandObj : undefined, "name");

  const aggregateRating = p["aggregateRating"];
  const ratingValue = coerceNumber(isRecord(aggregateRating) ? aggregateRating["ratingValue"] : undefined);
  const reviewCount = coerceNumber(isRecord(aggregateRating) ? aggregateRating["reviewCount"] : undefined);

  const offersValue = p["offers"];
  const offers = Array.isArray(offersValue) ? offersValue[0] : offersValue;
  const priceAmount =
    isRecord(offers)
      ? coerceNumber(offers["price"] ?? offers["lowPrice"])
      : undefined;
  const priceCurrency = isRecord(offers) ? getString(offers, "priceCurrency") : undefined;

  const additionalPropsValue = p["additionalProperty"];
  const additionalProps = asArray(additionalPropsValue as unknown)
    .map((ap) => {
      const name = getString(ap, "name");
      const value = getString(ap, "value");
      if (!name || !value) return undefined;
      return `${name}: ${value}`;
    })
    .filter(Boolean) as string[];

  const features = uniqNonEmpty(additionalProps);

  return {
    jsonLdProductFound: true,
    product: {
      name,
      description,
      category,
      price: {
        amount: priceAmount,
        currency: priceCurrency,
        text: priceAmount ? `${priceAmount}${priceCurrency ? ` ${priceCurrency}` : ""}` : undefined,
      },
      features,
      trustSignals: {
        brand,
        ratingValue,
        reviewCount,
      },
    },
  };
}

function extractMeta($: cheerio.CheerioAPI) {
  const meta = (selector: string) => $(selector).attr("content")?.trim();

  const title =
    meta("meta[property='og:title']") ||
    meta("meta[name='twitter:title']") ||
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    undefined;

  const description =
    meta("meta[name='description']") ||
    meta("meta[property='og:description']") ||
    meta("meta[name='twitter:description']") ||
    $("p").first().text().trim() ||
    undefined;

  const keywords = meta("meta[name='keywords']")
    ?.split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const priceAmount = coerceNumber(
    meta("meta[property='product:price:amount']") || meta("meta[itemprop='price']")
  );
  const priceCurrency =
    meta("meta[property='product:price:currency']") || meta("meta[itemprop='priceCurrency']");

  return {
    title: title ? normalizeWhitespace(title) : undefined,
    description: description ? normalizeWhitespace(description) : undefined,
    keywords: keywords?.slice(0, 20),
    price: {
      amount: priceAmount,
      currency: priceCurrency,
      text:
        priceAmount !== undefined
          ? `${priceAmount}${priceCurrency ? ` ${priceCurrency}` : ""}`
          : undefined,
    },
  };
}

function extractListFeatures($: cheerio.CheerioAPI): string[] {
  const items = $("li")
    .toArray()
    .map((el) => normalizeWhitespace($(el).text()))
    .filter((t) => t.length >= 3)
    .slice(0, 12);

  return uniqNonEmpty(items, 12);
}

export async function scrapeProductPage(url: string): Promise<ProductProfile> {
  const { html, httpStatus } = await fetchHtml(url);
  const $ = cheerio.load(html);

  const jsonLd = extractFromJsonLd($);
  const meta = extractMeta($);
  const listFeatures = extractListFeatures($);

  const name = jsonLd.product?.name || meta.title;

  const product: ProductProfile = {
    url,
    name: name ? normalizeWhitespace(name) : undefined,
    title: meta.title,
    description: jsonLd.product?.description || meta.description,
    category: jsonLd.product?.category || undefined,
    price: jsonLd.product?.price?.amount ? jsonLd.product?.price : meta.price,
    keywords: meta.keywords,
    features: uniqNonEmpty([...(jsonLd.product?.features ?? []), ...listFeatures], 12),
    benefits: [],
    trustSignals: jsonLd.product?.trustSignals,
    source: {
      fetchedAt: new Date().toISOString(),
      httpStatus,
      jsonLdProductFound: jsonLd.jsonLdProductFound,
    },
  };

  return product;
}
