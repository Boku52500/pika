"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list";

/** Grid/list display toggle shared by any product listing page. */
export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex shrink-0 items-center rounded-[var(--radius-sm)] border border-border-strong p-0.5", className)}>
      <button
        type="button"
        aria-label="ბადის ხედი"
        aria-pressed={value === "grid"}
        onClick={() => onChange("grid")}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-[4px] transition-colors",
          value === "grid" ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-surface-2"
        )}
      >
        <LayoutGrid className="size-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        aria-label="სიის ხედი"
        aria-pressed={value === "list"}
        onClick={() => onChange("list")}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-[4px] transition-colors",
          value === "list" ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-surface-2"
        )}
      >
        <List className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}
