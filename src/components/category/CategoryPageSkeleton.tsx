import { Container } from "@/components/ui/Container";

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-surface-2 ${className ?? ""}`} />;
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface p-3 shadow-xs">
      <div className="aspect-square w-full animate-pulse rounded-[var(--radius-md)] bg-surface-2" />
      <Pulse className="mt-3 h-3 w-16" />
      <Pulse className="mt-2 h-5 w-4/5 rounded-md" />
      <Pulse className="mt-2 h-4 w-24" />
      <Pulse className="mt-4 h-10 w-full rounded-[var(--radius-md)]" />
    </div>
  );
}

export function CategoryPageSkeleton() {
  return (
    <div aria-hidden className="py-6 sm:py-8">
      <Container>
        <Pulse className="mb-5 h-4 w-48" />
        <div className="mb-6 flex items-end justify-between gap-4">
          <Pulse className="h-8 w-72 max-w-full rounded-md" />
          <Pulse className="h-8 w-28 rounded-full" />
        </div>

        <div className="mb-5 h-14 animate-pulse rounded-[var(--radius-lg)] border border-border bg-surface" />

        <div className="flex items-start gap-8">
          <div className="hidden w-64 shrink-0 rounded-[var(--radius-lg)] border border-border bg-surface p-4 lg:block">
            {Array.from({ length: 6 }).map((_, index) => (
              <Pulse key={index} className="mb-3 h-8 w-full rounded-[var(--radius-sm)]" />
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <CardSkeleton key={index} />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
