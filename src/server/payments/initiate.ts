import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logError, logInfo } from "@/server/log";
import { bogConfigured, BOG_NOT_CONFIGURED_MESSAGE } from "@/server/payments/bog/config";
import { createBogEcommerceOrder } from "@/server/payments/bog/client";
import { BogNotConfiguredError } from "@/server/payments/bog/errors";
import { buildBogCreateOrderBody } from "@/server/payments/bog/payload";
import { isPaidAttemptStatus } from "@/server/payments/bog/status";
import { bogCallbackUrl, bogCustomerFailUrl, bogCustomerSuccessUrl } from "@/server/payments/urls";
import { applyInventoryEvent, InventoryUserError } from "@/server/commerce/inventory";
import { releaseUnpaidCardCommerce } from "@/server/commerce/sync";

const GENERIC_PAYMENT_ERROR = "გადახდის დაწყება ვერ მოხერხდა. სცადეთ ხელახლა.";

export class PaymentUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentUserError";
  }
}

type OrderWithItems = {
  id: string;
  orderNumber: string;
  paymentMethod: string;
  paymentStatus: string;
  customerFirstName: string;
  customerLastName: string;
  total: Prisma.Decimal;
  discount: Prisma.Decimal;
  deliveryFee: Prisma.Decimal;
  items: Array<{
    productId: string | null;
    sku: string;
    productName: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
  }>;
};

export async function createPendingCardPayment(
  tx: Prisma.TransactionClient,
  order: { id: string; total: Prisma.Decimal },
) {
  return tx.payment.create({
    data: {
      orderId: order.id,
      provider: "bog",
      idempotencyKey: randomUUID(),
      status: "pending",
      amount: order.total,
      currency: "GEL",
      method: "card",
    },
  });
}

function latestUsableRedirect(payments: Array<{
  status: string;
  providerOrderId: string | null;
  redirectUrl: string | null;
  idempotencyKey: string;
  id: string;
}>) {
  const latest = payments[0];
  if (!latest) return null;
  if (isPaidAttemptStatus(latest.status as never)) return { kind: "paid" as const };
  if (latest.status === "pending" && latest.providerOrderId && latest.redirectUrl) {
    return { kind: "reuse" as const, redirectUrl: latest.redirectUrl, paymentId: latest.id };
  }
  if (latest.status === "pending" && !latest.providerOrderId) {
    return { kind: "retry-same" as const, paymentId: latest.id, idempotencyKey: latest.idempotencyKey };
  }
  return { kind: "new" as const };
}

export async function startBogPaymentForOrder(orderId: string): Promise<{ redirectUrl: string }> {
  if (!bogConfigured()) {
    throw new PaymentUserError(BOG_NOT_CONFIGURED_MESSAGE);
  }

  type Prepared =
    | { kind: "reuse"; redirectUrl: string }
    | { kind: "start"; paymentId: string; order: OrderWithItems };

  const prepared: Prepared = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new PaymentUserError("შეკვეთა ვერ მოიძებნა");
    if (order.paymentMethod !== "card") {
      throw new PaymentUserError("ეს შეკვეთა ბარათით გადასახდელი არ არის");
    }

    const payments = await tx.payment.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
    });
    if (payments.some((row) => isPaidAttemptStatus(row.status))) {
      throw new PaymentUserError("ეს შეკვეთა უკვე გადახდილია");
    }

    const plan = latestUsableRedirect(payments);
    if (plan?.kind === "paid") {
      throw new PaymentUserError("ეს შეკვეთა უკვე გადახდილია");
    }
    if (plan?.kind === "reuse") {
      return { kind: "reuse" as const, redirectUrl: plan.redirectUrl };
    }

    if (order.inventoryState === "released") {
      try {
        await applyInventoryEvent(tx, order.id, "retry_payment");
      } catch (error) {
        if (error instanceof InventoryUserError) {
          throw new PaymentUserError(error.message);
        }
        throw error;
      }
    }

    let paymentId = plan?.kind === "retry-same" ? plan.paymentId : null;
    const idempotencyKey = plan?.kind === "retry-same" ? plan.idempotencyKey : randomUUID();

    if (!paymentId) {
      const created = await tx.payment.create({
        data: {
          orderId: order.id,
          provider: "bog",
          idempotencyKey,
          status: "pending",
          amount: order.total,
          currency: "GEL",
          method: "card",
        },
      });
      paymentId = created.id;
    }

    return { kind: "start" as const, paymentId, order };
  });

  if (prepared.kind === "reuse") {
    return { redirectUrl: prepared.redirectUrl };
  }

  const order = prepared.order;
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: prepared.paymentId } });

  const body = buildBogCreateOrderBody({
    callbackUrl: bogCallbackUrl(),
    externalOrderId: order.orderNumber,
    successUrl: bogCustomerSuccessUrl(order.orderNumber),
    failUrl: bogCustomerFailUrl(order.orderNumber),
    currency: "GEL",
    total: order.total,
    discount: order.discount,
    deliveryFee: order.deliveryFee,
    items: order.items.map((item) => ({
      productId: item.productId || item.sku,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    buyerName: `${order.customerFirstName} ${order.customerLastName}`.trim(),
  });

  try {
    const created = await createBogEcommerceOrder({
      body,
      idempotencyKey: payment.idempotencyKey,
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerOrderId: created.id,
        redirectUrl: created._links.redirect.href,
        lastError: null,
      },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "pending" },
    });
    logInfo("bog.order_created", {
      orderNumber: order.orderNumber,
      providerOrderId: created.id,
      paymentId: payment.id,
    });
    return { redirectUrl: created._links.redirect.href };
  } catch (error) {
    if (error instanceof BogNotConfiguredError) {
      throw new PaymentUserError(BOG_NOT_CONFIGURED_MESSAGE);
    }
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "failed",
        lastError: "bog_create_failed",
        completedAt: new Date(),
      },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "failed" },
    });
    await releaseUnpaidCardCommerce(order.id);
    logError("bog.order_create_failed", { error, orderNumber: order.orderNumber, paymentId: payment.id });
    throw new PaymentUserError(GENERIC_PAYMENT_ERROR);
  }
}
