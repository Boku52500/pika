"use client";

import { useState, type ReactNode } from "react";
import type { Product, ProductAvailability } from "@/types/product";
import { cn } from "@/lib/utils";
import { availabilityLabel } from "@/lib/productLabels";
import {
  type CategoryFilterState,
  getPriceBounds,
  getUniqueBrands,
  getUniqueCategories,
  getUniqueSpecValues,
} from "./filters";

const availabilityOptions: ProductAvailability[] = ["in-stock", "out-of-stock"];

function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-border py-4 first:pt-0 last:border-b-0">
      <h3 className="text-label mb-2.5 font-semibold text-text">{title}</h3>
      {children}
    </div>
  );
}

function FilterCheckbox({
  checked,
  onChange,
  label,
  count,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-1.5 text-small text-text">
      <span className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="size-4 shrink-0 rounded-[4px] border-border-strong accent-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        />
        {label}
      </span>
      {typeof count === "number" ? <span className="tnum text-text-faint">{count}</span> : null}
    </label>
  );
}

/**
 * Data-driven filter sidebar: every section (brand/storage/ram) is derived
 * from the product list passed in, and sections with no meaningful variety
 * simply don't render — so the exact same component works for any future
 * category without per-category configuration.
 */
export function FilterSidebar({
  products,
  filters,
  onChange,
  onClear,
  showHeading = true,
  className,
}: {
  /** Full, unfiltered category product list — used to derive available facets. */
  products: Product[];
  filters: CategoryFilterState;
  onChange: (patch: Partial<CategoryFilterState>) => void;
  onClear: () => void;
  /** Set to false when embedded in a drawer that already renders its own title. */
  showHeading?: boolean;
  className?: string;
}) {
  const categories = getUniqueCategories(products);
  const brands = getUniqueBrands(products);
  const storageOptions = getUniqueSpecValues(products, "storage");
  const ramOptions = getUniqueSpecValues(products, "ram");
  const priceBounds = getPriceBounds(products);

  const [priceMinInput, setPriceMinInput] = useState(filters.priceMin?.toString() ?? "");
  const [priceMaxInput, setPriceMaxInput] = useState(filters.priceMax?.toString() ?? "");

  const applyPrice = () => {
    const min = priceMinInput.trim() ? Number(priceMinInput) : null;
    const max = priceMaxInput.trim() ? Number(priceMaxInput) : null;
    onChange({ priceMin: min, priceMax: max });
  };

  return (
    <div className={cn("flex flex-col rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-xs", className)}>
      <div className="mb-1 flex items-center justify-between">
        {showHeading ? <h2 className="text-h3 text-text">ფილტრი</h2> : <span />}
        <button
          type="button"
          onClick={() => {
            setPriceMinInput("");
            setPriceMaxInput("");
            onClear();
          }}
          className="text-small font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          გასუფთავება
        </button>
      </div>

      {categories.length > 1 ? (
        <FilterSection title="კატეგორია">
          {categories.map(({ value, label, count }) => (
            <FilterCheckbox
              key={value}
              label={label}
              count={count}
              checked={filters.categories.includes(value)}
              onChange={() => onChange({ categories: toggleValue(filters.categories, value) })}
            />
          ))}
        </FilterSection>
      ) : null}

      {brands.length > 1 ? (
        <FilterSection title="ბრენდი">
          {brands.map(({ value, count }) => (
            <FilterCheckbox
              key={value}
              label={value}
              count={count}
              checked={filters.brands.includes(value)}
              onChange={() => onChange({ brands: toggleValue(filters.brands, value) })}
            />
          ))}
        </FilterSection>
      ) : null}

      {priceBounds.max > priceBounds.min ? (
        <FilterSection title="ფასი">
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              placeholder={String(priceBounds.min)}
              value={priceMinInput}
              onChange={(e) => setPriceMinInput(e.target.value)}
              onBlur={applyPrice}
              onKeyDown={(e) => e.key === "Enter" && applyPrice()}
              aria-label="მინიმალური ფასი, ₾"
              className="text-small tnum h-9 w-full min-w-0 rounded-[var(--radius-sm)] border border-border-strong px-2.5 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            />
            <span className="text-text-faint">—</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder={String(priceBounds.max)}
              value={priceMaxInput}
              onChange={(e) => setPriceMaxInput(e.target.value)}
              onBlur={applyPrice}
              onKeyDown={(e) => e.key === "Enter" && applyPrice()}
              aria-label="მაქსიმალური ფასი, ₾"
              className="text-small tnum h-9 w-full min-w-0 rounded-[var(--radius-sm)] border border-border-strong px-2.5 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            />
            <span className="text-small shrink-0 text-text-faint">₾</span>
          </div>
        </FilterSection>
      ) : null}

      {storageOptions.length > 1 ? (
        <FilterSection title="მეხსიერება">
          {storageOptions.map(({ value, count }) => (
            <FilterCheckbox
              key={value}
              label={value}
              count={count}
              checked={filters.storage.includes(value)}
              onChange={() => onChange({ storage: toggleValue(filters.storage, value) })}
            />
          ))}
        </FilterSection>
      ) : null}

      {ramOptions.length > 1 ? (
        <FilterSection title="ოპერატიული მეხსიერება (RAM)">
          {ramOptions.map(({ value, count }) => (
            <FilterCheckbox
              key={value}
              label={value}
              count={count}
              checked={filters.ram.includes(value)}
              onChange={() => onChange({ ram: toggleValue(filters.ram, value) })}
            />
          ))}
        </FilterSection>
      ) : null}

      <FilterSection title="ხელმისაწვდომობა">
        {availabilityOptions.map((value) => (
          <FilterCheckbox
            key={value}
            label={availabilityLabel[value]}
            checked={filters.availability.includes(value)}
            onChange={() => onChange({ availability: toggleValue(filters.availability, value) })}
          />
        ))}
      </FilterSection>
    </div>
  );
}
