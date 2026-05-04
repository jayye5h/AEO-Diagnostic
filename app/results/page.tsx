"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { AnalyzeResponse } from "@/lib/types";
import { RankingTable } from "@/components/RankingTable";
import { ResultCards } from "@/components/ResultCards";
import dynamic from "next/dynamic";
import type { ProductMetrics } from "@/lib/types";
import { motion } from "framer-motion";

const CompetitorCharts = dynamic(() => import("@/components/CompetitorCharts").then((m) => m.default || m.CompetitorCharts), { ssr: false });

function CompetitorChartsWrapper({ metrics }: { metrics: ProductMetrics[] }) {
    return <CompetitorCharts metrics={metrics} />;
}

export default function ResultsPage() {
    const [payload, setPayload] = useState<AnalyzeResponse | null>(null);

    useEffect(() => {
        const raw = sessionStorage.getItem("aeo:lastResult");
        if (raw) {
            setPayload(JSON.parse(raw) as AnalyzeResponse);
        }
    }, []);

    return (
        <div className="relative flex-1 overflow-hidden text-white">
            <div className="pointer-events-none absolute inset-0 funky-grid" />
            <div className="pointer-events-none absolute inset-0 noise-overlay" />
            <div className="pointer-events-none absolute left-[-12rem] top-24 h-[26rem] w-[26rem] rounded-full bg-cyan-400/15 blur-[120px] animate-floaty" />

            <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55 }}
                    className="glass-panel mb-6 flex flex-col gap-4 rounded-3xl p-4 sm:p-6 sm:mb-8 sm:gap-5 lg:flex-row lg:items-end lg:justify-between lg:rounded-4xl"
                >
                    <div>
                        <Link href="/dashboard" className="text-xs sm:text-sm text-white/70 transition-colors hover:text-white">
                            ← Back
                        </Link>
                        <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:mt-4 sm:text-4xl lg:text-5xl">
                            Results
                        </h1>
                        <p className="mt-1 max-w-2xl text-xs sm:text-sm sm:mt-2 leading-6 sm:leading-7 text-white/65">
                            Ranking and visibility metrics based on your customer search question.
                        </p>
                    </div>
                    {payload ? (
                        <div className="flex flex-wrap gap-2 sm:gap-3 text-xs">
                            <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 sm:px-3 sm:py-1.5 font-medium text-white/75">
                                Visibility {payload.metrics.aiVisibility}%
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 sm:px-3 sm:py-1.5 font-medium text-white/75">
                                Trust {payload.metrics.trustScore}
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 sm:px-3 sm:py-1.5 font-medium text-white/75">
                                {payload.rankings.length} products analyzed
                            </div>
                        </div>
                    ) : null}
                </motion.div>

                {!payload ? (
                    <div className="glass-panel rounded-3xl sm:rounded-4xl p-4 sm:p-6 text-xs sm:text-sm text-white/70">
                        No results found yet. Run a diagnostic from the dashboard.
                    </div>
                ) : (
                    <div className="space-y-4 sm:space-y-6">
                        <ResultCards metrics={payload.metrics} />

                        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-[1fr_1.3fr]">
                            {/* Left Column: Ranking + Suggestions */}
                            <div className="flex flex-col gap-4 sm:gap-6">
                                <motion.div
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.45 }}
                                    className="glass-panel rounded-3xl sm:rounded-4xl p-4 sm:p-5"
                                >
                                    <h2 className="mb-2 sm:mb-3 text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white/55">
                                        Ranking
                                    </h2>
                                    <div className="overflow-x-auto">
                                        <RankingTable rankings={payload.rankings} />
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.08 }}
                                    className="glass-panel rounded-3xl sm:rounded-4xl p-4 sm:p-6"
                                >
                                    <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white/55">
                                        Improvement suggestions
                                    </h2>
                                    <ul className="mt-3 sm:mt-4 list-disc space-y-1 sm:space-y-2 pl-4 sm:pl-5 text-xs sm:text-sm text-white/75">
                                        {payload.suggestions.map((s, i) => (
                                            <li key={i}>{s}</li>
                                        ))}
                                    </ul>
                                </motion.div>

                                {payload.rankings[0] && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: 0.12 }}
                                        className="glass-panel rounded-3xl sm:rounded-4xl p-4 sm:p-6 flex-1 flex flex-col"
                                    >
                                        <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white/55 mb-3 sm:mb-4">
                                            Query & Top Insights
                                        </h2>

                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-5">
                                            <div className="text-[10px] text-cyan-400 mb-1 uppercase tracking-wider font-bold">Target Question</div>
                                            <div className="text-[13px] sm:text-sm font-medium text-white/90">"{payload.query}"</div>
                                        </div>

                                        <div className="flex-1 flex flex-col">
                                            <div className="text-[10px] text-white/40 mb-2 uppercase tracking-wider font-bold">
                                                Top Ranking Engine Reason
                                            </div>
                                            <div className="text-xs text-white/70 italic mb-4 sm:mb-5 leading-relaxed bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10">
                                                "{payload.rankings[0].reason}"
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                                                <div>
                                                    <div className="text-[10px] text-lime-400 mb-2 uppercase tracking-wider font-bold">Top Product Strengths</div>
                                                    <ul className="list-disc pl-4 text-xs text-white/75 space-y-1">
                                                        {payload.rankings[0].strengths.map((s, i) => <li key={i}>{s}</li>)}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-rose-400 mb-2 uppercase tracking-wider font-bold">Top Product Weaknesses</div>
                                                    <ul className="list-disc pl-4 text-xs text-white/75 space-y-1">
                                                        {payload.rankings[0].weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Right Column: Charts */}
                            <motion.div
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.55, delay: 0.04 }}
                                className="flex flex-col gap-4 sm:gap-6"
                            >
                                {payload.productMetrics ? <CompetitorChartsWrapper metrics={payload.productMetrics} /> : null}
                            </motion.div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
