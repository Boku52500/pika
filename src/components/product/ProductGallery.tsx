"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import type { ProductImageData } from "@/types/product";
import { cn } from "@/lib/utils";
import { ProductImage } from "./ProductImage";

/**
 * Reusable, keyboard-accessible product image gallery: swipeable main image
 * track (scroll-snap, same technique as HeroCarousel/ProductSection), a
 * thumbnail rail with a synced selected state, prev/next controls, and a
 * full-screen zoom/lightbox. Image sizing is fixed (aspect-square) so
 * switching slides never shifts layout.
 */
export function ProductGallery({
  images,
  productName,
  outOfStock = false,
  className,
}: {
  images: ProductImageData[];
  productName: string;
  outOfStock?: boolean;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const index = slideRefs.current.findIndex((el) => el === entry.target);
            if (index !== -1) setActive(index);
          }
        });
      },
      { root: track, threshold: [0.6] }
    );

    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [images.length]);

  const goTo = useCallback(
    (index: number) => {
      const clamped = (index + images.length) % images.length;
      slideRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      setActive(clamped);
    },
    [images.length]
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") goTo(active - 1);
      if (e.key === "ArrowRight") goTo(active + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, active, goTo]);

  const handleTrackKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(active - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(active + 1);
    }
  };

  const activeImage = images[active];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative">
        <div
          ref={trackRef}
          role="group"
          aria-label={`${productName} — სურათების გალერეა, ${active + 1} სურათი ${images.length}-დან`}
          tabIndex={0}
          onKeyDown={handleTrackKeyDown}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-[var(--radius-lg)] border border-border bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          {images.map((image, index) => (
            <div
              key={index}
              ref={(el) => {
                slideRefs.current[index] = el;
              }}
              className="w-full shrink-0 snap-start"
            >
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label={`${productName} — სურათის გადიდება`}
                className="group/zoom relative block w-full cursor-zoom-in"
              >
                <ProductImage visual={image.visual} tone={image.tone} src={image.src} alt={image.alt || productName} className="aspect-square rounded-none sm:aspect-[4/3] lg:aspect-square" />
                <span className="pointer-events-none absolute bottom-3 right-3 hidden items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-label font-medium normal-case tracking-normal text-ink-700 opacity-0 shadow-sm transition-opacity duration-150 group-hover/zoom:opacity-100 sm:inline-flex">
                  <ZoomIn className="size-3.5" strokeWidth={2} />
                  გადიდება
                </span>
              </button>
            </div>
          ))}
        </div>

        {outOfStock ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[var(--radius-lg)] bg-white/60 backdrop-saturate-150">
            <span className="text-label rounded-[var(--radius-xs)] bg-ink-900 px-3 py-1.5 text-white">არ არის მარაგში</span>
          </div>
        ) : null}

        {images.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="წინა სურათი"
              onClick={() => goTo(active - 1)}
              className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink-800 shadow-sm ring-1 ring-black/[0.04] transition-transform hover:scale-105 sm:size-10"
            >
              <ChevronLeft className="size-5" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              aria-label="შემდეგი სურათი"
              onClick={() => goTo(active + 1)}
              className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink-800 shadow-sm ring-1 ring-black/[0.04] transition-transform hover:scale-105 sm:size-10"
            >
              <ChevronRight className="size-5" strokeWidth={2.25} />
            </button>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              aria-label={`${productName} — სურათი ${index + 1}`}
              aria-current={index === active}
              onClick={() => goTo(index)}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border-2 transition-colors sm:size-20",
                index === active ? "border-brand-600" : "border-transparent hover:border-border-strong"
              )}
            >
              <ProductImage visual={image.visual} tone={image.tone} src={image.src} alt={image.alt || `${productName} — სურათი ${index + 1}`} className="rounded-[calc(var(--radius-sm)-2px)]" />
            </button>
          ))}
        </div>
      ) : null}

      {lightboxOpen ? (
        <div
          role="dialog"
          aria-modal
          aria-label={`${productName} — გადიდებული სურათი`}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-ink-950/92 p-4 sm:p-10"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            aria-label="დახურვა"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6 sm:top-6"
          >
            <X className="size-5" strokeWidth={2} />
          </button>

          <div
            className="relative w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <ProductImage visual={activeImage.visual} tone={activeImage.tone} src={activeImage.src} alt={activeImage.alt || productName} className="bg-transparent" />

            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="წინა სურათი"
                  onClick={() => goTo(active - 1)}
                  className="absolute left-0 top-1/2 flex size-11 -translate-x-[130%] -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 max-sm:translate-x-0 max-sm:left-2"
                >
                  <ChevronLeft className="size-6" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  aria-label="შემდეგი სურათი"
                  onClick={() => goTo(active + 1)}
                  className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 translate-x-[130%] items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 max-sm:translate-x-0 max-sm:right-2"
                >
                  <ChevronRight className="size-6" strokeWidth={2} />
                </button>
              </>
            ) : null}
          </div>

          {images.length > 1 ? (
            <p className="text-small tnum text-white/60">{active + 1} / {images.length}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
