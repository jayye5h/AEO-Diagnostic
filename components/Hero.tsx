import Link from "next/link";

export function Hero() {
    return (
        <section className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                AI Product Visibility Diagnostic
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
                Understand how AI tools might rank your product against competitors for a real customer search question.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                    href="/dashboard"
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                    Run a diagnostic
                </Link>
                <a
                    href="#how-it-works"
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                >
                    How it works
                </a>
            </div>
        </section>
    );
}
