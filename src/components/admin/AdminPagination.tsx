import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminPagination({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => {
    if (totalPages <= 7) return true;
    return p === 1 || p === totalPages || Math.abs(p - page) <= 1;
  });

  const items: (number | "ellipsis")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) items.push("ellipsis");
    items.push(p);
  });

  return (
    <nav aria-label="გვერდები" className="flex flex-wrap items-center justify-center gap-1.5">
      <Link
        href={hrefForPage(Math.max(1, page - 1))}
        aria-label="წინა გვერდი"
        aria-disabled={page === 1}
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-[var(--radius-sm)] border border-border text-ink-700 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
          page === 1 && "pointer-events-none opacity-40",
        )}
      >
        <ChevronLeft className="size-4" />
      </Link>
      {items.map((item, i) =>
        item === "ellipsis" ? (
          <span key={`e-${i}`} className="w-8 text-center text-text-faint">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefForPage(item)}
            aria-label={`გვერდი ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-small font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
              item === page ? "bg-ink-900 text-white" : "border border-border text-ink-700 hover:bg-surface-2",
            )}
          >
            {item}
          </Link>
        ),
      )}
      <Link
        href={hrefForPage(Math.min(totalPages, page + 1))}
        aria-label="შემდეგი გვერდი"
        aria-disabled={page === totalPages}
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-[var(--radius-sm)] border border-border text-ink-700 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
          page === totalPages && "pointer-events-none opacity-40",
        )}
      >
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
