"use client";

import type { AnalyzeResponse } from "@/lib/types";
import { motion } from "framer-motion";

export function ResultCards({ metrics }: { metrics: AnalyzeResponse["metrics"] }) {
    const cards = [
        { label: "AI Visibility", value: `${metrics.aiVisibility}%` },
        { label: "Competitive Strength", value: metrics.competitiveStrength || "Medium" },
        { label: "Trust Score", value: metrics.trustScore || "Medium" },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            {cards.map((card, i) => (
                <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-panel flex flex-col gap-1 rounded-3xl p-6 border border-white/10"
                >
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                        {card.label}
                    </p>
                    <p className="text-3xl font-black tracking-tight text-white">
                        {card.value}
                    </p>
                </motion.div>
            ))}
        </div>
    );
}