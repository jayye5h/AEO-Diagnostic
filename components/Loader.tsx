"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const STEPS = [
  "Scraping product pages",
  "Extracting product attributes",
  "Comparing competitors",
  "Preparing analysis context",
  "Building report",
];

export function Loader() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // Speed up or slow down based on how "heavy" the steps feel
    const t = setInterval(() => {
      setIdx((v) => (v < STEPS.length - 1 ? v + 1 : v));
    }, 2500);
    return () => clearInterval(t);
  }, []);

  const progress = ((idx + 1) / STEPS.length) * 100;

  return (
    <div className="glass-panel w-full rounded-[2rem] p-8 text-white overflow-hidden relative">
      {/* Background Glow Effect */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-400/80">
            System Status: Processing
          </p>
          <div className="h-8 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={idx}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-2xl font-bold tracking-tight text-white"
              >
                {STEPS[idx]}...
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* New Radar/Pulse Icon */}
        <div className="relative flex h-12 w-12 items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 rounded-full bg-cyan-400"
          />
          <div className="relative h-4 w-4 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
        </div>
      </div>

      {/* Real Progress Bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-cyan-400 bg-[length:200%_100%] animate-shimmer rounded-full"
        />
      </div>

      {/* Grid Steps */}
      <div className="mt-8 grid gap-3 sm:grid-cols-5">
        {STEPS.map((step, stepIndex) => {
          const isActive = stepIndex === idx;
          const isCompleted = stepIndex < idx;

          return (
            <div key={step} className="relative">
              <div
                className={`flex h-full flex-col justify-between rounded-xl border p-3 transition-all duration-500 ${isActive
                    ? "border-cyan-400/50 bg-cyan-400/10"
                    : isCompleted
                      ? "border-white/20 bg-white/5 opacity-60"
                      : "border-white/5 bg-transparent opacity-30"
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-white/40">0{stepIndex + 1}</span>
                  {isCompleted && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-cyan-400 text-[10px]">
                      ✓
                    </motion.span>
                  )}
                </div>
                <p className={`text-[10px] font-medium leading-tight ${isActive ? "text-white" : "text-white/50"}`}>
                  {step}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}