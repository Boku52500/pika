"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Looks like an inert search field but is actually a button — tapping it
 * opens the dedicated `MobileSearchOverlay` instead of trying to squeeze the
 * full dropdown experience into the narrow mobile header.
 */
export function MobileSearchTrigger({ onOpen, className }: { onOpen: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="ძებნის გახსნა: მოძებნე პროდუქტი, ბრენდი ან კატეგორია"
      className={cn(
        "flex h-11 w-full items-center gap-2.5 rounded-[var(--radius-md)] border border-border-strong bg-surface-2 px-4 text-left text-[0.9375rem] text-text-faint transition-colors active:bg-surface",
        className
      )}
    >
      <Search className="size-[18px] shrink-0 text-text-faint" strokeWidth={2} />
      <span className="truncate">მოძებნე პროდუქტი, ბრენდი ან კატეგორია</span>
    </button>
  );
}
