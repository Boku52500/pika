import "server-only";

import { prisma } from "@/server/db";
import { getOrderForConfirmation, mapOrderToStorefront } from "@/server/account/orders";
import { bogConfigured } from "@/server/payments/bog/config";
import { getBogPaymentDetails } from "@/server/payments/bog/client";
import { isPaidAttemptStatus, isRetryableAttemptStatus } from "@/server/payments/bog/status";
import { reconcileBogPaymentDetails } from "@/server/payments/reconcile";
import { logWarn } from "@/server/log";
import type { PaymentPageData, StorefrontPaymentAttempt } from "@/lib/paymentView";

function mapAttempt(row: {
  id: string;
  provider: string;
  providerOrderId: string | null;
  status: StorefrontPaymentAttempt["status"];
  providerStatus: string | null;
  method: string | null;
  transactionId: string | null;
  authCode: string | null;
  responseCode: string | null;
  responseDescription: string | null;
  createdAt: Date;
  completedAt: Date | null;
}): StorefrontPaymentAttempt {
  return {
    id: row.id,
    provider: row.provider,
    providerOrderId: row.providerOrderId,
    status: row.status,
    providerStatus: row.providerStatus,
    method: row.method,
    transactionId: row.transactionId,
    authCode: row.authCode,
    responseCode: row.responseCode,
    responseDescription: row.responseDescription,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

async function maybeReconcileLatest(orderId: string): Promise<void> {
  if (!bogConfigured()) return;
  const latest = await prisma.payment.findFirst({
    where: { orderId, providerOrderId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!latest?.providerOrderId) return;
  if (latest.status === "paid" || latest.status === "refunded" || latest.status === "partially_refunded") return;
  try {
    const details = await getBogPaymentDetails(latest.providerOrderId);
    await reconcileBogPaymentDetails(details);
  } catch (error) {
    logWarn("bog.payment_details_failed", { error, paymentId: latest.id });
  }
}

export async function getPaymentPageData(
  orderNumber: string | null | undefined,
  customerId: string | null,
  options?: { reconcile?: boolean },
): Promise<PaymentPageData | null> {
  if (!orderNumber) return null;
  const confirmation = await getOrderForConfirmation(orderNumber, customerId);
  if (!confirmation) return null;

  const row = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, payments: { orderBy: { createdAt: "asc" } } },
  });
  if (!row) return null;

  if (options?.reconcile !== false && row.paymentMethod === "card") {
    await maybeReconcileLatest(row.id);
  }

  const refreshed = await prisma.order.findUnique({
    where: { id: row.id },
    include: { items: true, payments: { orderBy: { createdAt: "asc" } } },
  });
  if (!refreshed) return null;

  const attempts = refreshed.payments.map(mapAttempt);
  const latest = attempts[attempts.length - 1] ?? null;
  const paid = attempts.some((attempt) => isPaidAttemptStatus(attempt.status));
  const canRetry =
    refreshed.paymentMethod === "card" &&
    !paid &&
    (latest ? isRetryableAttemptStatus(latest.status) : true);

  return {
    order: mapOrderToStorefront(refreshed),
    attempts,
    latestStatus: latest?.status ?? null,
    canRetry,
  };
}
