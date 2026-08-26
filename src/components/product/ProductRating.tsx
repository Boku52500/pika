import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductRating({
  rating,
  reviewCount,
  size = "sm",
  className,
}: {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const iconSize = size === "sm" ? "size-3.5" : "size-4";
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i + 1 <= Math.round(rating);
          return (
            <Star
              key={i}
              className={cn(iconSize, filled ? "fill-accent-400 text-accent-400" : "fill-none text-border-strong")}
              strokeWidth={1.5}
            />
          );
        })}
      </div>
      <span className="text-small tnum font-medium text-text-muted">
        {rating.toFixed(1)}
        {typeof reviewCount === "number" ? (
          <span className="text-text-faint"> ({reviewCount})</span>
        ) : null}
      </span>
    </div>
  );
}
