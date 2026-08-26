"use client";

import { Heart } from "lucide-react";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/hooks/useWishlist";

export function WishlistButton({
  className,
  product,
  labeled = false,
}: {
  className?: string;
  product: Product;
  /** Renders a full-width labeled pill (used in the PDP actions row) instead of the round icon-only button used on cards. */
  labeled?: boolean;
}) {
  const { isWishlisted, toggle } = useWishlist();
  const active = isWishlisted(product.id);
  const productName = product.name;
  const label = `${productName} — რჩეულებში დამატება`;

  if (labeled) {
    return (
      <button
        type="button"
        aria-pressed={active}
        aria-label={active ? `${productName} — რჩეულებიდან წაშლა` : label}
        onClick={() => toggle(product)}
        className={cn(
          "text-btn inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border-strong text-ink-900 transition-colors duration-150 hover:border-danger-300 hover:text-danger-500 active:scale-[0.98]",
          active && "border-danger-300 bg-danger-50 text-danger-500",
          className
        )}
      >
        <Heart className={cn("size-[18px]", active && "fill-danger-500 text-danger-500")} strokeWidth={1.75} />
        {active ? "რჩეულებშია" : "რჩეულებში დამატება"}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `${productName} — რჩეულებიდან წაშლა` : label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(product);
      }}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink-500 shadow-sm ring-1 ring-black/[0.04] transition-all duration-150 hover:text-danger-500 active:scale-90",
        className
      )}
    >
      <Heart
        className={cn(
          "size-[18px] transition-transform duration-150",
          active && "scale-110 fill-danger-500 text-danger-500"
        )}
        strokeWidth={1.75}
      />
    </button>
  );
}
