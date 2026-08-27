"use client";

import { Button } from "@/components/ui/Button";
import { OrderTotals } from "@/components/cart/OrderTotals";
import { formatGeorgianDate, formatPrice } from "@/lib/utils";
import { deliveryMethods, paymentMethods, getCityLabel } from "@/lib/checkout";
import { formatAddressLines } from "@/lib/addressFormat";
import type { StorefrontOrder } from "@/lib/orderView";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderItemsList } from "./OrderItemsList";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { RetryPaymentButton } from "@/components/payments/RetryPaymentButton";
import { paymentCopyFor, customerFacingPaymentStatus } from "@/lib/paymentCopy";

export function OrderDetailPageClient({
  order,
  canRetryPayment = false,
}: {
  order: StorefrontOrder | null;
  canRetryPayment?: boolean;
}) {
  if (!order) {
    return (
      <div className="flex flex-col items-start gap-4 py-10">
        <h1 className="text-h2 text-text">შეკვეთა ვერ მოიძებნა</h1>
        <p className="text-body max-w-md text-text-muted">ეს შეკვეთა არ არსებობს ან სხვა ანგარიშს ეკუთვნის.</p>
        <Button href="/account/orders" variant="secondary">
          შეკვეთებზე დაბრუნება
        </Button>
      </div>
    );
  }

  const deliveryMethod = deliveryMethods.find((m) => m.id === order.deliveryMethodId);
  const paymentMethod = paymentMethods.find((m) => m.id === order.paymentMethod);
  const paymentStatus = customerFacingPaymentStatus(order.paymentStatus, order.refundInProgress);
  const addressLines = formatAddressLines(order.delivery);
  const customerName = [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label text-text-faint">შეკვეთის ნომერი</p>
          <h1 className="text-h2 tnum text-text">{order.id}</h1>
          <p className="text-small mt-1 text-text-muted">{formatGeorgianDate(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <section className="rounded-[var(--radius-md)] border border-border bg-surface p-5">
        <h2 className="text-h3 mb-2 text-text">პროდუქტები</h2>
        <OrderItemsList items={order.items} />
        <div className="mt-3 border-t border-border pt-4">
          <OrderTotals subtotal={order.subtotal} discount={order.discount} delivery={order.deliveryFee} total={order.total} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="rounded-[var(--radius-md)] border border-border bg-surface p-5">
          <h2 className="text-h3 mb-3 text-text">მყიდველი</h2>
          <dl className="flex flex-col gap-2 text-small">
            <div>
              <dt className="text-label text-text-faint">სახელი</dt>
              <dd className="font-medium text-text">{customerName || "—"}</dd>
            </div>
            <div>
              <dt className="text-label text-text-faint">ტელეფონი</dt>
              <dd className="tnum text-text">{order.customer?.phone ? `+995 ${order.customer.phone}` : "—"}</dd>
            </div>
            <div>
              <dt className="text-label text-text-faint">ელ. ფოსტა</dt>
              <dd className="break-all text-text">{order.customer?.email || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[var(--radius-md)] border border-border bg-surface p-5">
          <h2 className="text-h3 mb-3 text-text">მიწოდება</h2>
          <p className="text-small font-medium text-text">{deliveryMethod?.label ?? "—"}</p>
          {deliveryMethod?.estimate ? <p className="text-label mt-0.5 text-text-faint">{deliveryMethod.estimate}</p> : null}
          <p className="text-small mt-3 text-text-muted">
            {addressLines.length ? addressLines.join(", ") : getCityLabel(order.delivery?.city ?? "")}
          </p>
        </section>
      </div>

      <section className="rounded-[var(--radius-md)] border border-border bg-surface p-5">
        <h2 className="text-h3 mb-2 text-text">გადახდა</h2>
        <p className="text-small font-medium text-text">{paymentMethod?.label ?? "—"}</p>
        {order.paymentMethod === "installment" && order.installmentMonths ? (
          <p className="text-label mt-1 text-text-muted">{order.installmentMonths} თვიანი განვადება</p>
        ) : null}
        <p className="text-label mt-1 text-text-faint">{paymentCopyFor(paymentStatus).label}</p>
        <div className="mt-3">
          <PaymentStatusBadge status={paymentStatus} />
        </div>
        {order.paymentStatus === "partially_refunded" && order.refundedAmount ? (
          <p className="text-small mt-2 text-text-muted">დაბრუნებულია {formatPrice(order.refundedAmount)}</p>
        ) : null}
        {canRetryPayment ? (
          <div className="mt-4">
            <RetryPaymentButton orderNumber={order.id} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
