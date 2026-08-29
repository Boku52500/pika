"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/hooks/useCart";
import { useCartDrawer } from "@/hooks/useCartDrawer";
import { cn, formatPrice } from "@/lib/utils";
import { CartLineCard } from "./CartLineCard";
import { EmptyCartState } from "./EmptyCartState";

/**
 * Polished right-side mini-cart drawer, mounted once from the `Header` and
 * driven entirely by `useCartDrawer` (open state) + `useCart` (data) — no
 * props needed. Full-width on mobile ("full-screen" per the mobile-cart
 * spec), capped to a comfortable panel width from `sm` up.
 */
export function CartDrawer() {
  const { open, closeDrawer } = useCartDrawer();
  const { items, count, subtotal, setQuantity, removeItem } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;

      const container = panelRef.current;
      if (!container) return;
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, closeDrawer]);

  return (
    <div className={cn("fixed inset-0 z-[70]", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <div
        onClick={closeDrawer}
        className={cn("absolute inset-0 bg-ink-950/50 transition-opacity duration-200", open ? "opacity-100" : "opacity-0")}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="თქვენი კალათა"
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col bg-surface shadow-lg transition-transform duration-250 ease-out sm:max-w-md",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-5">
          <h2 className="text-h3 text-text">
            თქვენი კალათა
            {count > 0 ? <span className="text-body tnum ml-2 font-normal text-text-faint">({count})</span> : null}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="კალათის დახურვა"
            onClick={closeDrawer}
            className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-ink-700 transition-colors hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex min-w-0 flex-1 items-center justify-center overflow-x-hidden px-4 sm:px-6">
            <EmptyCartState compact onNavigate={closeDrawer} />
          </div>
        ) : (
          <>
            <div className="flex-1 divide-y divide-border overflow-y-auto px-4 sm:px-5">
              {items.map((line) => (
                <CartLineCard
                  key={line.id}
                  line={line}
                  compact
                  onQuantityChange={(quantity) => setQuantity(line.id, quantity)}
                  onRemove={() => removeItem(line.id)}
                />
              ))}
            </div>

            <div className="shrink-0 border-t border-border p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-body font-medium text-text">შუალედური ჯამი</span>
                <span className="text-price text-lg text-text">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex flex-col gap-2.5">
                <Button href="/cart" onClick={closeDrawer} variant="secondary" size="lg" className="w-full">
                  კალათის ნახვა
                </Button>
                <Button href="/checkout" onClick={closeDrawer} size="lg" className="w-full">
                  შეკვეთის გაგრძელება
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
