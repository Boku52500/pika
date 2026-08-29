"use client";

import { X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { availabilityLabel } from "@/lib/productLabels";
import type { CategoryFilterState } from "./filters";

/** Removable chips summarising every active filter, plus a "clear all" action. */
export function FilterChips({
  filters,
  onChange,
  onClearAll,
  categoryLabels,
  className,
}: {
  filters: CategoryFilterState;
  onChange: (patch: Partial<CategoryFilterState>) => void;
  onClearAll: () => void;
  categoryLabels?: Record<string, string>;
  className?: string;
}) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [
    ...filters.categories.map((c) => ({
      key: `category-${c}`,
      label: categoryLabels?.[c] ?? c,
      onRemove: () => onChange({ categories: filters.categories.filter((v) => v !== c) }),
    })),
    ...filters.brands.map((b) => ({
      key: `brand-${b}`,
      label: b,
      onRemove: () => onChange({ brands: filters.brands.filter((v) => v !== b) }),
    })),
    ...filters.storage.map((s) => ({
      key: `storage-${s}`,
      label: s,
      onRemove: () => onChange({ storage: filters.storage.filter((v) => v !== s) }),
    })),
    ...filters.ram.map((r) => ({
      key: `ram-${r}`,
      label: `${r} RAM`,
      onRemove: () => onChange({ ram: filters.ram.filter((v) => v !== r) }),
    })),
    ...filters.availability.map((a) => ({
      key: `avail-${a}`,
      label: availabilityLabel[a],
      onRemove: () => onChange({ availability: filters.availability.filter((v) => v !== a) }),
    })),
    ...(filters.priceMin != null || filters.priceMax != null
      ? [
          {
            key: "price",
            label: `${filters.priceMin != null ? formatPrice(filters.priceMin) : "0 ₾"} – ${
              filters.priceMax != null ? formatPrice(filters.priceMax) : "∞"
            }`,
            onRemove: () => onChange({ priceMin: null, priceMax: null }),
          },
        ]
      : []),
  ];

  if (chips.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.onRemove}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface py-1.5 pl-3 pr-2.5 text-small font-medium text-text transition-colors hover:border-danger-500 hover:text-danger-500"
          >
            {chip.label}
            <X className="size-3.5" strokeWidth={2.25} />
          </button>
        ))}
        <button
          type="button"
          onClick={onClearAll}
          className="text-small font-medium text-text-faint underline-offset-2 transition-colors hover:text-text hover:underline"
        >
          ყველას გასუფთავება
        </button>
      </div>
    </div>
  );
}
