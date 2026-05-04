"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProductForm } from "@/components/ProductForm";

export function DashboardClient() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="space-y-6">
            {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                    {error}
                </div>
            ) : null}

            <ProductForm
                isSubmitting={isSubmitting}
                onSubmit={async ({ productUrl, competitorUrls, searchQuestion }) => {
                    setIsSubmitting(true);
                    setError(null);

                    try {
                        sessionStorage.setItem(
                            "aeo:lastRun",
                            JSON.stringify({ searchQuestion, productUrl, competitorUrls })
                        );

                        router.push("/loading");
                    } catch (e) {
                        setError(e instanceof Error ? e.message : "Unknown error");
                    } finally {
                        setIsSubmitting(false);
                    }
                }}
            />

            <p className="text-xs text-white/50 text-center">
                Note: Some sites block automated requests; scraping may fail for protected pages.
            </p>
        </div>
    );
}
