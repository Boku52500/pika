import { formatPrice, cn } from "@/lib/utils";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/cart";

/**
 * Pure subtotal -> discount -> delivery -> total breakdown, shared by the
 * cart page's order summary and the checkout order summary so the pricing
 * *display* — not just the math — only exists once.
 */
export function OrderTotals({
  subtotal,
  discount,
  delivery,
  total,
  showFreeDeliveryHint = false,
  className,
}: {
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  showFreeDeliveryHint?: boolean;
  className?: string;
}) {
  const payableSubtotal = Math.max(0, subtotal - discount);
  const amountUntilFreeDelivery = FREE_DELIVERY_THRESHOLD - payableSubtotal;

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex items-center justify-between text-small text-text-muted">
        <span>შუალედური ჯამი</span>
        <span className="tnum text-text">{formatPrice(subtotal)}</span>
      </div>

      {discount > 0 ? (
        <div className="flex items-center justify-between text-small text-success-600">
          <span>ფასდაკლება</span>
          <span className="tnum">-{formatPrice(discount)}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between text-small text-text-muted">
        <span>მიწოდება</span>
        <span className="tnum text-text">{delivery === 0 ? "უფასო" : formatPrice(delivery)}</span>
      </div>

      {showFreeDeliveryHint && delivery > 0 && amountUntilFreeDelivery > 0 ? (
        <p className="text-label text-text-faint">
          დაამატეთ კიდევ {formatPrice(amountUntilFreeDelivery)} — და მიწოდება იქნება უფასო
        </p>
      ) : null}

      <div className="flex items-baseline justify-between border-t border-border pt-4">
        <span className="text-body font-semibold text-text">სულ</span>
        <span className="text-price text-2xl text-text">{formatPrice(total)}</span>
      </div>
    </div>
  );
}
