import type { ChatCompletionsResponse, RankerOutput } from "./types";
import { extractJsonFromModelText } from "./parser";

function requireEnv(name: string): string {
  const value = process.env[name];
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) throw new Error(`Missing env var: ${name}`);
  return trimmed;
}

function resolveGithubModelsToken(): string {
  // Support a few common names people use in CI/Vercel.
  return (
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GITHUB_MODELS_TOKEN?.trim() ||
    process.env.GITHUB_AI_TOKEN?.trim() ||
    process.env.GH_MODELS_TOKEN?.trim() ||
    process.env.GITHUB_PAT?.trim() ||
    ""
  );
}

function resolveModel(): string {
  // gpt-4o is faster than gpt-4.1 and usually cheaper
  return process.env.GITHUB_AI_MODEL || "gpt-4o";
}

function resolveChatCompletionsUrl(base: string): string {
  const normalized = base.replace(/\/+$/, "");
  // GitHub Models endpoint is OpenAI-compatible and commonly mounted at .../inference
  return `${normalized}/chat/completions`;
}

function truncateText(value: string | undefined, maxChars: number): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > maxChars ? `${trimmed.slice(0, Math.max(0, maxChars - 1))}…` : trimmed;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function timeElapsedMs(startTime: number): number {
  return Date.now() - startTime;
}

// Fallback ranking when AI fails: score products based on heuristic signals
function fallbackRanking(products: Array<{
  name: string;
  url: string;
  description?: string;
  trustSignalsText?: string;
  features?: string[];
}>): RankerOutput {
  const scored = products.map((p, i) => {
    let score = 50; // Base score

    // Boost for trust signals (ratings, reviews)
    if (p.trustSignalsText?.toLowerCase().includes("rating=")) {
      const match = p.trustSignalsText.match(/rating=([\d.]+)/);
      if (match) {
        const rating = Number(match[1]);
        score = Math.min(100, 50 + rating * 5); // Max 100, min 50
      }
    }

    // Boost for feature count
    if (p.features?.length) {
      score += Math.min(25, p.features.length);
    }

    // Description length as quality signal
    if (p.description?.length && p.description.length > 200) {
      score += 10;
    }

    return {
      product: p.name,
      url: p.url,
      rank: 0, // Will be assigned by sort
      score: Math.min(100, Math.max(0, score)),
      strengths: [
        p.features?.length ? `${p.features.length} features listed` : "Product available",
        p.trustSignalsText ? "Trust signals present" : "Additional research recommended",
      ].filter(Boolean),
      weaknesses: ["AI ranking unavailable"],
      reason: "Fallback: scored by heuristic signals due to AI service unavailability.",
    };
  });

  // Sort by score descending, then by product name
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.product.localeCompare(b.product);
  });

  // Assign ranks
  return {
    rankings: scored.map((r, i) => ({ ...r, rank: i + 1 })),
  };
}

export async function rankProductsWithGpt41(input: {
  query: string;
  products: Array<{
    name: string;
    url: string;
    description?: string;
    category?: string;
    priceText?: string;
    features?: string[];
    keywords?: string[];
    trustSignalsText?: string;
  }>;
  startTimeMs?: number;
}): Promise<RankerOutput> {
  const endpoint = requireEnv("GITHUB_AI_ENDPOINT");
  const model = resolveModel();
  const token = resolveGithubModelsToken() || requireEnv("GITHUB_TOKEN");
  const startTime = input.startTimeMs || Date.now();
  const timeoutRemainingMs = 50000 - timeElapsedMs(startTime); // Leave 10s buffer for Vercel

  if (timeoutRemainingMs < 5000) {
    // Not enough time left; return a minimal fallback ranking
    console.warn("[OpenAI] Insufficient time remaining (<5s), returning minimal ranking.");
    return {
      rankings: input.products.map((p, i) => ({
        product: p.name,
        url: p.url,
        rank: i + 1,
        score: 50,
        strengths: ["Product available"],
        weaknesses: ["Insufficient analysis time"],
        reason: "Timeout: minimal ranking returned.",
      })),
    };
  }

  const url = resolveChatCompletionsUrl(endpoint);

  const system =
    "You are an AI product recommendation ranking engine. " +
    "You rank products for a customer search query based on the provided product profiles only. " +
    "Return JSON only. No markdown, no code fences.";

  const productBlock = input.products
    .map((p, idx) => {
      const lines: string[] = [];
      lines.push(`Product ${idx + 1}:`);
      lines.push(`Name: ${p.name}`);
      lines.push(`URL: ${p.url}`);
      if (p.category) lines.push(`Category: ${p.category}`);
      if (p.priceText) lines.push(`Price: ${p.priceText}`);
      const shortDescription = truncateText(p.description, 420);
      if (shortDescription) lines.push(`Description: ${shortDescription}`);
      if (p.features?.length) lines.push(`Features: ${p.features.slice(0, 8).join("; ")}`);
      if (p.keywords?.length) lines.push(`Keywords: ${p.keywords.slice(0, 10).join(", ")}`);
      if (p.trustSignalsText) lines.push(`Trust: ${p.trustSignalsText}`);
      return lines.join("\n");
    })
    .join("\n\n");

  const safeQuery = truncateText(input.query, 240) || input.query;
  const user =
    `User Search Query:\n${safeQuery}\n\n` +
    "Analyze these products and rank them by recommendation quality.\n\n" +
    "Return JSON only with this shape:\n" +
    "{\n" +
    "  \"rankings\": [\n" +
    "    {\n" +
    "      \"product\": string,\n" +
    "      \"url\": string,\n" +
    "      \"rank\": number,\n" +
    "      \"score\": number,\n" +
    "      \"strengths\": string[],\n" +
    "      \"weaknesses\": string[],\n" +
    "      \"reason\": string\n" +
    "    }\n" +
    "  ]\n" +
    "}\n\n" +
    `Products:\n${productBlock}`;

  const requestBody = JSON.stringify({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const aiTimeoutMs = Math.min(Number(process.env.AI_TIMEOUT_MS) || 30000, timeoutRemainingMs - 2000);
  
  // Retry logic: up to 3 total attempts (1 initial + 2 retries) with exponential backoff
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const timeBeforeAttempt = Date.now();
    const timeRemainingBeforeAttempt = 50000 - timeElapsedMs(startTime);
    
    // Don't retry if less than 8 seconds remaining (need time for fallback + response)
    if (attempt > 1 && timeRemainingBeforeAttempt < 8000) {
      console.warn(`[OpenAI] Attempt ${attempt}: insufficient time remaining (${timeRemainingBeforeAttempt}ms), skipping retry.`);
      break;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), aiTimeoutMs);
    let res: Response | null = null;
    let text = "";

    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: requestBody,
        signal: controller.signal,
      });

      if (res.ok) {
        clearTimeout(timer);
        const data = (await res.json()) as ChatCompletionsResponse;
        const content = data.choices?.[0]?.message?.content ?? "";
        const parsed = extractJsonFromModelText<RankerOutput>(content);
        if (!parsed || !Array.isArray(parsed.rankings)) {
          throw new Error("AI response was not valid ranking JSON");
        }
        return parsed;
      }

      text = await res.text().catch(() => "");
      
      if (res.status >= 500) {
        clearTimeout(timer);
        const elapsedThisAttempt = Date.now() - timeBeforeAttempt;
        if (attempt < MAX_ATTEMPTS) {
          const backoffMs = attempt === 1 ? 1000 : 2000;
          console.warn(`[OpenAI] Attempt ${attempt}: ${res.status} upstream error. Retrying in ${backoffMs}ms...`);
          await sleep(backoffMs);
          continue;
        } else {
          console.warn(`[OpenAI] Attempt ${attempt}: ${res.status} upstream error. Max retries reached, using fallback.`);
          return fallbackRanking(input.products);
        }
      }

      clearTimeout(timer);
      throw new Error(`AI request failed (${res?.status || "Network"}): ${text.slice(0, 300)}`);
    } catch (e: any) {
      clearTimeout(timer);
      
      if (e?.name === "AbortError") {
        if (attempt < MAX_ATTEMPTS) {
          console.warn(`[OpenAI] Attempt ${attempt}: timeout exceeded. Retrying...`);
          await sleep(1000);
          continue;
        } else {
          console.warn(`[OpenAI] Attempt ${attempt}: timeout exceeded. Max retries reached, using fallback.`);
          return fallbackRanking(input.products);
        }
      }
      
      // For other errors on final attempt, use fallback
      if (attempt === MAX_ATTEMPTS) {
        console.warn(`[OpenAI] Attempt ${attempt}: error: ${e.message}. Max retries reached, using fallback.`);
        return fallbackRanking(input.products);
      }
      
      throw e;
    }
  }

  // If loop exits without return, use fallback
  console.warn("[OpenAI] All AI attempts exhausted, using fallback ranking.");
  return fallbackRanking(input.products);
}
