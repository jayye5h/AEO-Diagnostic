"use client";

import { Loader } from "@/components/Loader";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function LoadingPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    async function readJsonOrText(res: Response): Promise<{ json?: unknown; text?: string }> {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            try {
                return { json: await res.json() };
            } catch {
                // Fall back to text below
            }
        }

        try {
            return { text: await res.text() };
        } catch {
            return { text: "" };
        }
    }

    useEffect(() => {
        const raw = sessionStorage.getItem("aeo:lastRun");
        if (!raw) return;

        const parsed = JSON.parse(raw) as AnalyzeRequest;

        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/analyze", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(parsed),
                });

                const { json, text } = await readJsonOrText(res);
                const data = (json ?? null) as (AnalyzeResponse & { error?: string }) | null;
                if (!res.ok) {
                    const messageFromJson = data && typeof data === "object" ? (data as any).error : undefined;
                    const message =
                        (typeof messageFromJson === "string" && messageFromJson.trim())
                            ? messageFromJson
                            : (text?.trim() ? text.slice(0, 200) : "Analyze failed");
                    throw new Error(message);
                }

                if (!data) {
                    throw new Error("Analyze failed: empty response");
                }

                if (cancelled) return;
                sessionStorage.setItem("aeo:lastResult", JSON.stringify(data));
                router.push("/results");
            } catch (e) {
                if (cancelled) return;
                setError(e instanceof Error ? e.message : "Unknown error");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [router]);

    return (
        <div className="relative flex-1 overflow-hidden text-white">
            <div className="pointer-events-none absolute inset-0 funky-grid" />
            <div className="pointer-events-none absolute inset-0 noise-overlay" />
            <div className="pointer-events-none absolute left-1/4 top-16 h-[22rem] w-[22rem] rounded-full bg-fuchsia-500/15 blur-[120px] animate-floaty" />

            <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 lg:px-8 lg:py-10">
                <div className="flex items-center justify-between">
                    <Link href="/dashboard" className="text-sm text-white/70 transition-colors hover:text-white">
                        ← Back to dashboard
                    </Link>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                        In progress
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="glass-panel rounded-[2rem] p-8 border border-white/10"
                >

                    <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                        Synthesizing <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">Intelligence.</span>
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-white/60">
                        Our agents are crawling the web and cross-referencing market data to generate your custom product strategy.
                    </p>
                </motion.div>

                {error ? (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        {error}
                    </div>
                ) : null}

                <Loader />

                <div className="glass-panel rounded-[2rem] p-6 text-white">
                    <p className="text-sm text-white/70">
                        If this takes too long, the site you entered may be blocking automated requests.
                    </p>
                </div>
            </div>
        </div>
    );
}
