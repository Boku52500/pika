import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/admin";
import { getAdminOrder } from "@/server/admin/orders";
import { formatGeorgianDate, formatPrice } from "@/lib/utils";
import { getCityLabel } from "@/lib/checkout";
import {
  DELIVERY_METHOD_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/lib/adminLabels";
import { adminCardClass } from "@/components/admin/adminUi";
import { ProductImage } from "@/components/product/ProductImage";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { PaymentRefreshForm } from "@/components/admin/PaymentRefreshForm";
import { PaymentRefundForm } from "@/components/admin/PaymentRefundForm";
import { PaymentCaptureForm } from "@/components/admin/PaymentCaptureForm";
import { AdminEmailHistory } from "@/components/admin/AdminEmailHistory";
import { PAYMENT_STATUS_COPY } from "@/lib/paymentCopy";
import { PAYMENT_REFUND_STATUS_LABEL } from "@/lib/adminLabels";
import type { ProductVisual } from "@/types/product";

export const metadata: Metadata = { title: "შეკვეთა" };

const VISUALS: ProductVisual[] = [
  "phone",
  "laptop",
  "tablet",
  "tv",
  "monitor",
  "gaming",
  "keyboard",
  "components",
  "accessory",
  "audio",
  "smart-home",
  "network",
];

function asVisual(value: string | null): ProductVisual {
  return value && (VISUALS as string[]).includes(value) ? (value as ProductVisual) : "accessory";
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/orders/${id}`);
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const address = [getCityLabel(order.city), order.street, order.building, order.apartment, order.entrance, order.floor]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label text-text-faint">შეკვეთის ნომერი</p>
          <h1 className="tnum text-2xl font-extrabold tracking-tight text-text">{order.orderNumber}</h1>
          <p className="text-small mt-1 text-text-muted">{formatGeorgianDate(new Date(order.createdAt).getTime())}</p>
        </div>
        <div className="text-small text-text-muted">
          {ORDER_STATUS_LABEL[order.orderStatus]} · {PAYMENT_STATUS_LABEL[order.paymentStatus]}
        </div>
      </div>

      <section className={adminCardClass}>
        <h2 className="mb-3 text-base font-semibold text-text">სტატუსის მართვა</h2>
        <OrderStatusForm orderId={order.id} current={order.orderStatus} />
        <p className="text-label mt-3 text-text-faint">
          შეკვეთის სტატუსი ცალკე რჩება გადახდისგან. BOG ბარათის სტატუსს ადმინი ხელით PAID-ზე ვერ გადაიყვანს —
          გამოიყენეთ გადახდის სტატუსის განახლება.
        </p>
      </section>

      <section className={adminCardClass}>
        <h2 className="mb-3 text-base font-semibold text-text">გადახდები</h2>
        <p className="text-small mb-3 text-text-muted">
          {PAYMENT_METHOD_LABEL[order.paymentMethod]} · {PAYMENT_STATUS_LABEL[order.paymentStatus]}
        </p>
        {order.payments.length === 0 ? (
          <p className="text-small text-text-muted">ამ შეკვეთაზე პროვაიდერის გადახდის მცდელობა არ არის.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {order.payments.map((payment) => (
              <li key={payment.id} className="rounded-[var(--radius-sm)] border border-border p-3 text-small">
                <p className="font-semibold text-text">
                  {payment.provider === "bog" ? "საქართველოს ბანკი" : payment.provider} ·{" "}
                  {PAYMENT_STATUS_COPY[payment.status]?.label ?? payment.status}
                </p>
                <dl className="mt-2 grid gap-1 text-text-muted">
                  <div className="flex justify-between gap-3">
                    <dt>გადახდილი თანხა</dt>
                    <dd className="tnum font-medium text-text">{formatPrice(payment.amount)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>დაბრუნებული თანხა</dt>
                    <dd className="tnum font-medium text-text">{formatPrice(payment.refundedAmount)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>დასაბრუნებელი დარჩენილი თანხა</dt>
                    <dd className="tnum font-medium text-text">{formatPrice(payment.remainingAmount)}</dd>
                  </div>
                  {payment.providerOrderId ? (
                    <div>
                      <dt className="text-label text-text-faint">BOG order id</dt>
                      <dd className="tnum break-all">{payment.providerOrderId}</dd>
                    </div>
                  ) : null}
                  {payment.providerStatus ? (
                    <div>
                      <dt className="text-label text-text-faint">პროვაიდერის სტატუსი</dt>
                      <dd>{payment.providerStatus}</dd>
                    </div>
                  ) : null}
                  {payment.method ? (
                    <div>
                      <dt className="text-label text-text-faint">მეთოდი</dt>
                      <dd>{payment.method}</dd>
                    </div>
                  ) : null}
                  {payment.transactionId ? (
                    <div>
                      <dt className="text-label text-text-faint">Transaction ID</dt>
                      <dd className="tnum break-all">{payment.transactionId}</dd>
                    </div>
                  ) : null}
                  {payment.authCode ? (
                    <div>
                      <dt className="text-label text-text-faint">Auth code</dt>
                      <dd className="tnum">{payment.authCode}</dd>
                    </div>
                  ) : null}
                  {payment.captureMode ? (
                    <div>
                      <dt className="text-label text-text-faint">Capture mode</dt>
                      <dd>{payment.captureMode}</dd>
                    </div>
                  ) : null}
                  {payment.authorizedAmount != null ? (
                    <div className="flex justify-between gap-3">
                      <dt>ავტორიზებული თანხა</dt>
                      <dd className="tnum font-medium text-text">{formatPrice(payment.authorizedAmount)}</dd>
                    </div>
                  ) : null}
                  {payment.capturedAmount != null ? (
                    <div className="flex justify-between gap-3">
                      <dt>ჩამოჭრილი თანხა</dt>
                      <dd className="tnum font-medium text-text">{formatPrice(payment.capturedAmount)}</dd>
                    </div>
                  ) : null}
                  {payment.splitStatus ? (
                    <div>
                      <dt className="text-label text-text-faint">Split status</dt>
                      <dd>
                        {payment.splitStatus}. დაბრუნება უკვე შესრულებულ split-ს ავტომატურად არ აბრუნებს.
                      </dd>
                    </div>
                  ) : null}
                  {payment.parentProviderOrderId ? (
                    <div>
                      <dt className="text-label text-text-faint">Saved card parent</dt>
                      <dd className="tnum break-all">{payment.parentProviderOrderId}</dd>
                    </div>
                  ) : null}
                  {payment.loanMonth ? (
                    <div>
                      <dt className="text-label text-text-faint">განვადება</dt>
                      <dd>
                        {payment.loanMonth} თვე{payment.loanDiscountCode ? ` · ${payment.loanDiscountCode}` : ""}
                      </dd>
                    </div>
                  ) : null}
                  {payment.responseCode ? (
                    <div>
                      <dt className="text-label text-text-faint">Response</dt>
                      <dd>
                        {payment.responseCode}
                        {payment.responseDescription ? ` — ${payment.responseDescription}` : ""}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-label text-text-faint">შექმნა</dt>
                    <dd>{formatGeorgianDate(new Date(payment.createdAt).getTime())}</dd>
                  </div>
                  {payment.completedAt ? (
                    <div>
                      <dt className="text-label text-text-faint">დასრულება</dt>
                      <dd>{formatGeorgianDate(new Date(payment.completedAt).getTime())}</dd>
                    </div>
                  ) : null}
                </dl>
                {payment.canCapture ? (
                  <PaymentCaptureForm paymentId={payment.id} authorizedAmount={payment.authorizedAmount} />
                ) : null}
                {payment.providerActions?.length ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-label mb-2 font-medium text-text">პროვაიდერის ქმედებები</p>
                    <ul className="flex flex-col gap-1 text-label text-text-muted">
                      {payment.providerActions.map((action) => (
                        <li key={action.id}>
                          {action.type} · {action.status}
                          {action.normalizedStatus ? ` · ${action.normalizedStatus}` : ""}
                          {action.providerActionId ? ` · ${action.providerActionId}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {payment.refunds.length > 0 ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-label mb-2 font-medium text-text">დაბრუნების ისტორია</p>
                    <ul className="flex flex-col gap-2">
                      {payment.refunds.map((refund) => (
                        <li key={refund.id} className="rounded-[var(--radius-sm)] bg-surface-2 p-2">
                          <p className="font-medium text-text">
                            {formatPrice(refund.amount)} · {PAYMENT_REFUND_STATUS_LABEL[refund.status]}
                          </p>
                          <dl className="mt-1 grid gap-0.5 text-label text-text-muted">
                            {refund.providerActionId ? (
                              <div>
                                <dt className="text-text-faint">BOG action id</dt>
                                <dd className="tnum break-all">{refund.providerActionId}</dd>
                              </div>
                            ) : null}
                            {refund.providerStatus ? (
                              <div>
                                <dt className="text-text-faint">პროვაიდერის სტატუსი</dt>
                                <dd>{refund.providerStatus}{refund.providerMessage ? ` — ${refund.providerMessage}` : ""}</dd>
                              </div>
                            ) : null}
                            <div>
                              <dt className="text-text-faint">მოთხოვნის თარიღი</dt>
                              <dd>{formatGeorgianDate(new Date(refund.createdAt).getTime())}</dd>
                            </div>
                            {refund.completedAt ? (
                              <div>
                                <dt className="text-text-faint">დასრულება</dt>
                                <dd>{formatGeorgianDate(new Date(refund.completedAt).getTime())}</dd>
                              </div>
                            ) : null}
                            {refund.adminNote ? (
                              <div>
                                <dt className="text-text-faint">შენიშვნა</dt>
                                <dd>{refund.adminNote}</dd>
                              </div>
                            ) : null}
                          </dl>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {payment.provider === "bog" &&
                (payment.status === "paid" || payment.status === "partially_refunded" || payment.status === "refunded") ? (
                  <PaymentRefundForm
                    paymentId={payment.id}
                    orderNumber={order.orderNumber}
                    paidAmount={payment.amount}
                    refundedAmount={payment.refundedAmount}
                    remainingAmount={payment.remainingAmount}
                    providerOrderId={payment.providerOrderId}
                    canRefund={payment.canRefund}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {order.payments.some((payment) => payment.provider === "bog" && payment.providerOrderId) ? (
          <div className="mt-4">
            <PaymentRefreshForm orderId={order.id} />
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={adminCardClass}>
          <h2 className="mb-3 text-base font-semibold text-text">მყიდველი</h2>
          <dl className="grid gap-2 text-small">
            <div>
              <dt className="text-label text-text-faint">სახელი</dt>
              <dd>
                {order.customerFirstName} {order.customerLastName} {order.isGuest ? "(სტუმარი)" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-label text-text-faint">ელ. ფოსტა</dt>
              <dd className="break-all">{order.customerEmail}</dd>
            </div>
            <div>
              <dt className="text-label text-text-faint">ტელეფონი</dt>
              <dd>{order.customerPhone}</dd>
            </div>
          </dl>
        </section>
        <section className={adminCardClass}>
          <h2 className="mb-3 text-base font-semibold text-text">მიწოდება და გადახდა</h2>
          <dl className="grid gap-2 text-small">
            <div>
              <dt className="text-label text-text-faint">მიწოდება</dt>
              <dd>{DELIVERY_METHOD_LABEL[order.deliveryMethod]}</dd>
            </div>
            <div>
              <dt className="text-label text-text-faint">მისამართი</dt>
              <dd>{address}</dd>
            </div>
            {order.additionalInfo ? (
              <div>
                <dt className="text-label text-text-faint">შენიშვნა</dt>
                <dd>{order.additionalInfo}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-label text-text-faint">გადახდა</dt>
              <dd>
                {PAYMENT_METHOD_LABEL[order.paymentMethod]} · {PAYMENT_STATUS_LABEL[order.paymentStatus]}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <AdminEmailHistory emails={order.emails} />

      <section className={adminCardClass}>
        <h2 className="mb-3 text-base font-semibold text-text">პროდუქტები (snapshot)</h2>
        <ul className="divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <ProductImage visual={asVisual(item.visual)} tone={(item.tone as 1 | 2 | 3 | 4 | 5) || 1} className="size-14 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text">{item.productName}</p>
                <p className="text-label text-text-faint">SKU {item.sku}</p>
                {item.variants.length ? (
                  <p className="text-label text-text-faint">
                    {item.variants.map((variant) => `${variant.attribute}: ${variant.option}`).join(" · ")}
                  </p>
                ) : null}
              </div>
              <div className="tnum text-right text-small">
                <p>
                  {item.quantity} × {formatPrice(item.unitPrice)}
                </p>
                <p className="font-semibold">{formatPrice(item.lineTotal)}</p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid gap-1 border-t border-border pt-4 text-small">
          <div className="flex justify-between">
            <dt>ქვეჯამი</dt>
            <dd className="tnum">{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>ფასდაკლება {order.promoCode ? `(${order.promoCode})` : ""}</dt>
            <dd className="tnum">{formatPrice(order.discount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>მიწოდება</dt>
            <dd className="tnum">{formatPrice(order.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>სულ</dt>
            <dd className="tnum">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
