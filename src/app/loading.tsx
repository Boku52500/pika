import { StorefrontHeader } from "@/components/layout/StorefrontHeader";
import { Footer } from "@/components/layout/Footer";
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

export default function HomeLoading() {
  return (
    <>
      <StorefrontHeader />
      <main aria-hidden className="flex-1">
        <Container className="py-6 sm:py-8">
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-[260px] w-[88%] shrink-0 animate-pulse rounded-[var(--radius-xl)] border border-border bg-surface-2 sm:h-[300px] lg:h-[340px] lg:w-[42%]"
              />
            ))}
          </div>
          <Pulse className="mx-auto mt-4 h-1.5 w-6 rounded-full" />
        </Container>

        <Container className="py-8">
          <Pulse className="mb-2 h-4 w-24" />
          <Pulse className="mb-6 h-8 w-56 rounded-md" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center rounded-[var(--radius-lg)] border border-border bg-surface p-4">
                <div className="size-12 animate-pulse rounded-[var(--radius-md)] bg-surface-2 sm:size-14" />
                <Pulse className="mt-3 h-4 w-20" />
              </div>
            ))}
          </div>
        </Container>

        <Container className="py-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
