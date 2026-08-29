"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { heroSlides } from "@/data/heroSlides";
import { iconByVisual } from "@/components/product/ProductImage";
import { closestSlideIndex, scrollLeftForSlide, wrapCarouselIndex } from "@/lib/heroCarousel";
import { cn } from "@/lib/utils";

const SCROLL_SYNC_MS = 80;
const PROGRAMMATIC_SCROLL_MS = 450;

/**
 * Index-driven hero carousel — one slide per next/prev, dots stay in sync,
 * CTA is an isolated link (no whole-card navigation).
 */
export function HeroCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const programmaticScrollRef = useRef(false);
  const programmaticTimerRef = useRef<number | null>(null);
  const [active, setActive] = useState(0);

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    const clamped = wrapCarouselIndex(index, heroSlides.length);
    const slide = slideRefs.current[clamped];
    if (!track || !slide) return;

    programmaticScrollRef.current = true;
    if (programmaticTimerRef.current) window.clearTimeout(programmaticTimerRef.current);
    programmaticTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, PROGRAMMATIC_SCROLL_MS);

    setActive(clamped);
    track.scrollTo({ left: scrollLeftForSlide(track, slide), behavior: "smooth" });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let syncTimer: number | null = null;
    const syncActiveFromScroll = () => {
      if (programmaticScrollRef.current) return;
      const offsets = slideRefs.current.map((slide) => slide?.offsetLeft ?? 0);
      const index = closestSlideIndex(track.scrollLeft, offsets);
      setActive(index);
    };

    const onScroll = () => {
      if (syncTimer) window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(syncActiveFromScroll, SCROLL_SYNC_MS);
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (syncTimer) window.clearTimeout(syncTimer);
      if (programmaticTimerRef.current) window.clearTimeout(programmaticTimerRef.current);
    };
  }, []);

  return (
    <div className="relative overflow-x-hidden">
      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1"
      >
        {heroSlides.map((slide, index) => {
          const Icon = iconByVisual[slide.visual];
          return (
            <div
              key={slide.id}
              ref={(el) => {
                slideRefs.current[index] = el;
              }}
              className="w-[88%] shrink-0 snap-start xs:w-[74%] sm:w-[58%] lg:w-[47%] xl:w-[42%]"
            >
              <div className="group relative flex h-[260px] items-stretch overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md sm:h-[300px] lg:h-[340px]">
                <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-3 p-5 sm:p-7 lg:p-8">
                  {slide.ribbon ? (
                    <span className="inline-flex w-fit rounded-full bg-brand-50 px-3 py-1 text-[0.8125rem] font-bold text-brand-700">
                      {slide.ribbon}
                    </span>
                  ) : null}
                  <span className="text-label font-semibold tracking-[0.06em] text-brand-600">{slide.brand}</span>
                  <h3 className="text-xl font-extrabold leading-tight text-text sm:text-2xl lg:text-[1.875rem]">
                    {slide.title}
                  </h3>
                  <p className="text-small max-w-sm text-text-muted sm:text-body">{slide.description}</p>
                  <Link
                    href={slide.href}
                    className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-md)] bg-brand-600 px-4 py-2.5 text-small font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    იხილე მეტი
                    <ArrowRight className="size-4" strokeWidth={2.25} />
                  </Link>
                </div>

                <div
                  aria-hidden
                  className="relative hidden w-[42%] shrink-0 items-center justify-center bg-gradient-to-br from-brand-50 to-surface-2 sm:flex"
                >
                  <Icon
                    className="size-[min(12rem,70%)] text-brand-600/15 transition-transform duration-500 group-hover:scale-105"
                    strokeWidth={0.75}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="წინა სლაიდი"
        onClick={() => goTo(active - 1)}
        className="absolute left-2 top-1/2 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-ink-800 shadow-md transition-transform hover:scale-105 sm:flex"
      >
        <ChevronLeft className="size-5" strokeWidth={2.25} />
      </button>
      <button
        type="button"
        aria-label="შემდეგი სლაიდი"
        onClick={() => goTo(active + 1)}
        className="absolute right-2 top-1/2 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-ink-800 shadow-md transition-transform hover:scale-105 sm:flex"
      >
        <ChevronRight className="size-5" strokeWidth={2.25} />
      </button>

      <div className="mt-4 flex items-center justify-center gap-1.5">
        {heroSlides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`სლაიდი ${index + 1}`}
            aria-current={index === active ? true : undefined}
            onClick={() => goTo(index)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-200",
              index === active ? "w-6 bg-brand-600" : "w-1.5 bg-brand-600/20 hover:bg-brand-600/35",
            )}
          />
        ))}
      </div>
    </div>
  );
}
