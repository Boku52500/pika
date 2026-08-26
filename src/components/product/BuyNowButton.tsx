"use client";

import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Strongest CTA on the PDP (checkout doesn't exist yet). Clicking shows a
 * transient, honest note instead of pretending to redirect anywhere, so the
 * button stays satisfying to use without lying about functionality.
 */
export function BuyNowButton({
  productName,
  disabled = false,
  className,
}: {
  productName: string;
  disabled?: boolean;
  className?: string;
}) {
  const [showNote, setShowNote] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Button
        type="button"
        variant="primary"
        size="lg"
        disabled={disabled}
        aria-label={disabled ? `${productName} — არ არის ხელმისაწვდომი` : `${productName} — ახლავე ყიდვა`}
        onClick={() => {
          if (disabled) return;
          setShowNote(true);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setShowNote(false), 2600);
        }}
        className="w-full gap-2"
      >
        <Zap className="size-[18px]" strokeWidth={2} />
        ახლავე ყიდვა
      </Button>
      {showNote ? (
        <p role="status" className="text-label text-center font-medium normal-case tracking-normal text-text-faint">
          გადახდის სისტემა მალე ხელმისაწვდომი იქნება
        </p>
      ) : null}
    </div>
  );
}
