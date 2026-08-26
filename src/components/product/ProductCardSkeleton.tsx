import { cn } from "@/lib/utils";

/**
 * Loading placeholder mirroring ProductCard's structure exactly, so grids
 * don't jump when real data resolves. Intended for future API loading
 * states — not wired to anything yet.
 */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface",
        className
      )}
    >
      <div className="p-3 pb-0">
        <div className="aspect-square w-full animate-pulse rounded-[var(--radius-md)] bg-surface-2" />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 pt-3">
        <div className="h-3 w-14 animate-pulse rounded-full bg-surface-2" />
        <div className="h-4 w-4/5 animate-pulse rounded-full bg-surface-2" />
        <div className="h-4 w-3/5 animate-pulse rounded-full bg-surface-2" />
        <div className="h-3.5 w-24 animate-pulse rounded-full bg-surface-2" />
        <div className="mt-1 h-6 w-28 animate-pulse rounded-full bg-surface-2" />

        <div className="mt-auto flex flex-col gap-3 pt-3">
          <div className="h-3 w-20 animate-pulse rounded-full bg-surface-2" />
          <div className="h-10 w-full animate-pulse rounded-[var(--radius-sm)] bg-surface-2" />
        </div>
      </div>
    </div>
  );
}
