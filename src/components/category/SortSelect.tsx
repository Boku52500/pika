"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { sortOptions, type SortKey } from "./filters";

/** Reusable listing sort control — options are static but the component takes no category-specific data. */
export function SortSelect({
  value,
  onChange,
  className,
}: {
  value: SortKey;
  onChange: (value: SortKey) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        aria-label="დახარისხება"
        className="text-small h-10 w-full min-w-[10.5rem] cursor-pointer appearance-none rounded-[var(--radius-sm)] border border-border-strong bg-surface pl-3 pr-9 font-medium text-text transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        {sortOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-faint"
        strokeWidth={2.25}
      />
    </div>
  );
}
