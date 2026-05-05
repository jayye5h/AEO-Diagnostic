import { NextResponse } from "next/server";
import { scrapeProductPage } from "@/lib/scraper";
import type { ScrapeRequest, ScrapeResponse, ScrapeResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60 seconds for scraping with Puppeteer fallback

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ScrapeRequest | null;

  const urls = body?.urls;
  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json(
      ({ results: [{ ok: false, url: "", error: "Missing 'urls' array" }] } satisfies ScrapeResponse),
      { status: 400 }
    );
  }

  const cleaned = urls.map((u) => (typeof u === "string" ? u.trim() : "")).filter(Boolean);
  if (cleaned.length === 0 || cleaned.some((u) => !isValidHttpUrl(u))) {
    return NextResponse.json(
      ({
        results: cleaned.map(
          (u): ScrapeResult =>
            isValidHttpUrl(u)
              ? { ok: false, url: u, error: "Not scraped (validation failed for another URL)" }
              : { ok: false, url: u, error: "Invalid URL" }
        ),
      } satisfies ScrapeResponse),
      { status: 400 }
    );
  }

  if (cleaned.length > 6) {
    return NextResponse.json(
      ({
        results: cleaned.map(
          (u): ScrapeResult => ({ ok: false, url: u, error: "Too many URLs (max 6)" })
        ),
      } satisfies ScrapeResponse),
      { status: 400 }
    );
  }

  const results = await Promise.all(
    cleaned.map(async (url): Promise<ScrapeResult> => {
      try {
        const product = await scrapeProductPage(url);
        return { ok: true, url, product };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown scrape error";
        return { ok: false, url, error: message };
      }
    })
  );

  return NextResponse.json(({ results } satisfies ScrapeResponse));
}
