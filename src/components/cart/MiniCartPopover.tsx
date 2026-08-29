"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useMiniCart } from "@/hooks/useMiniCart";
import { cn } from "@/lib/utils";
import { MiniCartContent } from "./MiniCartContent";

const AUTO_CLOSE_MS = 5000;

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export function MiniCartPopover({ anchorRef }: { anchorRef: React.RefObject<HTMLElement | null> }) {
  const { open, lastAdded, close } = useMiniCart();
  const { items } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [hovering, setHovering] = useState(false);
  const [entered, setEntered] = useState(false);

  const displayItem = lastAdded ?? items[items.length - 1] ?? null;

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => {
      window.cancelAnimationFrame(frame);
      setEntered(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open || hovering) return;
    const timer = window.setTimeout(close, AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open, hovering, close, lastAdded?.id, lastAdded?.quantity]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = isMobile ? document.body.style.overflow : "";
    if (isMobile) document.body.style.overflow = "hidden";

    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (sheetRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      close();
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      if (isMobile) document.body.style.overflow = originalOverflow;
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, anchorRef, isMobile]);

  if (!open || !displayItem) return null;

  return (
    <>
      {/* Desktop popover — no backdrop, page scroll stays enabled */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="კალათის შეჯამება"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setHovering(true)}
        onBlur={(event) => {
          if (!panelRef.current?.contains(event.relatedTarget as Node)) setHovering(false);
        }}
        className={cn(
          "absolute right-0 top-[calc(100%+0.5rem)] z-[80] hidden w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-lg transition-all duration-200 ease-out lg:block",
          entered ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-[0.98] opacity-0",
        )}
      >
        <MiniCartContent displayItem={displayItem} onClose={close} />
      </div>

      {/* Mobile bottom sheet */}
      <div className="fixed inset-0 z-[85] lg:hidden" aria-hidden={false}>
        <button
          type="button"
          aria-label="დახურვა"
          className={cn(
            "absolute inset-0 bg-ink-950/40 transition-opacity duration-200",
            entered ? "opacity-100" : "opacity-0",
          )}
          onClick={close}
        />
        <div
          ref={sheetRef}
          role="dialog"
          aria-label="კალათის შეჯამება"
          className={cn(
            "absolute inset-x-0 bottom-0 max-h-[min(85vh,32rem)] overflow-hidden rounded-t-[var(--radius-xl)] border border-border bg-surface shadow-[0_-8px_30px_rgba(15,17,23,0.12)] transition-transform duration-250 ease-out",
            entered ? "translate-y-0" : "translate-y-full",
          )}
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border-strong" aria-hidden />
          <MiniCartContent displayItem={displayItem} onClose={close} />
        </div>
      </div>
    </>
  );
}
