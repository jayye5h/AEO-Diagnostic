import type { ChatCompletionsResponse, RankerOutput } from "./types";
import { extractJsonFromModelText } from "./parser";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function resolveChatCompletionsUrl(base: string): string {
  const normalized = base.replace(/\/+$/, "");
  // GitHub Models endpoint is OpenAI-compatible and commonly mounted at .../inference
  return `${normalized}/chat/completions`;
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
}): Promise<RankerOutput> {
  const endpoint = requireEnv("GITHUB_AI_ENDPOINT");
  const model = process.env.GITHUB_AI_MODEL || "openai/gpt-4.1";
  const token = requireEnv("GITHUB_TOKEN");

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
      if (p.description) lines.push(`Description: ${p.description}`);
      if (p.features?.length) lines.push(`Features: ${p.features.slice(0, 12).join("; ")}`);
      if (p.keywords?.length) lines.push(`Keywords: ${p.keywords.slice(0, 15).join(", ")}`);
      if (p.trustSignalsText) lines.push(`Trust: ${p.trustSignalsText}`);
      return lines.join("\n");
    })
    .join("\n\n");

  const user =
    `User Search Query:\n${input.query}\n\n` +
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

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      // Many OpenAI-compatible gateways support this; if unsupported it will be ignored.
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as ChatCompletionsResponse;
  const content = data.choices?.[0]?.message?.content ?? "";

  const parsed = extractJsonFromModelText<RankerOutput>(content);
  if (!parsed || !Array.isArray(parsed.rankings)) {
    throw new Error("AI response was not valid ranking JSON");
  }

  return parsed;
}
