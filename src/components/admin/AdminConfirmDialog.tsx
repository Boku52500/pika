"use client";

import { useEffect, useId, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "დადასტურება",
  cancelLabel = "გაუქმება",
  pending = false,
  danger = false,
  confirmDisabled = false,
  children,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  danger?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="დახურვა"
        className="absolute inset-0 bg-ink-950/50"
        onClick={pending ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-lg"
      >
        <h2 id={titleId} className="text-lg font-semibold text-text">
          {title}
        </h2>
        <p id={descId} className="text-small mt-2 text-text-muted">
          {description}
        </p>
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={pending || confirmDisabled}
            className={danger ? "bg-danger-600 hover:bg-danger-600/90" : undefined}
          >
            {pending ? "მიმდინარეობს..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
