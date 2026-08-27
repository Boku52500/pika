import "server-only";

import { getAppOriginString, passwordResetUrl } from "@/lib/appUrl";
import { prisma } from "@/server/db";
import { logWarn } from "@/server/log";
import { moneyToNumber, tetriToNumber } from "@/server/money";
import { confirmedRefundedTetri } from "@/server/payments/refundable";
import { deliverEmail } from "@/server/email/deliver";
import {
  orderEmailRecipient,
  orderConfirmationEventKey,
  orderStatusEventKey,
  passwordResetEventKey,
  paymentPaidEventKey,
  refundEventKey,
} from "@/server/email/events";
import {
  renderOrderConfirmationEmail,
  renderOrderStatusEmail,
  renderPaymentPaidEmail,
  renderPasswordResetEmail,
  renderRefundEmail,
  type OrderEmailSnapshot,
} from "@/server/email/templates";

function orderCta(order: { orderNumber: string; customerId: string | null; paymentMethod: string }): {
  href: string;
  label: string;
} {
  const origin = getAppOriginString();
  if (order.customerId) {
    return {
      href: `${origin}/account/orders/${encodeURIComponent(order.orderNumber)}`,
      label: "შეკვეთის ნახვა",
    };
  }
  if (order.paymentMethod === "card") {
    return {
      href: `${origin}/checkout/payment/success?order=${encodeURIComponent(order.orderNumber)}`,
      label: "შეკვეთის ნახვა",
    };
  }
  return { href: `${origin}/checkout/success`, label: "შეკვეთის ნახვა" };
}

async function loadOrderSnapshot(orderId: string): Promise<
  | (OrderEmailSnapshot & {
      id: string;
      customerId: string | null;
      customerEmail: string;
    })
  | null
> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!order) return null;
  return {
    id: order.id,
    customerId: order.customerId,
    orderNumber: order.orderNumber,
    firstName: order.customerFirstName,
    customerEmail: order.customerEmail,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    deliveryMethod: order.deliveryMethod,
    city: order.city,
    street: order.street,
    building: order.building,
    apartment: order.apartment,
    entrance: order.entrance,
    floor: order.floor,
    additionalInfo: order.additionalInfo,
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: moneyToNumber(item.unitPrice),
      lineTotal: moneyToNumber(item.lineTotal),
    })),
    subtotal: moneyToNumber(order.subtotal),
    discount: moneyToNumber(order.discount),
    deliveryFee: moneyToNumber(order.deliveryFee),
    total: moneyToNumber(order.total),
    promoCode: order.promoCode,
  };
}

export async function notifyPasswordReset(input: {
  tokenId: string;
  recipient: string;
  rawToken: string;
  customerId: string;
}): Promise<void> {
  if (!orderEmailRecipient({ customerEmail: input.recipient })) {
    logWarn("email.skipped", { type: "password_reset", reason: "invalid_recipient" });
    return;
  }
  const rendered = renderPasswordResetEmail({ resetUrl: passwordResetUrl(input.rawToken) });
  await deliverEmail({
    eventKey: passwordResetEventKey(input.tokenId),
    type: "password_reset",
    recipient: input.recipient,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    customerId: input.customerId,
  });
}

export async function notifyOrderConfirmation(orderId: string): Promise<void> {
  const order = await loadOrderSnapshot(orderId);
  const recipient = order ? orderEmailRecipient(order) : null;
  if (!order || !recipient) {
    logWarn("email.skipped", { type: "order_confirmation", orderId, reason: "missing_recipient" });
    return;
  }
  const rendered = renderOrderConfirmationEmail(order, orderCta(order));
  await deliverEmail({
    eventKey: orderConfirmationEventKey(order.id),
    type: "order_confirmation",
    recipient,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    orderId: order.id,
    customerId: order.customerId,
  });
}

export async function notifyPaymentPaid(paymentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: { include: { items: true } } },
  });
  if (!payment || !orderEmailRecipient(payment.order)) {
    logWarn("email.skipped", { type: "payment_paid", paymentId, reason: "missing_recipient" });
    return;
  }
  const snapshot = await loadOrderSnapshot(payment.orderId);
  if (!snapshot) return;
  const rendered = renderPaymentPaidEmail(
    snapshot,
    { amount: moneyToNumber(payment.amount), paidAt: payment.completedAt ?? new Date() },
    orderCta(snapshot),
  );
  await deliverEmail({
    eventKey: paymentPaidEventKey(payment.id),
    type: "payment_paid",
    recipient: snapshot.customerEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    orderId: snapshot.id,
    paymentId: payment.id,
    customerId: snapshot.customerId,
  });
}

export async function notifyRefund(paymentId: string, kind: "partial" | "full"): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { refunds: true, order: true },
  });
  if (!payment || !orderEmailRecipient(payment.order)) {
    logWarn("email.skipped", { type: kind === "full" ? "refund_full" : "refund_partial", paymentId, reason: "missing_recipient" });
    return;
  }
  const snapshot = await loadOrderSnapshot(payment.orderId);
  if (!snapshot) return;
  const cumulative = tetriToNumber(
    confirmedRefundedTetri({
      refunds: payment.refunds,
      providerRefundAmount: payment.providerRefundAmount,
    }),
  );
  const latestCompleted = [...payment.refunds]
    .filter((row) => row.status === "completed")
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))[0];
  const refundedAmount = latestCompleted ? moneyToNumber(latestCompleted.amount) : cumulative;
  const rendered = renderRefundEmail(
    { ...snapshot, paymentStatus: payment.status },
    { kind, refundedAmount, cumulativeAmount: cumulative },
    orderCta(snapshot),
  );
  await deliverEmail({
    eventKey: refundEventKey(payment.id, kind),
    type: kind === "full" ? "refund_full" : "refund_partial",
    recipient: snapshot.customerEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    orderId: snapshot.id,
    paymentId: payment.id,
    refundId: latestCompleted?.id,
    customerId: snapshot.customerId,
  });
}

export async function notifyOrderStatus(orderId: string, status: string): Promise<void> {
  const order = await loadOrderSnapshot(orderId);
  const recipient = order ? orderEmailRecipient(order) : null;
  if (!order || !recipient) {
    logWarn("email.skipped", { type: "order_status", orderId, reason: "missing_recipient" });
    return;
  }
  const rendered = renderOrderStatusEmail(order, status, orderCta(order));
  await deliverEmail({
    eventKey: orderStatusEventKey(order.id, status),
    type: "order_status",
    recipient,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    orderId: order.id,
    customerId: order.customerId,
  });
}
