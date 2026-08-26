"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Builds a compact page list with ellipsis markers, e.g. [1, "…", 4, 5, 6, "…", 12]. */
function buildPageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: (number | "ellipsis")[] = [];
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) result.push("ellipsis");
    result.push(page);
  });
  return result;
}

/** Reusable numbered pagination for any product/listing grid. */
export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const pages = buildPageList(page, totalPages);

  return (
    <nav aria-label="გვერდები" className={cn("flex items-center justify-center gap-1.5", className)}>
      <button
        type="button"
        aria-label="წინა გვერდი"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-border text-ink-700 transition-colors hover:border-border-strong hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="size-4" strokeWidth={2.25} />
      </button>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e-${i}`} className="w-9 text-center text-small text-text-faint">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-label={`გვერდი ${p}`}
            aria-current={p === page ? "page" : undefined}
            onClick={() => onChange(p)}
            className={cn(
              "text-small tnum inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] font-medium transition-colors",
              p === page
                ? "bg-ink-900 text-white"
                : "border border-border text-ink-700 hover:border-border-strong hover:bg-surface-2"
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        aria-label="შემდეგი გვერდი"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-border text-ink-700 transition-colors hover:border-border-strong hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="size-4" strokeWidth={2.25} />
      </button>
    </nav>
  );
}
