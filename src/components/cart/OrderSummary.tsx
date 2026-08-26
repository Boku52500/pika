"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { getCartTotal, getDeliveryFee } from "@/lib/cart";
import { usePromoCode } from "@/hooks/usePromoCode";
import { PromoCodeField } from "./PromoCodeField";
import { OrderTotals } from "./OrderTotals";

/**
 * `/cart` page order-summary panel. All pricing math is delegated to
 * `lib/cart.ts` + the shared `usePromoCode` hook — this component only
 * arranges the promo field, the totals breakdown, and the checkout CTA.
 */
export function OrderSummary({ subtotal, className }: { subtotal: number; className?: string }) {
  const { result } = usePromoCode(subtotal);

  const discount = result?.valid ? Math.min(result.discount, subtotal) : 0;
  const payableSubtotal = Math.max(0, subtotal - discount);
  const delivery = getDeliveryFee(payableSubtotal);
  const total = getCartTotal(subtotal, discount, delivery);

  return (
    <div className={cn("flex flex-col gap-5 rounded-[var(--radius-md)] border border-border bg-surface p-5 sm:p-6", className)}>
      <h2 className="text-h3 text-text">შეკვეთის დეტალები</h2>

      <PromoCodeField subtotal={subtotal} />

      <div className="border-t border-border pt-4">
        <OrderTotals subtotal={subtotal} discount={discount} delivery={delivery} total={total} showFreeDeliveryHint />
      </div>

      <Button href="/checkout" size="lg" className="w-full">
        შეკვეთის გაგრძელება
      </Button>

      <p className="text-label text-center normal-case tracking-normal text-text-faint">
        გადახდისა და მიწოდების საბოლოო დეტალები შემდეგ ეტაპზე გახდება ხელმისაწვდომი
      </p>
    </div>
  );
}
