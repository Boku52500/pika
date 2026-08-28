import { Prisma, type PaymentAttemptStatus } from "@/generated/prisma/client";
import { amountLessOrEqual, amountsMatch, parseBogAmount } from "@/server/payments/bog/payload";
import { mapBogStatusToAttempt } from "@/server/payments/bog/status";
import type { BogPaymentDetails } from "@/server/payments/bog/schemas";
import { moneyToTetri } from "@/server/money";

export type LocalPaymentMatch = {
  providerOrderId: string | null;
  amount: Prisma.Decimal | string | number;
  currency: string;
  orderNumber: string;
};

export function matchBogDetailsToLocal(
  details: BogPaymentDetails,
  payment: LocalPaymentMatch,
): { ok: true } | { ok: false; reason: string } {
  if (payment.providerOrderId && payment.providerOrderId !== details.order_id) {
    return { ok: false, reason: "provider_order_mismatch" };
  }
  if (details.external_order_id && details.external_order_id !== payment.orderNumber) {
    return { ok: false, reason: "external_order_mismatch" };
  }
  const currency = details.purchase_units?.currency_code;
  if (currency && currency.toUpperCase() !== payment.currency.toUpperCase()) {
    return { ok: false, reason: "currency_mismatch" };
  }
  const requested = parseBogAmount(details.purchase_units?.request_amount);
  const transferred = parseBogAmount(details.purchase_units?.transfer_amount);
  const incomingStatus = mapBogStatusToAttempt(details.order_status.key);
  if (requested && !amountsMatch(payment.amount, requested)) {
    return { ok: false, reason: "amount_mismatch" };
  }
  if (incomingStatus === "paid" && transferred) {
    if (moneyToTetri(transferred) <= 0) {
      return { ok: false, reason: "transfer_amount_mismatch" };
    }
    if (!amountLessOrEqual(transferred, payment.amount)) {
      return { ok: false, reason: "transfer_amount_mismatch" };
    }
    if (details.order_status.key !== "partial_completed" && !amountsMatch(payment.amount, transferred)) {
      return { ok: false, reason: "transfer_amount_mismatch" };
    }
  }
  return { ok: true };
}

export function incomingAttemptStatus(details: BogPaymentDetails): PaymentAttemptStatus {
  return mapBogStatusToAttempt(details.order_status.key);
}
