"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { getCartTotal } from "@/lib/cart";
import type { PaymentMethodId } from "@/lib/checkout";
import type { ResolvedCartLine } from "@/hooks/useCart";
import { usePromoCode } from "@/hooks/usePromoCode";
import { CartLineCard } from "@/components/cart/CartLineCard";
import { PromoCodeField } from "@/components/cart/PromoCodeField";
import { OrderTotals } from "@/components/cart/OrderTotals";

/**
 * Checkout's right-column summary — read-only line items (reuses
 * `CartLineCard`), the same shared promo field, and the same `OrderTotals`
 * breakdown used on `/cart`. All pricing comes from `lib/cart.ts` +
 * `usePromoCode`, never recomputed locally.
 */
export function CheckoutOrderSummary({
  items,
  subtotal,
  deliveryFee,
  submitting = false,
  error,
  paymentMethod,
  className,
}: {
  items: ResolvedCartLine[];
  subtotal: number;
  deliveryFee: number;
  submitting?: boolean;
  error?: string | null;
  paymentMethod?: PaymentMethodId | null;
  className?: string;
}) {
  const { result } = usePromoCode(subtotal);
  const discount = result?.valid ? Math.min(result.discount, subtotal) : 0;
  const total = getCartTotal(subtotal, discount, deliveryFee);

  return (
    <div className={cn("flex flex-col gap-5 rounded-[var(--radius-md)] border border-border bg-surface p-5 sm:p-6", className)}>
      <h2 className="text-h3 text-text">შეკვეთის დეტალები</h2>

      <div className="-mx-1 flex max-h-72 flex-col divide-y divide-border overflow-y-auto px-1">
        {items.map((line) => (
          <CartLineCard key={line.id} line={line} compact readOnly onQuantityChange={() => {}} onRemove={() => {}} />
        ))}
      </div>

      <div className="border-t border-border pt-4">
        <PromoCodeField subtotal={subtotal} />
      </div>

      <OrderTotals subtotal={subtotal} discount={discount} delivery={deliveryFee} total={total} />

      {error ? (
        <p role="alert" className="text-small text-danger-500">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "მუშავდება..." : "შეკვეთის დადასტურება"}
      </Button>

      <p className="text-label text-center normal-case tracking-normal text-text-faint">
        {paymentMethod === "card"
          ? "შეკვეთის დადასტურების შემდეგ გადახვალთ საქართველოს ბანკის უსაფრთხო გადახდის გვერდზე."
          : paymentMethod === "bnpl" || paymentMethod === "bog_loan"
            ? "შეკვეთის დადასტურების შემდეგ გაიხსნება საქართველოს ბანკის კალკულატორი."
            : "ღილაკზე დაჭერით იქმნება შეკვეთა. ბარათის მონაცემები ამ გვერდზე არ გროვდება."}
      </p>
    </div>
  );
}
