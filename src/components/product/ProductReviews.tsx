import { Star } from "lucide-react";
import type { Product, ProductReview } from "@/types/product";
import { cn } from "@/lib/utils";

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const iconSize = size === "lg" ? "size-5" : "size-3.5";
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(iconSize, i + 1 <= Math.round(rating) ? "fill-accent-400 text-accent-400" : "fill-none text-border-strong")}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function initialsOf(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

/**
 * "შეფასებები" section: average rating + star breakdown bars, review count,
 * and example review cards. UI-only — there's no submission/backend yet.
 */
export function ProductReviews({
  product,
  reviews,
  breakdown,
  className,
}: {
  product: Product;
  reviews: ProductReview[];
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  className?: string;
}) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0) || Math.max(product.reviewCount, 1);

  return (
    <div className={cn("flex flex-col gap-8 lg:flex-row lg:gap-12", className)}>
      <div className="flex shrink-0 flex-col items-start gap-5 lg:w-64">
        <div>
          <p className="text-h1 leading-none text-text">{product.rating.toFixed(1)}</p>
          <div className="mt-2">
            <Stars rating={product.rating} size="lg" />
          </div>
          <p className="text-small mt-1.5 text-text-muted">{product.reviewCount} შეფასება</p>
        </div>

        <div className="flex w-full flex-col gap-1.5" aria-hidden>
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = breakdown[star] ?? 0;
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-label w-2.5 text-text-faint">{star}</span>
                <Star className="size-3 shrink-0 fill-accent-400 text-accent-400" strokeWidth={1.5} />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-label w-8 text-right text-text-faint">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {reviews.length ? (
          reviews.map((review) => (
            <div key={review.id} className="rounded-[var(--radius-md)] border border-border bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-small font-bold text-brand-700">
                    {initialsOf(review.author)}
                  </span>
                  <div>
                    <p className="text-small flex items-center gap-1.5 font-semibold text-text">
                      {review.author}
                      {review.verified ? <span className="text-label font-medium text-success-600">დადასტურებული</span> : null}
                    </p>
                    <p className="text-label font-medium normal-case tracking-normal text-text-faint">{review.date}</p>
                  </div>
                </div>
                <Stars rating={review.rating} />
              </div>
              {review.title ? <p className="mt-3 text-small font-semibold text-text">{review.title}</p> : null}
              <p className="mt-1.5 text-small text-text-muted">{review.body}</p>
            </div>
          ))
        ) : (
          <p className="text-small text-text-muted">ჯერ არ არის შეფასებები.</p>
        )}
      </div>
    </div>
  );
}
