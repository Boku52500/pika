"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reusable minus/number/plus quantity control. Value is always clamped to
 * [min, max] — including on direct text input — so it can never go below 1.
 */
export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}) {
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  return (
    <div
      className={cn(
        "inline-flex h-11 items-stretch overflow-hidden rounded-[var(--radius-sm)] border border-border-strong",
        disabled && "opacity-50",
        className
      )}
    >
      <button
        type="button"
        aria-label="რაოდენობის შემცირება"
        disabled={disabled || value <= min}
        onClick={decrease}
        className="flex w-10 items-center justify-center text-ink-700 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset disabled:pointer-events-none disabled:text-text-faint"
      >
        <Minus className="size-4" strokeWidth={2} />
      </button>

      <input
        type="text"
        inputMode="numeric"
        aria-label="რაოდენობა"
        disabled={disabled}
        value={value}
        onChange={(e) => {
          const digitsOnly = e.target.value.replace(/\D/g, "");
          if (digitsOnly === "") {
            onChange(min);
            return;
          }
          const parsed = Math.min(max, Math.max(min, parseInt(digitsOnly, 10)));
          onChange(parsed);
        }}
        className="w-12 border-x border-border bg-surface text-center text-body tnum font-semibold text-text focus-visible:outline-none disabled:bg-surface-2"
      />

      <button
        type="button"
        aria-label="რაოდენობის გაზრდა"
        disabled={disabled || value >= max}
        onClick={increase}
        className="flex w-10 items-center justify-center text-ink-700 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset disabled:pointer-events-none disabled:text-text-faint"
      >
        <Plus className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}
