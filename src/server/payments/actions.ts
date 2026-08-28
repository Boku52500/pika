"use server";

import { headers } from "next/headers";
import { prisma } from "@/server/db";
import { getSessionCustomer } from "@/server/auth/session";
import { requireAdminAction } from "@/server/auth/admin";
import { clientIpFromHeaders, consumeRateLimit } from "@/server/auth/rateLimit";
import { logError } from "@/server/log";
import { GENERIC_SERVER_ERROR, type ActionResult } from "@/server/actions/result";
import { revalidateOrders } from "@/server/admin/revalidate";
import { bogConfigured, BOG_NOT_CONFIGURED_MESSAGE } from "@/server/payments/bog/config";
import { acceptBogApplePayPayment, getBogPaymentDetails } from "@/server/payments/bog/client";
import { PaymentUserError, startBogPaymentForOrder } from "@/server/payments/initiate";
import { customerCanAccessOrder } from "@/server/payments/access";
import { reconcileBogPaymentDetails } from "@/server/payments/reconcile";
import { parseAdminRefundInput } from "@/server/payments/refundable";
import { requestAdminBogRefund } from "@/server/payments/refund";
import { captureAuthorizedPayment, rejectAuthorizedPayment } from "@/server/payments/bog/preauth";
import { recordProviderAction } from "@/server/payments/audit";
import { getBogMerchantCapabilities } from "@/server/payments/bog/capabilities";
import { isPaidAttemptStatus } from "@/server/payments/bog/status";
import { hasInFlightProviderAction } from "@/server/payments/bog/policy";
import { bogCustomerSuccessUrl } from "@/server/payments/urls";
import { randomUUID } from "node:crypto";

export async function retryOrderPayment(
  input: unknown,
): Promise<ActionResult<{ orderNumber: string; redirectUrl: string }>> {
  const orderNumber = typeof input === "object" && input && "orderNumber" in input
    ? String((input as { orderNumber: unknown }).orderNumber ?? "").trim()
    : "";
  if (!orderNumber) return { ok: false, message: "შეკვეთა ვერ მოიძებნა" };

  const ip = clientIpFromHeaders(await headers());
  if (!(await consumeRateLimit(`payment-retry:ip:${ip}`, 10, 15 * 60 * 1000))) {
    return { ok: false, message: "ძალიან ბევრი მცდელობაა. სცადეთ მოგვიანებით." };
  }
  if (!bogConfigured()) return { ok: false, message: BOG_NOT_CONFIGURED_MESSAGE };

  const session = await getSessionCustomer();
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, orderNumber: true, customerId: true, paymentMethod: true },
  });
  if (!order) return { ok: false, message: "შეკვეთა ვერ მოიძებნა" };
  if (!(await customerCanAccessOrder(order, session?.id ?? null))) {
    return { ok: false, message: "შეკვეთა ვერ მოიძებნა" };
  }

  try {
    const started = await startBogPaymentForOrder(order.id, { method: order.paymentMethod });
    const redirectUrl =
      started.redirectUrl ??
      (started.awaitingProvider || started.applePay ? bogCustomerSuccessUrl(order.orderNumber) : null);
    if (!redirectUrl) {
      return { ok: false, message: GENERIC_SERVER_ERROR, orderNumber: order.orderNumber };
    }
    return { ok: true, data: { orderNumber: order.orderNumber, redirectUrl } };
  } catch (error) {
    if (error instanceof PaymentUserError) {
      return { ok: false, message: error.message, orderNumber: order.orderNumber };
    }
    logError("payment.retry_failed", { error, orderNumber: order.orderNumber });
    return { ok: false, message: GENERIC_SERVER_ERROR, orderNumber: order.orderNumber };
  }
}

export async function refreshAdminOrderPayment(input: unknown): Promise<ActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;

  const orderId = typeof input === "object" && input && "orderId" in input
    ? String((input as { orderId: unknown }).orderId ?? "").trim()
    : "";
  if (!orderId) return { ok: false, message: "შეკვეთა ვერ მოიძებნა" };
  if (!bogConfigured()) return { ok: false, message: BOG_NOT_CONFIGURED_MESSAGE };

  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
    include: { payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) return { ok: false, message: "შეკვეთა ვერ მოიძებნა" };

  const withProvider = order.payments.find((row) => row.providerOrderId);
  if (!withProvider?.providerOrderId) {
    return { ok: false, message: "ამ შეკვეთაზე BOG გადახდა ჯერ არ შექმნილა" };
  }

  try {
    const details = await getBogPaymentDetails(withProvider.providerOrderId);
    const result = await reconcileBogPaymentDetails(details);
    if (result?.skippedReason) {
      return { ok: false, message: "პროვაიდერის მონაცემები შეკვეთას არ ემთხვევა" };
    }
    revalidateOrders();
    return { ok: true };
  } catch (error) {
    logError("payment.admin_refresh_failed", { error, orderNumber: order.orderNumber });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}

export async function refundAdminOrderPayment(input: unknown): Promise<ActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;

  const parsed = parseAdminRefundInput(input);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  return requestAdminBogRefund({
    paymentId: parsed.paymentId,
    kind: parsed.kind,
    amountRaw: parsed.amountRaw,
    adminNote: parsed.adminNote,
    adminId: gate.admin.id,
  });
}

export async function captureAdminPreauthorization(input: unknown): Promise<ActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;
  const record = input && typeof input === "object" ? (input as { paymentId?: unknown; amount?: unknown; description?: unknown }) : {};
  const paymentId = typeof record.paymentId === "string" ? record.paymentId.trim() : "";
  if (!paymentId) return { ok: false, message: "გადახდა ვერ მოიძებნა" };
  return captureAuthorizedPayment({
    paymentId,
    amountRaw: typeof record.amount === "string" ? record.amount : undefined,
    description: typeof record.description === "string" ? record.description : undefined,
    adminId: gate.admin.id,
  });
}

export async function rejectAdminPreauthorization(input: unknown): Promise<ActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;
  const record = input && typeof input === "object" ? (input as { paymentId?: unknown; description?: unknown }) : {};
  const paymentId = typeof record.paymentId === "string" ? record.paymentId.trim() : "";
  if (!paymentId) return { ok: false, message: "გადახდა ვერ მოიძებნა" };
  return rejectAuthorizedPayment({
    paymentId,
    description: typeof record.description === "string" ? record.description : undefined,
    adminId: gate.admin.id,
  });
}

export async function acceptApplePayPayment(input: unknown): Promise<ActionResult> {
  const session = await getSessionCustomer();
  const record = input && typeof input === "object" ? (input as { providerOrderId?: unknown; applePayToken?: unknown }) : {};
  const providerOrderId = typeof record.providerOrderId === "string" ? record.providerOrderId.trim() : "";
  const applePayToken = typeof record.applePayToken === "string" ? record.applePayToken : "";
  if (!providerOrderId || !applePayToken) return { ok: false, message: "Apple Pay ვერ დასრულდა." };
  const caps = getBogMerchantCapabilities();
  if (!caps.externalApplePay) return { ok: false, message: "Apple Pay ამჟამად მიუწვდომელია." };

  const payment = await prisma.payment.findFirst({
    where: { provider: "bog", providerOrderId },
    include: {
      order: { select: { id: true, orderNumber: true, customerId: true } },
      providerActions: { where: { type: "apple_pay_accept" } },
    },
  });
  if (!payment) return { ok: false, message: "გადახდა ვერ მოიძებნა" };
  if (!(await customerCanAccessOrder(payment.order, session?.id ?? null))) {
    return { ok: false, message: "გადახდა ვერ მოიძებნა" };
  }
  if (isPaidAttemptStatus(payment.status) || payment.status === "authorized") {
    return { ok: true };
  }
  if (hasInFlightProviderAction(payment.providerActions, ["apple_pay_accept"])) {
    const details = await getBogPaymentDetails(providerOrderId);
    await reconcileBogPaymentDetails(details);
    return { ok: true };
  }

  const ip = clientIpFromHeaders(await headers());
  if (!(await consumeRateLimit(`apple-pay:ip:${ip}`, 10, 15 * 60 * 1000))) {
    return { ok: false, message: "ძალიან ბევრი მცდელობაა. სცადეთ მოგვიანებით." };
  }

  const idempotencyKey = randomUUID();
  try {
    await recordProviderAction({
      type: "apple_pay_accept",
      status: "requested",
      paymentId: payment.id,
      orderId: payment.orderId,
      idempotencyKey,
    });
    await acceptBogApplePayPayment({
      providerOrderId,
      idempotencyKey,
      applePayToken,
    });
    const details = await getBogPaymentDetails(providerOrderId);
    await reconcileBogPaymentDetails(details);
    return { ok: true };
  } catch (error) {
    logError("bog.apple_pay_accept_failed", { error, paymentId: payment.id });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}
