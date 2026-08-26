import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";

function Pulse({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-full bg-surface-2", className)} />;
}

/**
 * PDP loading state — mirrors the real layout's structure (gallery, title,
 * pricing, CTA, specs) so navigation never causes a visible jump once real
 * content resolves.
 */
export function ProductDetailSkeleton() {
  return (
    <div aria-hidden>
      <Container className="py-4">
        <Pulse className="h-4 w-64 rounded-full" />
      </Container>

      <Container>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="flex flex-col gap-3">
            <div className="aspect-square w-full animate-pulse rounded-[var(--radius-lg)] bg-surface-2" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="size-16 shrink-0 animate-pulse rounded-[var(--radius-sm)] bg-surface-2 sm:size-20" />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <Pulse className="h-3 w-16" />
              <Pulse className="h-7 w-4/5 rounded-md" />
              <Pulse className="h-4 w-40" />
              <Pulse className="h-4 w-28" />
            </div>

            <div className="flex flex-col gap-2">
              <Pulse className="h-9 w-40 rounded-md" />
              <Pulse className="h-4 w-56" />
            </div>

            <div className="h-20 w-full animate-pulse rounded-[var(--radius-md)] bg-surface-2" />

            <div className="flex flex-col gap-2.5">
              <div className="h-12 w-full animate-pulse rounded-[var(--radius-sm)] bg-surface-2 sm:h-[3.25rem]" />
              <div className="h-12 w-full animate-pulse rounded-[var(--radius-sm)] bg-surface-2 sm:h-[3.25rem]" />
            </div>

            <div className="flex gap-2.5">
              <div className="h-11 flex-1 animate-pulse rounded-[var(--radius-sm)] bg-surface-2" />
              <div className="h-11 flex-1 animate-pulse rounded-[var(--radius-sm)] bg-surface-2" />
            </div>
          </div>
        </div>
      </Container>

      <Container className="mt-12 flex flex-col gap-8 py-8 lg:mt-16">
        <Pulse className="h-6 w-56 rounded-md" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-[var(--radius-md)] bg-surface-2" />
          ))}
        </div>
        <Pulse className="h-6 w-56 rounded-md" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-[var(--radius-md)] bg-surface-2" />
          ))}
        </div>
      </Container>
    </div>
  );
}
