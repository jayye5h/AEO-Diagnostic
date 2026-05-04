"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { DashboardClient } from "./ui";

export default function DashboardPage() {
    return (
        <div className="relative flex-1 overflow-hidden text-white">
            <div className="pointer-events-none absolute inset-0 funky-grid" />
            <div className="pointer-events-none absolute inset-0 noise-overlay" />
            <div className="pointer-events-none absolute left-[-12rem] top-24 h-[26rem] w-[26rem] rounded-full bg-cyan-400/15 blur-[120px] animate-floaty" />

            <div className="relative mx-auto w-full max-w-7xl px-6 py-8 lg:px-8 lg:py-10">
                <div className="mb-8 flex items-center justify-between">
                    <Link href="/" className="text-sm text-white/70 transition-colors hover:text-white">
                        ← Back to Home
                    </Link>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                        Dashboard
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                    <motion.div
                        initial={{ opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="glass-panel rounded-[2rem] p-6"
                    >
                        <p className="text-xs uppercase tracking-[0.3em] text-white/45">Run a diagnostic</p>
                        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
                            Enter your product and let the AI see how you compare.
                        </h1>
                        <p className="mt-4 max-w-xl text-sm leading-7 text-white/65">
                            Product name, product URL, competitor URLs, and one customer question is enough to generate a polished visibility report.
                        </p>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            {[
                                ["Structured scraping", "Pulls live product details from the URL."],
                                ["Competitive ranking", "Scores your product against direct rivals."],
                                ["Actionable guidance", "Shows what to improve to become more visible."],
                                ["Fast turnaround", "Built for quick diagnostics and sharing."],
                            ].map(([title, text]) => (
                                <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10">
                                    <p className="text-sm font-semibold text-white">{title}</p>
                                    <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.08 }}
                        className="glass-panel rounded-[2rem] p-4 sm:p-6"
                    >
                        <DashboardClient />
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
