import { NextResponse } from "next/server";
import { scrapeProductPage } from "@/lib/scraper";
import { rankProductsWithGpt41 } from "@/lib/openai";
import { computeReport } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AnalyzeRequest, AnalyzeResponse, ProductProfile, RankedProduct } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow Vercel route to run up to 60s

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function nameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(obj: unknown, key: string): string | undefined {
  if (!isRecord(obj)) return undefined;
  const value = obj[key];
  return typeof value === "string" ? value : undefined;
}

function getNumber(obj: unknown, key: string): number | undefined {
  if (!isRecord(obj)) return undefined;
  const value = obj[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function getStringArray(obj: unknown, key: string): string[] {
  if (!isRecord(obj)) return [];
  const value = obj[key];
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function toRankedProducts(raw: unknown, fallbackProducts: Array<{ name: string; url: string }>): RankedProduct[] {
  const rankings = isRecord(raw) ? raw["rankings"] : undefined;
  if (!Array.isArray(rankings)) return [];

  const cleaned: RankedProduct[] = rankings
    .map((r: unknown, idx: number) => {
      const product = getString(r, "product") ?? fallbackProducts[idx]?.name;
      const url = getString(r, "url") ?? fallbackProducts[idx]?.url;
      const score = getNumber(r, "score");
      const rank = getNumber(r, "rank");
      const reason = getString(r, "reason") ?? "";
      const strengths = getStringArray(r, "strengths");
      const weaknesses = getStringArray(r, "weaknesses");

      return {
        product: product || nameFromUrl(url || ""),
        url: url || "",
        score: typeof score === "number" ? Math.round(score) : 0,
        rank: typeof rank === "number" ? rank : idx + 1,
        reason,
        strengths,
        weaknesses,
      } satisfies RankedProduct;
    })
    .filter((r: RankedProduct) => !!r.url);

  // Ensure rank order is consistent
  cleaned.sort((a, b) => a.rank - b.rank);

  // Fill missing ranks if needed
  return cleaned.map((r, i) => ({ ...r, rank: r.rank || i + 1 }));
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const body = (await req.json().catch(() => null)) as AnalyzeRequest | null;

  const productUrl = typeof body?.productUrl === "string" ? body.productUrl.trim() : "";
  const competitorUrls = Array.isArray(body?.competitorUrls)
    ? body!.competitorUrls.map((u) => (typeof u === "string" ? u.trim() : "")).filter(Boolean)
    : [];
  const searchQuestion = typeof body?.searchQuestion === "string" ? body.searchQuestion.trim() : "";

  if (!productUrl || !searchQuestion) {
    return NextResponse.json(
      { error: "Missing required fields: productUrl, searchQuestion" },
      { status: 400 }
    );
  }

  const urls = [productUrl, ...competitorUrls];
  if (urls.some((u) => !isValidHttpUrl(u))) {
    return NextResponse.json({ error: "One or more URLs are invalid" }, { status: 400 });
  }

  if (urls.length > 6) {
    return NextResponse.json({ error: "Too many URLs (max 6)" }, { status: 400 });
  }

  const profiles = await Promise.all(urls.map((u) => scrapeProductPage(u)));
  const profilesByUrl = new Map<string, ProductProfile>(profiles.map((p) => [p.url, p]));

  const productInputs = profiles.map((p) => {
    const trustParts: string[] = [];
    if (p.trustSignals?.brand) trustParts.push(`brand=${p.trustSignals.brand}`);
    if (typeof p.trustSignals?.ratingValue === "number") trustParts.push(`rating=${p.trustSignals.ratingValue}`);
    if (typeof p.trustSignals?.reviewCount === "number") trustParts.push(`reviews=${p.trustSignals.reviewCount}`);

    return {
      name: p.name || nameFromUrl(p.url),
      url: p.url,
      description: p.description,
      category: p.category,
      priceText: p.price?.text,
      features: p.features,
      keywords: p.keywords,
      trustSignalsText: trustParts.length ? trustParts.join(", ") : undefined,
    };
  });

  let aiOutput;
  try {
    aiOutput = await rankProductsWithGpt41({ query: searchQuestion, products: productInputs, startTimeMs: startTime });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI error";
    const lowered = message.toLowerCase();
    const isUnauthorized = lowered.includes("(401)") || lowered.includes("unauthorized");
    const isForbidden = lowered.includes("(403)") || lowered.includes("forbidden");

    if (isUnauthorized || isForbidden) {
      return NextResponse.json(
        {
          error: message,
          hint:
            "Unauthorized to call the AI endpoint. On Vercel, set a valid token in environment variables (GITHUB_TOKEN or GITHUB_MODELS_TOKEN) and redeploy.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: message, hint: "Check GITHUB_TOKEN / GITHUB_AI_ENDPOINT / GITHUB_AI_MODEL" },
      { status: 502 }
    );
  }

  const ranked = toRankedProducts(aiOutput, productInputs);

  // If model returned fewer items, ensure every scraped product appears at least once
  const present = new Set(ranked.map((r) => r.url));
  for (const p of productInputs) {
    if (!present.has(p.url)) {
      ranked.push({
        product: p.name,
        url: p.url,
        rank: ranked.length + 1,
        score: 0,
        strengths: [],
        weaknesses: [],
        reason: "Not ranked by model output",
      });
    }
  }

  ranked.sort((a, b) => a.rank - b.rank);

  const report = computeReport({
    query: searchQuestion,
    rankings: ranked,
    productUrl,
    profilesByUrl,
  });

  // Compute per-product normalized metrics for charts
  let productMetrics = undefined;
  try {
    // lazy import to avoid cycles
    const { computeProductMetrics } = await import("@/lib/scoring");
    productMetrics = computeProductMetrics({ query: searchQuestion, profiles: profiles, rankings: ranked });
  } catch {
    productMetrics = undefined;
  }

  let runId: string | undefined;
  // Fire-and-forget Supabase insert (don't block response on DB writes)
  // This keeps the API response fast and avoids Vercel timeout.
  (async () => {
    try {
      const supabase = getSupabaseAdmin();
      const insertPayload = {
        product_url: productUrl,
        competitor_urls: competitorUrls,
        search_question: searchQuestion,
        rankings: ranked,
        metrics: report.metrics,
        suggestions: report.suggestions,
        scraped: profiles,
        ai_model: process.env.GITHUB_AI_MODEL || "gpt-4o",
      };

      const { data, error } = await supabase
        .from("diagnostic_runs")
        .insert(insertPayload)
        .select("id")
        .single();

      if (error) {
        console.error("[Supabase] Insert failed:", error.message);
      } else {
        runId = (data as { id?: string } | null)?.id;
        console.log("[Supabase] Inserted run:", runId);
      }
    } catch (e) {
      console.error("[Supabase] Unexpected error:", e instanceof Error ? e.message : e);
    }
  })();

  const response: AnalyzeResponse = {
    runId,
    query: searchQuestion,
    rankings: ranked,
    metrics: report.metrics,
    suggestions: report.suggestions,
    scraped: profiles,
    productMetrics,
  };

  return NextResponse.json(response);
}
