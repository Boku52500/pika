"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Mobile/tablet slide-out panel hosting the filter sidebar. */
export function FilterDrawer({
  open,
  onClose,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <div
      className={cn("fixed inset-0 z-[60] lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-ink-950/50 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
      />

      <div
        className={cn(
          "absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-surface shadow-lg transition-transform duration-250 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="text-h3 text-text">ფილტრი</span>
          <button
            type="button"
            aria-label="ფილტრის დახურვა"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-ink-700 hover:bg-black/[0.05]"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>

        {footer ? <div className="shrink-0 border-t border-border p-4">{footer}</div> : null}
      </div>
    </div>
  );
}
