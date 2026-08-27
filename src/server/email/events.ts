export type EmailEventType =
  | "password_reset"
  | "order_confirmation"
  | "payment_paid"
  | "refund_partial"
  | "refund_full"
  | "order_status";

export type PaymentEmailPlan = "payment_paid" | "refund_partial" | "refund_full";

const STATUS_EMAILS = new Set(["processing", "shipped", "delivered", "cancelled"]);

export function orderConfirmationEventKey(orderId: string): string {
  return `order-confirmation:${orderId}`;
}

export function paymentPaidEventKey(paymentId: string): string {
  return `payment-paid:${paymentId}`;
}

export function refundEventKey(paymentId: string, kind: "partial" | "full"): string {
  return kind === "full" ? `refund-completed:${paymentId}:refunded` : `refund-completed:${paymentId}:partially_refunded`;
}

export function orderStatusEventKey(orderId: string, status: string): string {
  return `order-status:${orderId}:${status}`;
}

export function passwordResetEventKey(tokenId: string): string {
  return `password-reset:${tokenId}`;
}

/** First transition into PAID only — duplicate callbacks must not resend. */
export function planPaymentPaidEmail(previousStatus: string, nextStatus: string): boolean {
  return nextStatus === "paid" && previousStatus !== "paid";
}

export function planRefundEmail(previousStatus: string, nextStatus: string): "partial" | "full" | null {
  if (nextStatus === "refunded" && previousStatus !== "refunded") return "full";
  if (
    nextStatus === "partially_refunded" &&
    previousStatus !== "partially_refunded" &&
    previousStatus !== "refunded"
  ) {
    return "partial";
  }
  return null;
}

export function planPaymentEmails(previousStatus: string, nextStatus: string): PaymentEmailPlan | null {
  if (planPaymentPaidEmail(previousStatus, nextStatus)) return "payment_paid";
  const refund = planRefundEmail(previousStatus, nextStatus);
  if (refund === "partial") return "refund_partial";
  if (refund === "full") return "refund_full";
  return null;
}

export function shouldSendOrderStatusEmail(previousStatus: string, nextStatus: string): boolean {
  return previousStatus !== nextStatus && STATUS_EMAILS.has(nextStatus);
}

export function recipientDomain(email: string): string | null {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return email.slice(at + 1);
}

export function isSendableEmail(value: string | null | undefined): value is string {
  if (!value) return false;
  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Historical order snapshot email — not the live customer profile. */
export function orderEmailRecipient(order: { customerEmail: string | null | undefined }): string | null {
  if (!isSendableEmail(order.customerEmail)) return null;
  return order.customerEmail.trim();
}

/** Same public result whether a customer/token existed. */
export function acceptedPasswordResetRequest(): { ok: true } {
  return { ok: true };
}
