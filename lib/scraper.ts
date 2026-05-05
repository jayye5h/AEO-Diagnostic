import * as cheerio from "cheerio";
import puppeteer, { type Browser, type Page } from "puppeteer";
import type { ProductProfile } from "./types";

// Use puppeteer-extra for stealth mode (bypass bot detection)
let PuppeteerExtra: any;
try {
  PuppeteerExtra = require("puppeteer-extra");
  const StealthPlugin = require("puppeteer-extra-plugin-stealth");
  PuppeteerExtra.use(StealthPlugin());
} catch {
  // Fallback if puppeteer-extra is not available
}

type FetchHtmlResult = {
  html: string;
  httpStatus: number;
};

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_LOG_LEVEL = "warn";

// Global browser instance for reuse
let globalBrowser: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (globalBrowser && globalBrowser.connected) {
    return globalBrowser;
  }

  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }

  const launchFn = PuppeteerExtra?.launch || puppeteer.launch;

  browserLaunchPromise = launchFn({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--single-process=false",
      "--disable-gpu",
    ],
  });

  try {
    globalBrowser = await browserLaunchPromise;
    browserLaunchPromise = null;
    if (!globalBrowser) throw new Error("Failed to launch browser");
    return globalBrowser;
  } catch (err) {
    browserLaunchPromise = null;
    throw err;
  }
}

function isValidProductName(text: string | undefined): boolean {
  if (!text) return false;

  const normalized = text.trim();
  
  // Reject if contains domain patterns
  if (normalized.includes(".com") || normalized.includes(".in") || normalized.includes("dl.")) {
    return false;
  }

  // Reject if looks like a URL or domain
  if (/^[a-z0-9.-]+\.[a-z]{2,}/.test(normalized.toLowerCase())) {
    return false;
  }

  // Reject if too short
  if (normalized.length < 5) {
    return false;
  }

  // Reject if too long (likely navigation text or error message)
  if (normalized.length > 300) {
    return false;
  }

  // Reject common non-product texts
  const blacklist = ["menu", "search", "cart", "account", "login", "sign", "home", "category", "help", "flipkart"];
  const lower = normalized.toLowerCase();
  if (blacklist.some((word) => lower === word || lower.startsWith(word + " "))) {
    return false;
  }

  return true;
}

function resolveTimeoutMs(fallback: number) {
  const envValue = Number(process.env.SCRAPER_TIMEOUT_MS);
  if (Number.isFinite(envValue) && envValue > 0) return envValue;
  return fallback;
}

function shouldLogWarnings(): boolean {
  const level = (process.env.SCRAPER_LOG_LEVEL || DEFAULT_LOG_LEVEL).toLowerCase();
  return level !== "silent";
}

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

function isBlockedContent(html: string, httpStatus: number): boolean {
  // Check HTTP status codes that indicate blocking
  if (httpStatus === 403 || httpStatus === 429 || httpStatus === 403) {
    return true;
  }

  // Check for common reCAPTCHA and block indicators
  const lowerHtml = html.toLowerCase();
  const blockIndicators = [
    "recaptcha",
    "challenge.cloudflare",
    "cloudflare-challenge",
    "security-challenge",
    "verify-password",
    "account-verification",
    "please-verify",
    "bot-check",
    "unusual-traffic",
    "temporarily-blocked",
    "access-denied",
    "captcha",
  ];

  for (const indicator of blockIndicators) {
    if (lowerHtml.includes(indicator)) {
      return true;
    }
  }

  return false;
}

async function fetchHtml(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<FetchHtmlResult> {
  const effectiveTimeoutMs = resolveTimeoutMs(timeoutMs);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), effectiveTimeoutMs);

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

    // Check if response is blocked/verification content
    if (isBlockedContent(html, httpStatus)) {
      if (shouldLogWarnings()) {
        console.warn(`[Scraper Blocked] ${url} returned blocked/verification content (status: ${httpStatus})`);
      }
      return { html: "", httpStatus: 429 };
    }

    return { html, httpStatus };
  } catch (err: any) {
    if (err.name === "AbortError") {
      if (shouldLogWarnings()) {
        console.warn(
          `[Scraper Timeout] Fetching ${url} took longer than ${effectiveTimeoutMs}ms.`
        );
      }
      return { html: "", httpStatus: 408 };
    }
    if (shouldLogWarnings()) {
      console.warn(`[Scraper Error] Fetching ${url} failed:`, err?.message);
    }
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
    $("[class*='product'], [class*='title'], [class*='name']").first().text().trim() ||
    $("h2").first().text().trim() ||
    undefined;

  // Validate title - reject domain-like strings
  const validTitle = isValidProductName(title) ? title : undefined;

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
    title: validTitle ? normalizeWhitespace(validTitle) : undefined,
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

async function scrapeWithPuppeteer(url: string): Promise<Partial<ProductProfile> | null> {
  let page: Page | null = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Set user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.setViewport({ width: 1366, height: 768 });

    // Set longer timeout for navigation
    page.setDefaultNavigationTimeout(20000);
    page.setDefaultTimeout(20000);

    try {
      // Navigate with shorter timeout
      await Promise.race([
        page.goto(url, { waitUntil: "networkidle2" }).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 10000)),
      ]);
    } catch {
      // Continue even if navigation fails
    }

    // Wait for the page to have some content
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get page content as HTML instead of using page.evaluate (which causes detached frame errors)
    let html: string = "";
    try {
      html = await page.content();
    } catch {
      // If content fails, try to get innerHTML from body
      try {
        html = await page.evaluate(() => {
          return document.documentElement.outerHTML;
        });
      } catch {
        // Both failed, return null
        return null;
      }
    }

    // Close page to free resources
    await page.close().catch(() => {});
    page = null;

    // Parse the HTML with cheerio
    const $ = cheerio.load(html);

    // Extract product name
    const selectors = [
      "[data-testid='productTitle']",
      "h1",
      "[class*='product-title']",
      "[class*='title']",
      "meta[property='og:title']",
    ];

    let name: string | undefined;

    for (const selector of selectors) {
      if (selector.includes("meta")) {
        const content = $(selector).attr("content")?.trim();
        if (isValidProductName(content)) {
          name = content;
          break;
        }
      } else {
        const text = $(selector).first().text().trim();
        if (isValidProductName(text)) {
          name = text;
          break;
        }
      }
    }

    // Extract description
    const description = $("meta[name='description']").attr("content")?.trim() ||
      $("meta[property='og:description']").attr("content")?.trim() || 
      $("p").first().text().trim() ||
      undefined;

    // Extract features
    const features = $("li")
      .toArray()
      .map((el) => $(el).text().trim())
      .filter((text) => text && text.length >= 3 && text.length < 200)
      .slice(0, 12);

    if (isValidProductName(name)) {
      return {
        name: normalizeWhitespace(name!).substring(0, 500),
        description: description ? normalizeWhitespace(description) : undefined,
        features: uniqNonEmpty(features, 12),
      };
    }

    return null;
  } catch (error) {
    if (page) {
      await page.close().catch(() => {});
    }
    if (shouldLogWarnings()) {
      console.warn(
        `[Puppeteer Scraper Error] ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return null;
  }
}

export async function scrapeProductPage(url: string): Promise<ProductProfile> {
  const { html, httpStatus } = await fetchHtml(url);

  // Try cheerio scraping first (fast path)
  const $ = cheerio.load(html);
  const jsonLd = extractFromJsonLd($);
  const meta = extractMeta($);
  const listFeatures = extractListFeatures($);

  let name = jsonLd.product?.name || meta.title;

  // Validate the extracted name - if invalid, clear it to force Puppeteer fallback
  if (!isValidProductName(name)) {
    name = undefined;
  }

  // Enhanced fallback: try to extract name from URL pathname if no name found
  let finalName = name;
  if (!finalName) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      // Try to extract from path: /s/abc123 -> use domain, /product/name -> extract name
      if (pathname.includes("product")) {
        const parts = pathname.split("/").filter(Boolean);
        const productIdx = parts.indexOf("product");
        if (productIdx >= 0 && parts[productIdx + 1]) {
          const extractedName = parts[productIdx + 1].replace(/[-_]/g, " ");
          if (isValidProductName(extractedName)) {
            finalName = extractedName;
          }
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  // If no valid name found with cheerio, try Puppeteer fallback
  if (!finalName) {
    if (shouldLogWarnings()) {
      console.warn(`[Scraper] Fast scraping failed, attempting browser-based scraping for ${url}`);
    }

    const puppeteerResult = await scrapeWithPuppeteer(url);
    if (puppeteerResult?.name) {
      return {
        url,
        name: puppeteerResult.name,
        title: puppeteerResult.name,
        description: puppeteerResult.description,
        category: undefined,
        price: undefined,
        keywords: undefined,
        features: puppeteerResult.features || [],
        benefits: [],
        trustSignals: undefined,
        source: {
          fetchedAt: new Date().toISOString(),
          httpStatus,
          jsonLdProductFound: false,
        },
      };
    }
  }

  const product: ProductProfile = {
    url,
    name: finalName ? normalizeWhitespace(finalName) : undefined,
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
