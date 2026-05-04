"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

type Props = {
    onSubmit: (value: {
        productUrl: string;
        competitorUrls: string[];
        searchQuestion: string;
    }) => void | Promise<void>;
    isSubmitting?: boolean;
};

function splitUrls(raw: string): string[] {
    return raw
        .split(/\r?\n|,\s*/g)
        .map((s) => s.trim())
        .filter(Boolean);
}

export function ProductForm({ onSubmit, isSubmitting }: Props) {
    const [productUrl, setProductUrl] = useState("");
    const [competitorUrlsRaw, setCompetitorUrlsRaw] = useState("");
    const [searchQuestion, setSearchQuestion] = useState("");

    const competitorUrls = useMemo(() => splitUrls(competitorUrlsRaw), [competitorUrlsRaw]);

    const canSubmit = productUrl.trim().length > 0 && searchQuestion.trim().length > 0;

    return (
        <form
            className="w-full space-y-5"
            onSubmit={(e) => {
                e.preventDefault();
                if (!canSubmit) return;
                onSubmit({ productUrl: productUrl.trim(), competitorUrls, searchQuestion: searchQuestion.trim() });
            }}
        >
            <div className="space-y-2">
                <label className="text-sm font-medium text-white">Product URL</label>
                <input
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://yourproduct.com/product"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 sm:px-5 sm:py-4 text-sm text-white shadow-inner transition-all outline-none placeholder:text-white/30 hover:bg-black/30 focus:border-cyan-400/50 focus:bg-black/40 focus:ring-4 focus:ring-cyan-400/10"
                    inputMode="url"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-white">Competitor URLs</label>
                <textarea
                    value={competitorUrlsRaw}
                    onChange={(e) => setCompetitorUrlsRaw(e.target.value)}
                    placeholder={"Paste one URL per line\nhttps://competitor.com/product-a\nhttps://competitor.com/product-b"}
                    className="min-h-[120px] w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3 sm:px-5 sm:py-4 text-sm text-white shadow-inner transition-all outline-none placeholder:text-white/30 hover:bg-black/30 focus:border-fuchsia-400/50 focus:bg-black/40 focus:ring-4 focus:ring-fuchsia-400/10"
                />
                <p className="text-xs text-white/45">Parsed: {competitorUrls.length} URL(s)</p>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-white">Customer Search Question</label>
                <textarea
                    value={searchQuestion}
                    onChange={(e) => setSearchQuestion(e.target.value)}
                    placeholder='e.g. "Best protein powder for beginners"'
                    className="min-h-[100px] w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3 sm:px-5 sm:py-4 text-sm text-white shadow-inner transition-all outline-none placeholder:text-white/30 hover:bg-black/30 focus:border-lime-400/50 focus:bg-black/40 focus:ring-4 focus:ring-lime-400/10"
                />
            </div>

            <motion.button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                whileHover={{ scale: canSubmit ? 1.01 : 1 }}
                whileTap={{ scale: canSubmit ? 0.99 : 1 }}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-lime-300 px-4 text-sm font-semibold text-zinc-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isSubmitting ? "Running…" : "Run Diagnostic"}
            </motion.button>
        </form>
    );
}
