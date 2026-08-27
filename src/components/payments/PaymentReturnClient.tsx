"use client";

import { useEffect } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { OrderItemsList } from "@/components/account/OrderItemsList";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { RetryPaymentButton } from "@/components/payments/RetryPaymentButton";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { usePromoCode } from "@/hooks/usePromoCode";
import { formatPrice } from "@/lib/utils";
import { paymentCopyFor } from "@/lib/paymentCopy";
import { paymentMethods } from "@/lib/checkout";
import type { PaymentPageData } from "@/lib/paymentView";

export function PaymentReturnClient({
  data,
  variant,
}: {
  data: PaymentPageData | null;
  variant: "success" | "fail";
}) {
  const { isLoggedIn } = useAuth();
  const { clear } = useCart();
  const { removeCode } = usePromoCode(0);
  const status = data?.order.paymentStatus ?? (variant === "fail" ? "failed" : "pending");
  const copy = paymentCopyFor(status);

  useEffect(() => {
    if (data?.order.paymentStatus === "paid") {
      clear();
      removeCode();
    }
  }, [clear, data?.order.paymentStatus, removeCode]);

  if (!data) {
    return (
      <Container className="py-16 text-center sm:py-24">
        <h1 className="text-h2 mb-3 text-text">შეკვეთა ვერ მოიძებნა</h1>
        <p className="text-body mx-auto mb-6 max-w-md text-text-muted">
          ეს გვერდი ხელმისაწვდომია მხოლოდ თქვენი შეკვეთის გადახდის შემდეგ.
        </p>
        <Button href="/">მთავარზე დაბრუნება</Button>
      </Container>
    );
  }

  const Icon = status === "paid" ? CheckCircle2 : status === "failed" ? XCircle : Clock;
  const iconWrap =
    status === "paid"
      ? "bg-success-50 text-success-600"
      : status === "failed"
        ? "bg-danger-50 text-danger-500"
        : "bg-warning-50 text-warning-500";
  const paymentMethod = paymentMethods.find((method) => method.id === data.order.paymentMethod);

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <span className={`flex size-16 items-center justify-center rounded-full ${iconWrap}`}>
          <Icon className="size-9" strokeWidth={1.5} />
        </span>
        <h1 className="text-h2 text-text">{copy.title}</h1>
        <p className="text-body max-w-md text-text-muted">{copy.body}</p>
        <p className="text-small tnum text-text-faint">
          შეკვეთის ნომერი — <span className="font-semibold text-text">{data.order.id}</span>
        </p>
        <PaymentStatusBadge status={data.order.paymentStatus} />
      </div>

      <div className="mx-auto mt-10 max-w-2xl rounded-[var(--radius-md)] border border-border bg-surface p-5">
        <p className="text-label mb-1 text-text-faint">გადახდის მეთოდი</p>
        <p className="text-body font-semibold text-text">{paymentMethod?.label ?? "საბანკო ბარათი"}</p>
        <p className="text-small mt-1 text-text-muted">გადახდა საქართველოს ბანკის უსაფრთხო გვერდზე</p>
        <div className="mt-4">
          <OrderItemsList items={data.order.items} />
          <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-body font-semibold text-text">სულ გადასახდელი</span>
            <span className="text-price text-2xl text-text">{formatPrice(data.order.total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
        {data.canRetry ? <RetryPaymentButton orderNumber={data.order.id} /> : null}
        <Button href="/" variant="secondary">
          მთავარზე დაბრუნება
        </Button>
        {isLoggedIn ? (
          <Button href={`/account/orders/${encodeURIComponent(data.order.id)}`} variant="secondary">
            შეკვეთის ნახვა
          </Button>
        ) : null}
      </div>
    </Container>
  );
}
