"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/types/product";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/utils";
import { ProductCard } from "./ProductCard";

/**
 * Reusable product collection section: a heading (with optional "view all"
 * link) plus a set of ProductCards.
 *
 * `layout="carousel"` (default) renders a horizontally-scrollable row with
 * arrow navigation on every breakpoint — this is what the homepage uses.
 * `layout="grid"` renders a responsive CSS grid (2 cols mobile → 4-5 cols
 * desktop) for future pages such as a category listing, without needing a
 * different component.
 */
export function ProductSection({
  eyebrow,
  title,
  description,
  href,
  products,
  layout = "carousel",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  products: Product[];
  layout?: "carousel" | "grid";
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByPage = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="py-10 sm:py-14">
      <Container>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          href={href}
          className="mb-6 sm:mb-8"
        />

        {layout === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} className="h-full" />
            ))}
          </div>
        ) : (
          <div className="relative">
            <div
              ref={trackRef}
              className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 sm:mx-0 sm:gap-5 sm:px-0"
            >
              {products.map((product) => (
                <div
                  key={product.id}
                  className="w-[46%] shrink-0 snap-start xs:w-[38%] sm:w-[29%] lg:w-[22%] xl:w-[18.5%]"
                >
                  <ProductCard product={product} className="h-full" />
                </div>
              ))}
            </div>

            <button
              type="button"
              aria-label="წინა პროდუქტები"
              onClick={() => scrollByPage(-1)}
              className={cn(
                "absolute -left-4 top-[38%] hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.06] bg-surface text-ink-800 shadow-md transition-transform hover:scale-105 sm:flex"
              )}
            >
              <ChevronLeft className="size-5" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              aria-label="შემდეგი პროდუქტები"
              onClick={() => scrollByPage(1)}
              className="absolute -right-4 top-[38%] hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.06] bg-surface text-ink-800 shadow-md transition-transform hover:scale-105 sm:flex"
            >
              <ChevronRight className="size-5" strokeWidth={2.25} />
            </button>
          </div>
        )}
      </Container>
    </section>
  );
}
