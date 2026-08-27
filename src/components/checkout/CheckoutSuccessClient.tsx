"use client";

import { CheckCircle2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { OrderItemsList } from "@/components/account/OrderItemsList";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/lib/utils";
import type { StorefrontOrder } from "@/lib/orderView";
import { deliveryMethods, paymentMethods, getCityLabel } from "@/lib/checkout";
import { paymentCopyFor } from "@/lib/paymentCopy";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { featuredCategories } from "@/data/categories";

/**
 * Confirmation for a just-placed order loaded on the server (session owner
 * or short-lived confirmation cookie). Random order numbers are not shown.
 */
export function CheckoutSuccessClient({ order }: { order: StorefrontOrder | null }) {
  const { isLoggedIn } = useAuth();

  if (!order) {
    return (
      <Container className="py-16 text-center sm:py-24">
        <h1 className="text-h2 mb-3 text-text">შეკვეთა ვერ მოიძებნა</h1>
        <p className="text-body mx-auto mb-6 max-w-md text-text-muted">
          ეს გვერდი ხელმისაწვდომია მხოლოდ შეკვეთის წარმატებული გაფორმების შემდეგ.
        </p>
        <Button href="/">მთავარზე დაბრუნება</Button>
      </Container>
    );
  }

  const deliveryMethod = deliveryMethods.find((m) => m.id === order.deliveryMethodId);
  const paymentMethod = paymentMethods.find((m) => m.id === order.paymentMethod);
  const cityLabel = getCityLabel(order.delivery?.city ?? "");

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-success-50">
          <CheckCircle2 className="size-9 text-success-600" strokeWidth={1.5} />
        </span>
        <h1 className="text-h2 text-text">შეკვეთა წარმატებით გაფორმდა</h1>
        <p className="text-body max-w-md text-text-muted">
          {paymentCopyFor(order.paymentStatus).body}
        </p>
        <p className="text-small tnum text-text-faint">
          შეკვეთის ნომერი — <span className="font-semibold text-text">{order.id}</span>
        </p>
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={order.paymentStatus} />
      </div>

      <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius-md)] border border-border bg-surface p-5">
          <p className="text-label mb-1 text-text-faint">მიწოდება</p>
          <p className="text-body font-semibold text-text">{deliveryMethod?.label}</p>
          <p className="text-small mt-1 text-text-muted">
            {cityLabel}
            {order.delivery?.address ? `, ${order.delivery.address}` : ""}
          </p>
        </div>

        <div className="rounded-[var(--radius-md)] border border-border bg-surface p-5">
          <p className="text-label mb-1 text-text-faint">გადახდის მეთოდი</p>
          <p className="text-body font-semibold text-text">{paymentMethod?.label}</p>
          <p className="text-small mt-1 text-text-muted">{paymentCopyFor(order.paymentStatus).label}</p>
          {order.paymentMethod === "installment" && order.installmentMonths ? (
            <p className="text-small mt-1 text-text-muted">{order.installmentMonths} თვიანი განვადება</p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto mt-4 max-w-2xl rounded-[var(--radius-md)] border border-border bg-surface p-5">
        <p className="text-label mb-3 text-text-faint">შეკვეთილი პროდუქტები</p>
        <OrderItemsList items={order.items} />

        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-body font-semibold text-text">სულ გადასახდელი</span>
          <span className="text-price text-2xl text-text">{formatPrice(order.total)}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
        <Button href="/" variant="secondary">
          მთავარზე დაბრუნება
        </Button>
        {isLoggedIn ? (
          <Button href="/account/orders" variant="secondary">
            ჩემი შეკვეთები
          </Button>
        ) : null}
        <Button href={featuredCategories[0].href}>შემდეგი შენაძენი</Button>
      </div>
    </Container>
  );
}
