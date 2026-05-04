export type Money = {
  amount?: number;
  currency?: string;
  text?: string;
};

export type ProductProfile = {
  url: string;
  name?: string;
  title?: string;
  description?: string;
  category?: string;
  price?: Money;
  keywords?: string[];
  features?: string[];
  benefits?: string[];
  trustSignals?: {
    brand?: string;
    ratingValue?: number;
    reviewCount?: number;
  };
  source?: {
    fetchedAt: string;
    httpStatus?: number;
    jsonLdProductFound: boolean;
  };
};

export type ScrapeRequest = {
  urls: string[];
};

export type ScrapeResult =
  | {
      ok: true;
      url: string;
      product: ProductProfile;
    }
  | {
      ok: false;
      url: string;
      error: string;
      httpStatus?: number;
    };

export type ScrapeResponse = {
  results: ScrapeResult[];
};

export type AnalyzeRequest = {
  productUrl: string;
  competitorUrls: string[];
  searchQuestion: string;
  // Optional for future expansion
  productName?: string;
};

export type RankedProduct = {
  product: string;
  url: string;
  rank: number;
  score: number;
  strengths: string[];
  weaknesses: string[];
  reason: string;
};

export type ProductMetrics = {
  url: string;
  name: string;
  components: {
    productMatch: number; // 0-100
    trustQuality: number; // 0-100
    featureStrength: number; // 0-100
    pricingMatch: number; // 0-100
  };
  overall: number; // 0-100
};

export type AnalyzeResponse = {
  runId?: string;
  query: string;
  rankings: RankedProduct[];
  metrics: {
    aiVisibility: number;
    competitiveStrength: "Low" | "Medium" | "High";
    trustScore: "Low" | "Medium" | "High";
  };
  suggestions: string[];
  scraped: ProductProfile[];
  productMetrics?: ProductMetrics[];
};

// OpenAI-compatible response types (minimal)
export type ChatCompletionsResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

export type RankerOutput = {
  rankings: Array<{
    product: string;
    url: string;
    rank: number;
    score: number;
    strengths: string[];
    weaknesses: string[];
    reason: string;
  }>;
};
