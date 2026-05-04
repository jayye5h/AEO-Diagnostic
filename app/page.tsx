"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const features = [
  {
    title: "AI ranking engine",
    copy: "Turn product URLs into structured profiles and score them against a customer search query.",
  },
  {
    title: "Competitive context",
    copy: "Compare features, trust signals, and pricing clarity across every competitor in one view.",
  },
  {
    title: "Actionable recommendations",
    copy: "See exactly what to improve so AI systems are more likely to recommend your product.",
  },
];

const steps = [
  { title: "Scrape", text: "Pull titles, descriptions, features, pricing, and trust signals from live pages." },
  { title: "Rank", text: "Ask GPT-4.1 to score each product against the customer question." },
  { title: "Refine", text: "Use the report to improve AI visibility and competitive strength." },
];

export default function Home() {
  return (
    <div className="relative flex-1 overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 funky-grid" />
      <div className="pointer-events-none absolute inset-0 noise-overlay" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[120px] animate-floaty" />
      <div className="pointer-events-none absolute right-[-10rem] top-24 h-[28rem] w-[28rem] rounded-full bg-cyan-400/15 blur-[120px] animate-floaty" />

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-8 lg:px-8 lg:py-10">
        <header className="glass-panel flex items-center justify-between rounded-full px-5 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">AEO Diagnostic</p>
            <p className="text-sm font-medium text-white/90">See how AI recommends your product</p>
          </div>

        </header>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/75 shadow-[0_16px_60px_-24px_rgba(0,0,0,0.55)]">
              <span className="h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_18px_rgba(232,121,249,0.9)]" />
              Funky SaaS built for AI visibility analysis
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
                Make your product <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-lime-300 bg-clip-text text-transparent animate-shimmer">show up</span> when AI gets the question.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
                A premium diagnostic that scrapes product pages, ranks competitors with GPT-4.1, and shows what to fix to win more AI recommendations.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 transition-transform duration-300 hover:-translate-y-0.5 hover:scale-[1.01]"
              >
                Run Diagnostic
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white/90 backdrop-blur transition-colors hover:bg-white/10"
              >
                Explore the flow
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Scrape", "Live product pages"],
                ["Rank", "GPT-4.1 recommendation model"],
                ["Improve", "Visibility suggestions"],
              ].map(([label, value]) => (
                <div key={label} className="glass-panel rounded-3xl p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.75, ease: "easeOut", delay: 0.08 }}
            className="glass-panel relative overflow-hidden rounded-[2rem] p-5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-cyan-400/10" />
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-white/45">Demo preview</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Visibility dashboard</h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">84% live fit</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-white/45">Top result</p>
                  <p className="mt-2 text-lg font-semibold text-white">MuscleFuel Whey Protein</p>
                  <p className="mt-1 text-sm text-white/65">Ranked on trust, price, and beginner-friendliness.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-white/45">Competitive gap</p>
                  <p className="mt-2 text-lg font-semibold text-white">Medium</p>
                  <p className="mt-1 text-sm text-white/65">Needs stronger social proof and clearer positioning.</p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>Visibility score</span>
                  <span>84%</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[84%] rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-lime-300" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Ranked", "#2"],
                  ["Trust", "High"],
                  ["Fit", "Strong"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">{label}</p>
                    <p className="mt-1 text-base font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section id="how-it-works" className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="glass-panel rounded-[1.75rem] p-6"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">0{index + 1}</p>
              <h3 className="mt-3 text-xl font-semibold text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/65">{step.text}</p>
            </motion.div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            className="glass-panel rounded-[2rem] p-6"
          >
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">Why it matters</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Know what AI says before your customers do.</h2>
            <p className="mt-4 text-sm leading-7 text-white/65">
              This system turns raw website data into a structured comparison so you can see how AI interprets your product, what it trusts, and what needs improvement.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="glass-panel rounded-[1.75rem] p-5"
              >
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-cyan-300 via-fuchsia-400 to-lime-300" />
                <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{feature.copy}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative border-t border-white/10 bg-white/5">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 py-8 text-sm text-white/55 lg:px-8">
          <p className="font-medium text-white/80">Understand how AI ranks your product against competitors.</p>

        </div>
      </footer>
    </div>
  );
}
