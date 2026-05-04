"use client";

import type { RankedProduct } from "@/lib/types";

type Props = {
    rankings: RankedProduct[];
};

export function RankingTable({ rankings }: Props) {
    return (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-white border-collapse">
                    <thead className="bg-white/5 text-white/55">
                        <tr>
                            <th className="px-4 py-3 font-medium uppercase tracking-wider">Product</th>
                            <th className="px-4 py-3 font-medium uppercase tracking-wider text-center">Score</th>
                            <th className="px-4 py-3 font-medium uppercase tracking-wider text-right">Rank</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {rankings.map((r) => (
                            <tr key={r.url} className="transition-colors hover:bg-white/5">
                                <td className="px-4 py-4 max-w-[200px] sm:max-w-xs">
                                    <div className="font-bold text-white truncate" title={r.product}>
                                        {r.product}
                                    </div>
                                    <div className="mt-1 truncate text-[10px] text-white/40 font-mono">
                                        {r.url}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-cyan-400 font-bold">
                                        {r.score}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right font-black text-lg text-white/90">
                                    #{r.rank}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}