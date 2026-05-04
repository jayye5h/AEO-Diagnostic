import type { AnalyzeResponse, ProductProfile, RankedProduct } from "./types";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function trustBucket(p?: ProductProfile): "Low" | "Medium" | "High" {
  const rating = p?.trustSignals?.ratingValue;
  const reviews = p?.trustSignals?.reviewCount;

  if (typeof rating === "number" && typeof reviews === "number") {
    if (rating >= 4.3 && reviews >= 50) return "High";
    return "Medium";
  }

  if (typeof rating === "number") return rating >= 4.0 ? "Medium" : "Low";
  return "Low";
}

function competitiveBucket(rank: number, total: number): "Low" | "Medium" | "High" {
  if (rank <= 1) return "High";
  if (rank <= Math.min(2, total)) return "Medium";
  return "Low";
}

export function computeReport(input: {
  query: string;
  rankings: RankedProduct[];
  productUrl: string;
  profilesByUrl: Map<string, ProductProfile>;
}): Pick<AnalyzeResponse, "metrics" | "suggestions"> {
  const target = input.rankings.find((r) => r.url === input.productUrl) ?? input.rankings[0];
  const targetProfile = target ? input.profilesByUrl.get(target.url) : undefined;

  const aiVisibility = clamp(Math.round(target?.score ?? 0), 0, 100);
  const competitiveStrength = competitiveBucket(target?.rank ?? 99, input.rankings.length);
  const trustScore = trustBucket(targetProfile);

  const suggestions: string[] = [];
  if (!targetProfile?.keywords?.length) suggestions.push("Add clear product keywords on the page (meta + on-page copy).");
  if (!targetProfile?.features?.length) suggestions.push("Add a scannable feature list (bullets) with specific benefits.");
  if (!targetProfile?.price?.text) suggestions.push("Make pricing obvious (and machine-readable where possible).");
  if (!targetProfile?.trustSignals?.ratingValue) suggestions.push("Add social proof (ratings, reviews, testimonials) near key claims.");
  if (aiVisibility < 75) suggestions.push("Align your copy more tightly to the customer query intent.");

  return {
    metrics: {
      aiVisibility,
      competitiveStrength,
      trustScore,
    },
    suggestions: suggestions.slice(0, 6),
  };
}

function tokenize(text?: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function computeProductMetrics(params: {
  query: string;
  profiles: ProductProfile[];
  rankings: RankedProduct[];
}): Array<{
  url: string;
  name: string;
  components: { productMatch: number; trustQuality: number; featureStrength: number; pricingMatch: number };
  overall: number;
}> {
  const { query, profiles, rankings } = params;
  const qTokens = tokenize(query);

  // collect numeric prices
  const prices = profiles
    .map((p) => p.price?.amount)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));

  const medianPrice = (() => {
    if (prices.length === 0) return undefined;
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  })();

  const maxFeatureCount = Math.max(...profiles.map((p) => (p.features?.length ?? 0)), 1);

  function scoreProductMatch(p: ProductProfile): number {
    const sourceTokens = [
      ...(p.keywords ?? []),
      ...(p.features ?? []),
      p.title ?? "",
      p.description ?? "",
    ].join(" ");
    const sTokens = tokenize(sourceTokens);
    if (qTokens.length === 0) return 50;
    const matches = qTokens.filter((t) => sTokens.includes(t)).length;
    return Math.round((matches / qTokens.length) * 100);
  }

  function scoreTrust(p: ProductProfile): number {
    const rating = p.trustSignals?.ratingValue ?? 0;
    const reviews = p.trustSignals?.reviewCount ?? 0;
    if (!rating && !reviews && p.trustSignals?.brand) return 45;
    const ratingPart = Math.max(0, Math.min(1, rating / 5));
    const reviewsPart = Math.min(1, Math.log10(reviews + 1) / 2); // scaled
    return Math.round((ratingPart * 0.7 + reviewsPart * 0.3) * 100);
  }

  function scoreFeatures(p: ProductProfile): number {
    const count = p.features?.length ?? 0;
    return Math.round((count / Math.max(1, maxFeatureCount)) * 100);
  }

  function scorePricing(p: ProductProfile): number {
    const amt = p.price?.amount;
    if (typeof amt !== "number" || !isFinite(amt)) {
      return 40;
    }
    if (medianPrice === undefined || medianPrice <= 0) return 70;
    const diff = Math.abs(amt - medianPrice) / medianPrice; // 0..inf
    const score = Math.max(0, 100 - diff * 100); // closer to median -> higher
    return Math.round(score);
  }

  const byUrl = new Map(profiles.map((p) => [p.url, p]));

  const out = rankings.map((r) => {
    const p = byUrl.get(r.url);
    const name = r.product ?? p?.name ?? r.url;
    const productMatch = p ? scoreProductMatch(p) : 0;
    const trustQuality = p ? scoreTrust(p) : 0;
    const featureStrength = p ? scoreFeatures(p) : 0;
    const pricingMatch = p ? scorePricing(p) : 0;

    const overall = Math.round(
      productMatch * 0.4 + trustQuality * 0.3 + featureStrength * 0.2 + pricingMatch * 0.1
    );

    return {
      url: r.url,
      name,
      components: { productMatch, trustQuality, featureStrength, pricingMatch },
      overall,
    };
  });

  return out;
}
