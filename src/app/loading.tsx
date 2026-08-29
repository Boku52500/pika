import { StorefrontHeader } from "@/components/layout/StorefrontHeader";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-surface-2 ${className ?? ""}`} />;
}

export default function HomeLoading() {
  return (
    <>
      <StorefrontHeader />
      <main aria-hidden className="flex-1">
        <div className="h-[min(28rem,55vh)] animate-pulse bg-surface-2" />
        <Container className="py-10">
          <Pulse className="mx-auto mb-8 h-7 w-64 rounded-md" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface p-3">
                <div className="aspect-square w-full animate-pulse rounded-[var(--radius-md)] bg-surface-2" />
                <Pulse className="mt-3 h-3 w-16" />
                <Pulse className="mt-2 h-5 w-4/5 rounded-md" />
                <Pulse className="mt-2 h-4 w-24" />
              </div>
            ))}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
