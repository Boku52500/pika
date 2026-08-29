import { Container } from "@/components/ui/Container";

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-surface-2 ${className ?? ""}`} />;
}

export function CategoryPageSkeleton() {
  return (
    <div aria-hidden className="py-6 sm:py-8">
      <Container>
        <Pulse className="mb-4 h-4 w-48" />
        <Pulse className="h-8 w-72 max-w-full rounded-md" />
        <Pulse className="mt-3 h-4 w-40" />

        <div className="mt-8 flex gap-8">
          <div className="hidden w-56 shrink-0 flex-col gap-3 lg:flex">
            {Array.from({ length: 6 }).map((_, index) => (
              <Pulse key={index} className="h-8 w-full rounded-[var(--radius-sm)]" />
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-5">
              <Pulse className="h-10 w-28 rounded-[var(--radius-sm)]" />
              <Pulse className="h-10 w-36 rounded-[var(--radius-sm)]" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface p-3">
                  <div className="aspect-square w-full animate-pulse rounded-[var(--radius-md)] bg-surface-2" />
                  <Pulse className="mt-3 h-3 w-16" />
                  <Pulse className="mt-2 h-5 w-4/5 rounded-md" />
                  <Pulse className="mt-2 h-4 w-24" />
                  <Pulse className="mt-4 h-11 w-full rounded-[var(--radius-sm)]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
