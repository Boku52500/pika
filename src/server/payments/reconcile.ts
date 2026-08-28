import "server-only";

import type { PaymentAttemptStatus, PaymentStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logError, logInfo, logWarn } from "@/server/log";
import { matchBogDetailsToLocal } from "@/server/payments/bog/match";
import type { BogPaymentDetails } from "@/server/payments/bog/schemas";
import {
  deriveOrderPaymentStatus,
  mapBogStatusToAttempt,
  shouldApplyAttemptStatus,
} from "@/server/payments/bog/status";
import { planRefundRowUpdates, providerRefundAmountFromDetails } from "@/server/payments/refundReconcile";
import { parseBogAmount } from "@/server/payments/bog/payload";
import { scheduleEmail } from "@/server/email/schedule";
import { notifyPaymentPaid, notifyRefund } from "@/server/email/notify";
import { planPaymentEmails } from "@/server/email/events";
import { syncCommerceAfterPaymentReconciliation } from "@/server/commerce/sync";
import { persistSavedCardFromDetails } from "@/server/payments/bog/savedCard";

export type ReconcileResult = {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  status: PaymentAttemptStatus;
  orderPaymentStatus: PaymentStatus;
  providerStatus: string;
  applied: boolean;
  skippedReason?: string;
};

export async function reconcileBogPaymentDetails(details: BogPaymentDetails): Promise<ReconcileResult | null> {
  const payment =
    (await prisma.payment.findFirst({
      where: { provider: "bog", providerOrderId: details.order_id },
      include: {
        order: { select: { id: true, orderNumber: true, paymentStatus: true, customerId: true } },
        refunds: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    })) ??
    (details.external_order_id
      ? await prisma.payment.findFirst({
          where: {
            provider: "bog",
            status: { in: ["pending", "processing"] },
            order: { orderNumber: details.external_order_id },
          },
          include: {
            order: { select: { id: true, orderNumber: true, paymentStatus: true, customerId: true } },
            refunds: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "desc" },
        })
      : null);

  if (!payment) {
    logWarn("bog.payment_reconciled", {
      reason: "payment_not_found",
      providerOrderId: details.order_id,
      externalOrderId: details.external_order_id,
    });
    return null;
  }

  const match = matchBogDetailsToLocal(details, {
    providerOrderId: payment.providerOrderId,
    amount: payment.amount,
    currency: payment.currency,
    orderNumber: payment.order.orderNumber,
  });
  if (!match.ok) {
    logError("bog.payment_reconciled", {
      reason: match.reason,
      paymentId: payment.id,
      orderNumber: payment.order.orderNumber,
      providerOrderId: details.order_id,
    });
    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
      status: payment.status,
      orderPaymentStatus: payment.order.paymentStatus,
      providerStatus: details.order_status.key,
      applied: false,
      skippedReason: match.reason,
    };
  }

  const previousStatus = payment.status;
  let incomingStatus = mapBogStatusToAttempt(details.order_status.key);
  if (payment.status === "authorized" && incomingStatus === "failed") {
    incomingStatus = "voided";
  }
  const applyStatus = shouldApplyAttemptStatus(payment.status, incomingStatus);
  const nextStatus = applyStatus ? incomingStatus : payment.status;
  const terminal =
    nextStatus === "paid" ||
    nextStatus === "failed" ||
    nextStatus === "voided" ||
    nextStatus === "refunded" ||
    nextStatus === "partially_refunded";
  const providerRefundAmount = providerRefundAmountFromDetails(details.purchase_units?.refund_amount);
  const refundUpdates = planRefundRowUpdates({
    refunds: payment.refunds,
    providerStatus: details.order_status.key,
    providerRefundAmount,
    actions: details.actions,
  });
  const authorizedAmount = details.order_status.key === "blocked" ? parseBogAmount(details.purchase_units?.request_amount) : undefined;
  const capturedAmount =
    nextStatus === "paid" ? parseBogAmount(details.purchase_units?.transfer_amount) : undefined;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: nextStatus,
        providerStatus: details.order_status.key,
        providerOrderId: payment.providerOrderId ?? details.order_id,
        providerRefundAmount: providerRefundAmount ?? undefined,
        method: details.payment_detail?.transfer_method?.key ?? payment.method,
        transactionId: details.payment_detail?.transaction_id ?? undefined,
        authCode: details.payment_detail?.auth_code ?? undefined,
        responseCode: details.payment_detail?.code ?? undefined,
        responseDescription: details.payment_detail?.code_description ?? undefined,
        rejectReason: details.reject_reason ?? undefined,
        captureMode: details.capture === "manual" || details.capture === "automatic" ? details.capture : undefined,
        paymentOption: details.payment_detail?.payment_option ?? undefined,
        savedCardType: details.payment_detail?.saved_card_type ?? undefined,
        parentProviderOrderId: details.payment_detail?.parent_order_id ?? undefined,
        payerIdentifier: details.payment_detail?.payer_identifier ?? undefined,
        cardExpiryDate: details.payment_detail?.card_expiry_date ?? undefined,
        splitStatus: details.split?.split_status ?? undefined,
        authorizedAmount: authorizedAmount ?? undefined,
        capturedAmount: capturedAmount ?? undefined,
        completedAt: terminal ? (payment.completedAt ?? new Date()) : undefined,
      },
    });

    for (const update of refundUpdates) {
      await tx.paymentRefund.update({
        where: { id: update.id },
        data: {
          status: update.status,
          providerStatus: update.providerStatus,
          completedAt: update.completedAt ?? undefined,
        },
      });
    }

    const attempts = await tx.payment.findMany({
      where: { orderId: payment.orderId },
      orderBy: { createdAt: "asc" },
      select: { status: true },
    });
    const orderPaymentStatus = deriveOrderPaymentStatus(attempts);
    await tx.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: orderPaymentStatus },
    });
  });

  const attempts = await prisma.payment.findMany({
    where: { orderId: payment.orderId },
    orderBy: { createdAt: "asc" },
    select: { status: true },
  });
  const orderPaymentStatus = deriveOrderPaymentStatus(attempts);

  logInfo("bog.payment_reconciled", {
    paymentId: payment.id,
    orderNumber: payment.order.orderNumber,
    providerOrderId: details.order_id,
    providerStatus: details.order_status.key,
    status: nextStatus,
    applied: applyStatus,
  });

  if (refundUpdates.length > 0) {
    logInfo("bog.refund_reconciled", {
      paymentId: payment.id,
      orderNumber: payment.order.orderNumber,
      providerOrderId: details.order_id,
      providerStatus: details.order_status.key,
      refundIds: refundUpdates.map((row) => row.id),
      actionIds: details.actions
        ?.filter((action) => action.action === "refund" || action.action === "partial_refund")
        .map((action) => action.action_id),
    });
  }

  const plan = planPaymentEmails(previousStatus, nextStatus);
  if (plan === "payment_paid") {
    scheduleEmail(() => notifyPaymentPaid(payment.id));
  } else if (plan === "refund_partial") {
    scheduleEmail(() => notifyRefund(payment.id, "partial"));
  } else if (plan === "refund_full") {
    scheduleEmail(() => notifyRefund(payment.id, "full"));
  }

  if (nextStatus === "paid" || nextStatus === "authorized") {
    const savedRef = details.payment_detail?.saved_card_type
      ? details.payment_detail.parent_order_id ?? details.order_id
      : undefined;
    await persistSavedCardFromDetails({
      customerId: payment.order.customerId,
      paymentId: payment.id,
      parentOrderId: savedRef,
      savedCardType: details.payment_detail?.saved_card_type,
      maskedPan: details.payment_detail?.payer_identifier,
      cardType: details.payment_detail?.card_type,
      cardExpiry: details.payment_detail?.card_expiry_date,
    });
  }

  await syncCommerceAfterPaymentReconciliation(payment.orderId);

  return {
    paymentId: payment.id,
    orderId: payment.orderId,
    orderNumber: payment.order.orderNumber,
    status: nextStatus,
    orderPaymentStatus,
    providerStatus: details.order_status.key,
    applied: applyStatus,
  };
}
