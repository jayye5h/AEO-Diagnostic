"use client";

import { Bar, Radar } from "react-chartjs-2";
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    RadialLinearScale,
    Tooltip,
    type ChartOptions,
} from "chart.js";
import type { ProductMetrics } from "@/lib/types";

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement
);

type Props = {
    metrics: ProductMetrics[];
};

function randomColor(seed: number) {
    const h = (seed * 137.508) % 360;
    return `hsl(${Math.round(h)}, 72%, 52%)`;
}

function toPercent(n: number) {
    return `${n}%`;
}

function truncateLabel(value: string, max = 26) {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function CompetitorCharts({ metrics }: Props) {
    if (!metrics.length) {
        return (
            <div className="rounded-[28px] border border-zinc-200/70 bg-white/80 p-6 shadow-[0_20px_60px_-20px_rgba(24,24,27,0.18)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Competitor charts</p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    No chart data was returned for this run, so there is nothing to plot yet.
                </p>
            </div>
        );
    }

    const labels = metrics.map((m) => m.name);
    const best = [...metrics].sort((a, b) => b.overall - a.overall)[0];

    const barData = {
        labels,
        datasets: [
            {
                label: "Overall score",
                data: metrics.map((m) => m.overall),
                backgroundColor: metrics.map((_, i) => `${randomColor(i)}88`),
                borderColor: metrics.map((_, i) => randomColor(i)),
                borderWidth: 1,
                borderRadius: 999,
                barThickness: 16,
                maxBarThickness: 18,
            },
        ],
    };

    const barOptions: ChartOptions<"bar"> = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: "rgba(24, 24, 27, 0.95)",
                titleColor: "#fff",
                bodyColor: "#e4e4e7",
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (ctx) => ` Score: ${ctx.parsed.x}`,
                },
            },
        },
        scales: {
            x: {
                beginAtZero: true,
                max: 100,
                grid: { display: false },
                ticks: { color: "#71717a", font: { size: 12, weight: 600 }, callback: (v) => `${v}%` },
            },
            y: {
                grid: { display: false },
                ticks: {
                    color: "#71717a",
                    font: { size: 12, weight: 600 },
                    callback: (v) => truncateLabel(String(v)),
                },
            },
        },
    };

    const radarDatasets = metrics.map((m, i) => ({
        label: m.name,
        data: [
            m.components.productMatch,
            m.components.trustQuality,
            m.components.featureStrength,
            m.components.pricingMatch,
        ],
        fill: true,
        backgroundColor: `${randomColor(i)}33`,
        borderColor: randomColor(i),
        pointBackgroundColor: randomColor(i),
    }));

    const radarData = {
        labels: ["Product Match", "Trust Quality", "Feature Strength", "Pricing Match"],
        datasets: radarDatasets,
    };

    const radarOptions: ChartOptions<"radar"> = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                min: 0,
                max: 100,
                ticks: {
                    stepSize: 20,
                    color: "#71717a",
                    backdropColor: "transparent",
                    callback: (value) => `${value}%`,
                },
                grid: { color: "rgba(113, 113, 122, 0.16)" },
                angleLines: { color: "rgba(113, 113, 122, 0.16)" },
                pointLabels: { color: "#ffffff", font: { size: 12, weight: 600 } },
            },
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: "rgba(24, 24, 27, 0.95)",
                titleColor: "#fff",
                bodyColor: "#e4e4e7",
                padding: 12,
            },
        },
    };

    // Bar chart component
    function BarChartCard() {
        return (
            <div className="glass-panel flex flex-col rounded-2xl sm:rounded-3xl p-4 sm:p-5">
                <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-white">Overall Scores</h4>
                        <p className="mt-0.5 sm:mt-1 text-xs text-white/60">Higher bars mean better recommendation fit.</p>
                    </div>
                    <span className="rounded-full border border-white/20 bg-white/10 px-2 sm:px-3 py-1 text-xs font-medium text-white/70 backdrop-blur whitespace-nowrap">
                        0-100 scale
                    </span>
                </div>
                <div className="relative flex-1 min-h-64 sm:min-h-72 lg:min-h-80 w-full">
                    <Bar data={barData} options={barOptions} />
                </div>
            </div>
        );
    }

    // Radar chart component
    function RadarChartCard() {
        return (
            <div className="glass-panel flex flex-col rounded-2xl sm:rounded-3xl p-4 sm:p-5">
                <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-white">Component Comparison</h4>
                        <p className="mt-0.5 sm:mt-1 text-xs text-white/60">Radar view for fast visual contrast.</p>
                    </div>
                    <span className="rounded-full border border-white/20 bg-white/10 px-2 sm:px-3 py-1 text-xs font-medium text-white/70 backdrop-blur whitespace-nowrap">
                        Detailed view
                    </span>
                </div>
                <div className="mb-3 sm:mb-4 flex flex-wrap gap-1.5 sm:gap-2">
                    {metrics.map((m, index) => (
                        <div
                            key={m.url}
                            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/20 bg-white/10 px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium text-white/80 backdrop-blur"
                        >
                            <span
                                className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: randomColor(index) }}
                            />
                            <span className="max-w-24 sm:max-w-32 truncate">{m.name}</span>
                            <span className="text-white/60">{m.overall}%</span>
                        </div>
                    ))}
                </div>
                <div className="relative flex-1 min-h-64 sm:min-h-72 lg:min-h-80 w-full">
                    <Radar data={radarData} options={radarOptions} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <BarChartCard />
            <RadarChartCard />
        </div>
    );
}

export default CompetitorCharts;
