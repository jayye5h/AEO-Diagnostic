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
  let res: Response | null = null;
  let text = "";

  // Single attempt, no retry (fail-fast to avoid double-timeout)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), aiTimeoutMs);
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
      console.warn(`[OpenAI] ${res.status} upstream error, failing fast.`);
    }
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error(`AI request failed (timeout): exceeded ${aiTimeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }

  if (!res || !res.ok) {
    throw new Error(`AI request failed (${res?.status || "Network"}): ${text.slice(0, 300)}`);
  }

  // Should never reach here, but TypeScript needs it
  return undefined as any as RankerOutput;
}
