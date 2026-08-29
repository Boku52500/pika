function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface p-3 shadow-xs">
      <div className="aspect-square w-full animate-pulse rounded-[var(--radius-md)] bg-surface-2" />
      <div className="mt-3 h-3 w-16 animate-pulse rounded-full bg-surface-2" />
      <div className="mt-2 h-5 w-4/5 animate-pulse rounded-md bg-surface-2" />
      <div className="mt-2 h-4 w-24 animate-pulse rounded-full bg-surface-2" />
      <div className="mt-4 h-10 w-full animate-pulse rounded-[var(--radius-md)] bg-surface-2" />
    </div>
  );
}

export function ProductCarouselSkeleton({ title }: { title: string }) {
  return (
    <section aria-hidden className="py-8 sm:py-10">
      <div className="mx-auto max-w-[var(--container-max)] px-4 sm:px-6">
        <div className="mb-6 h-7 w-56 max-w-full animate-pulse rounded-md bg-surface-2" />
        <p className="sr-only">{title}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProductRecommendationsSkeleton() {
  return (
    <>
      <ProductCarouselSkeleton title="მსგავსი პროდუქტები" />
      <ProductCarouselSkeleton title="შეიძლება მოგეწონოთ" />
    </>
  );
}
