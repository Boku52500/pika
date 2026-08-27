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
        order: { select: { id: true, orderNumber: true, paymentStatus: true } },
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
            order: { select: { id: true, orderNumber: true, paymentStatus: true } },
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

  const incomingStatus = mapBogStatusToAttempt(details.order_status.key);
  const applyStatus = shouldApplyAttemptStatus(payment.status, incomingStatus);
  const nextStatus = applyStatus ? incomingStatus : payment.status;
  const terminal = nextStatus === "paid" || nextStatus === "failed" || nextStatus === "refunded" || nextStatus === "partially_refunded";
  const providerRefundAmount = providerRefundAmountFromDetails(details.purchase_units?.refund_amount);
  const refundUpdates = planRefundRowUpdates({
    refunds: payment.refunds,
    providerStatus: details.order_status.key,
    providerRefundAmount,
    actions: details.actions,
  });

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
