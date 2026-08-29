"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { heroSlides } from "@/data/heroSlides";
import { iconByVisual } from "@/components/product/ProductImage";
import { wrapCarouselIndex, trackScrollLeftForSlide } from "@/lib/heroCarousel";
import { cn } from "@/lib/utils";

/**
 * Minimal, image-forward promotional carousel: one primary slide plus a
 * peek of the next, arrow controls and dot pagination. Swap `heroSlides`
 * data to change campaigns.
 */
export function HeroCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

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
  }, []);

  const goTo = (index: number) => {
    const track = trackRef.current;
    const clamped = wrapCarouselIndex(index, heroSlides.length);
    const slide = slideRefs.current[clamped];
    if (!track || !slide) return;
    track.scrollTo({
      left: trackScrollLeftForSlide(track, slide),
      behavior: "smooth",
    });
    setActive(clamped);
  };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth"
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
              <Link
                href={slide.href}
                className={cn(
                  "group relative flex h-[240px] items-center overflow-hidden rounded-[var(--radius-xl)] sm:h-[280px] lg:h-[320px]",
                  slide.bg
                )}
              >
                <Icon
                  aria-hidden
                  className="pointer-events-none absolute -right-6 top-1/2 h-[85%] w-[85%] -translate-y-1/2 text-white/[0.08] transition-transform duration-500 group-hover:scale-105 sm:h-[75%] sm:w-[75%]"
                  strokeWidth={1}
                />

                {slide.ribbon ? (
                  <span className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-[0.8125rem] font-bold text-ink-900">
                    {slide.ribbon}
                  </span>
                ) : null}

                <div className="relative flex w-[76%] flex-col gap-2 p-5 sm:w-[62%] sm:p-8">
                  <span className="text-label tracking-[0.08em] text-white/60">
                    {slide.brand}
                  </span>
                  <h3 className="text-lg font-extrabold leading-snug text-white sm:text-2xl lg:text-[1.75rem]">
                    {slide.title}
                  </h3>
                  <p className="text-small text-white/70">{slide.description}</p>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="წინა სლაიდი"
        onClick={() => goTo(active - 1)}
        className="absolute left-2 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-ink-800 shadow-md transition-transform hover:scale-105 sm:flex"
      >
        <ChevronLeft className="size-5" strokeWidth={2.25} />
      </button>
      <button
        type="button"
        aria-label="შემდეგი სლაიდი"
        onClick={() => goTo(active + 1)}
        className="absolute right-2 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-ink-800 shadow-md transition-transform hover:scale-105 sm:flex"
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
              index === active ? "w-6 bg-ink-900" : "w-1.5 bg-ink-900/20 hover:bg-ink-900/35"
            )}
          />
        ))}
      </div>
    </div>
  );
}
