"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/hooks/useCart";
import { useMiniCart } from "@/hooks/useMiniCart";
import { cn } from "@/lib/utils";
import { MiniCartContent } from "./MiniCartContent";

export function MiniCartPopover({ anchorRef }: { anchorRef: React.RefObject<HTMLElement | null> }) {
  const { open, lastAdded, close } = useMiniCart();
  const { items } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const displayItem = lastAdded ?? items[items.length - 1] ?? null;

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

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
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, anchorRef]);

  if (!open || !displayItem) return null;

  return (
    <>
      {/* Desktop popover */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="კალათის შეჯამება"
        className="absolute right-0 top-[calc(100%+0.5rem)] z-[80] hidden w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-lg lg:block"
      >
        <MiniCartContent displayItem={displayItem} onClose={close} />
      </div>

      {/* Mobile bottom sheet */}
      <div className="fixed inset-0 z-[85] lg:hidden" aria-hidden={false}>
        <button
          type="button"
          aria-label="დახურვა"
          className="absolute inset-0 bg-ink-950/40"
          onClick={close}
        />
        <div
          ref={sheetRef}
          role="dialog"
          aria-label="კალათის შეჯამება"
          className={cn(
            "absolute inset-x-0 bottom-0 max-h-[min(85vh,32rem)] overflow-hidden rounded-t-[var(--radius-xl)] border border-border bg-surface shadow-[0_-8px_30px_rgba(15,17,23,0.12)]",
            "motion-safe:animate-[slide-up_0.25s_ease-out]",
          )}
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border-strong" aria-hidden />
          <MiniCartContent displayItem={displayItem} onClose={close} />
        </div>
      </div>
    </>
  );
}
