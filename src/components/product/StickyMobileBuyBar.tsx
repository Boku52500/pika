"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types/product";
import { cn, formatPrice } from "@/lib/utils";
import { AddToCartButton } from "./AddToCartButton";

/**
 * Compact mobile-only sticky purchase bar. Stays hidden while the main
 * purchase area (marked by `sentinelId`) is visible, and slides in only
 * once the user scrolls past it — so it never duplicates/obstructs the
 * primary CTAs, just keeps them reachable further down the page.
 */
export function StickyMobileBuyBar({
  product,
  quantity,
  variants,
  sentinelId,
}: {
  product: Product;
  /** Mirrors whatever quantity/variants are currently selected in the main purchase panel above. */
  quantity: number;
  variants?: Record<string, string>;
  sentinelId: string;
}) {
  const [visible, setVisible] = useState(false);
  const outOfStock = product.availability === "out-of-stock";

  useEffect(() => {
    const sentinel = document.getElementById(sentinelId);
    if (!sentinel) return;

    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      rootMargin: "-64px 0px 0px 0px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelId]);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/97 px-4 py-3 shadow-[0_-4px_16px_rgba(13,15,21,0.08)] backdrop-blur transition-transform duration-200 lg:hidden",
        visible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-label font-medium normal-case tracking-normal text-text-faint">ფასი</p>
          <p className="text-price truncate text-lg text-text">{formatPrice(product.price)}</p>
        </div>
        <AddToCartButton
          product={product}
          quantity={quantity}
          variants={variants}
          disabled={outOfStock}
          size="lg"
          className="w-auto min-w-[9.5rem] flex-1"
        />
      </div>
    </div>
  );
}
