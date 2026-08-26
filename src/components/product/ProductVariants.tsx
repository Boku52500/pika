"use client";

import type { ProductVariantGroup } from "@/types/product";
import { cn } from "@/lib/utils";

/**
 * Renders selectable variant axes (color, storage, RAM…). Controlled by the
 * parent (`ProductPurchasePanel`) so the current selection can be stored
 * with the cart line when the customer adds the product — no price/SKU
 * switching yet, but the data shape supports it later.
 */
export function ProductVariants({
  groups,
  selected,
  onChange,
  className,
}: {
  groups: ProductVariantGroup[];
  selected: Record<string, string>;
  onChange: (groupId: string, value: string) => void;
  className?: string;
}) {
  if (!groups.length) return null;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {groups.map((group) => {
        const selectedOption = group.options.find((o) => o.value === selected[group.id]);
        return (
          <div key={group.id}>
            <p className="text-small mb-2 font-medium text-text">
              {group.label}
              {selectedOption ? <span className="text-text-muted">: {selectedOption.label}</span> : null}
            </p>
            <div role="radiogroup" aria-label={group.label} className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const isSelected = selected[group.id] === option.value;

                if (option.swatch) {
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={option.label}
                      onClick={() => onChange(group.id, option.value)}
                      className={cn(
                        "flex size-10 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-surface transition-all focus-visible:outline-none",
                        isSelected ? "ring-brand-600" : "ring-transparent hover:ring-border-strong"
                      )}
                    >
                      <span
                        className="size-7 rounded-full border border-black/10"
                        style={{ background: option.swatch }}
                      />
                    </button>
                  );
                }

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => onChange(group.id, option.value)}
                    className={cn(
                      "text-small rounded-[var(--radius-sm)] border px-4 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                      isSelected
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-border-strong text-text hover:border-ink-900"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
