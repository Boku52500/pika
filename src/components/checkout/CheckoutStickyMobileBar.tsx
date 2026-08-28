import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

/**
 * Mobile-only sticky submit bar, mirroring the PDP's `StickyMobileBuyBar`
 * pattern — keeps the total + confirm CTA reachable at the bottom of a long
 * form without obstructing the fields above it. Submits the same
 * surrounding `<form>` (no separate submit handler).
 */
export function CheckoutStickyMobileBar({
  total,
  submitting = false,
  submitDisabled,
  submitLabel,
}: {
  total: number;
  submitting?: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/97 px-4 py-3 shadow-[0_-4px_16px_rgba(13,15,21,0.08)] backdrop-blur lg:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-label font-medium normal-case tracking-normal text-text-faint">სულ</p>
          <p className="text-price truncate text-lg text-text">{formatPrice(total)}</p>
        </div>
        <Button type="submit" size="lg" className="w-auto min-w-[10rem] flex-1" disabled={submitDisabled ?? submitting}>
          {submitLabel ?? (submitting ? "მუშავდება..." : "შეკვეთის დადასტურება")}
        </Button>
      </div>
    </div>
  );
}
