"use client";

import { useState } from "react";
import { ArrowLeftRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tertiary purchase-area action, mirrors WishlistButton's labeled pill styling. */
export function CompareButton({ productName, className }: { productName: string; className?: string }) {
  const [active, setActive] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${productName} — შედარებაში დამატება`}
      onClick={() => setActive((v) => !v)}
      className={cn(
        "text-btn inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border-strong text-ink-900 transition-colors duration-150 hover:border-ink-900 active:scale-[0.98]",
        active && "border-brand-300 bg-brand-50 text-brand-700",
        className
      )}
    >
      {active ? <Check className="size-[18px]" strokeWidth={2.25} /> : <ArrowLeftRight className="size-[18px]" strokeWidth={1.75} />}
      {active ? "დამატებულია" : "შედარება"}
    </button>
  );
}
