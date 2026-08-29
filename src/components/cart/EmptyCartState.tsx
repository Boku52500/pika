"use client";

import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { featuredCategories } from "@/data/categories";
import { cn } from "@/lib/utils";

/** Shared empty state for both the `/cart` page and the mini-cart drawer. */
export function EmptyCartState({
  onNavigate,
  compact = false,
  className,
}: {
  /** Called when a CTA is clicked — the drawer uses this to close itself before navigating. */
  onNavigate?: () => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex max-w-md flex-col items-center gap-5 text-center", compact ? "py-8" : "py-14 sm:py-20", className)}>
      <span className={cn("flex items-center justify-center rounded-full bg-surface-2", compact ? "size-14" : "size-16")}>
        <ShoppingBag className={cn("text-text-faint", compact ? "size-7" : "size-8")} strokeWidth={1.5} />
      </span>

      <div>
        <h2 className={compact ? "text-body font-semibold text-text" : "text-h2 text-text"}>თქვენი კალათა ცარიელია</h2>
        <p className={cn("mt-2 text-text-muted", compact ? "text-small" : "text-body")}>
          დაამატეთ სასურველი პროდუქტები კალათაში, რომ გააგრძელოთ შენაძენი.
        </p>
      </div>

      <div className={cn("flex w-full flex-col gap-2.5", compact && "items-stretch")}>
        <Button href="/" variant="secondary" onClick={onNavigate} className={compact ? "w-full whitespace-normal" : undefined}>
          მთავარზე დაბრუნება
        </Button>
        <Button href={featuredCategories[0].href} onClick={onNavigate} className={compact ? "w-full whitespace-normal" : undefined}>
          პროდუქტების დათვალიერება
        </Button>
      </div>
    </div>
  );
}
