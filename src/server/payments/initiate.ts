import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logError, logInfo } from "@/server/log";
import { bogConfigured, BOG_NOT_CONFIGURED_MESSAGE } from "@/server/payments/bog/config";
import {
  createBogEcommerceOrder,
  createBogSavedCardPayment,
} from "@/server/payments/bog/client";
import { BogNotConfiguredError, PaymentUserError } from "@/server/payments/bog/errors";
import { buildBogCreateOrderBody, type BogCreateOrderConfig, type BogPaymentMethodValue } from "@/server/payments/bog/payload";
import { isPaidAttemptStatus } from "@/server/payments/bog/status";
import { bogCallbackUrl, bogCustomerFailUrl, bogCustomerSuccessUrl } from "@/server/payments/urls";
import { applyInventoryEvent, InventoryUserError } from "@/server/commerce/inventory";
import { releaseUnpaidCardCommerce } from "@/server/commerce/sync";
import { getBogMerchantCapabilities } from "@/server/payments/bog/capabilities";
import { requestBogSavedCardEnrollment } from "@/server/payments/bog/savedCard";
import { isOnlineBogMethod } from "@/server/payments/methods";
import { validateBogSplitPayments, parseSplitRecipientsEnv } from "@/server/payments/bog/split";
import { resolveCaptureMode, resolveCreateOrderPaymentMethods } from "@/server/payments/bog/policy";

export { PaymentUserError };

const GENERIC_PAYMENT_ERROR = "გადახდის დაწყება ვერ მოხერხდა. სცადეთ ხელახლა.";

type OrderWithItems = {
  id: string;
  orderNumber: string;
  paymentMethod: string;
  paymentStatus: string;
  customerId: string | null;
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

export type StartBogPaymentOptions = {
  paymentMethods?: BogPaymentMethodValue[];
  capture?: "automatic" | "manual";
  googlePayToken?: string;
  applePayExternal?: boolean;
  parentOrderId?: string;
  savedPaymentMethodId?: string;
  saveCardConsent?: "recurrent" | "subscription" | null;
  loan?: { month: number; type: string };
  method?: string;
};

export type StartBogPaymentResult = {
  redirectUrl?: string;
  providerOrderId?: string;
  applePay?: { providerOrderId: string; result: unknown };
  awaitingProvider?: boolean;
};

export async function createPendingCardPayment(
  tx: Prisma.TransactionClient,
  order: { id: string; total: Prisma.Decimal },
  extras?: {
    method?: string;
    captureMode?: string;
    savedPaymentMethodId?: string;
    parentProviderOrderId?: string;
    loanMonth?: number;
    loanDiscountCode?: string;
  },
) {
  return tx.payment.create({
    data: {
      orderId: order.id,
      provider: "bog",
      idempotencyKey: randomUUID(),
      status: "pending",
      amount: order.total,
      currency: "GEL",
      method: extras?.method ?? "card",
      captureMode: extras?.captureMode ?? "automatic",
      savedPaymentMethodId: extras?.savedPaymentMethodId,
      parentProviderOrderId: extras?.parentProviderOrderId,
      loanMonth: extras?.loanMonth,
      loanDiscountCode: extras?.loanDiscountCode,
    },
  });
}

function latestUsableRedirect(payments: Array<{
  status: string;
  providerOrderId: string | null;
  redirectUrl: string | null;
  idempotencyKey: string;
  id: string;
  method: string | null;
  providerSession: unknown;
}>) {
  const latest = payments[0];
  if (!latest) return null;
  if (isPaidAttemptStatus(latest.status as never) || latest.status === "authorized") {
    return { kind: "paid" as const };
  }
  if (latest.status === "pending" || latest.status === "processing") {
    if (latest.providerOrderId && latest.redirectUrl) {
      return {
        kind: "reuse" as const,
        redirectUrl: latest.redirectUrl,
        providerOrderId: latest.providerOrderId,
        paymentId: latest.id,
      };
    }
    if (latest.providerOrderId && latest.method === "apple_pay" && latest.providerSession) {
      return {
        kind: "apple" as const,
        providerOrderId: latest.providerOrderId,
        result: latest.providerSession,
      };
    }
    if (latest.providerOrderId) {
      return { kind: "wait" as const, providerOrderId: latest.providerOrderId };
    }
    return { kind: "retry-same" as const, paymentId: latest.id, idempotencyKey: latest.idempotencyKey };
  }
  return { kind: "new" as const };
}

async function splitConfigForOrder(method: string | undefined) {
  const caps = getBogMerchantCapabilities();
  if (!caps.split) return undefined;
  const dbRows = await prisma.bogSplitRecipient.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 10,
  });
  const entries = dbRows.length
    ? dbRows.map((row) => ({
        iban: row.iban,
        amount: row.amount,
        percent: row.percent,
        description: row.description,
      }))
    : parseSplitRecipientsEnv(process.env.BOG_SPLIT_RECIPIENTS);
  if (!entries.length) return undefined;
  const validated = validateBogSplitPayments({
    entries,
    currency: "GEL",
    paymentMethod: method ?? "card",
  });
  return validated.ok ? validated.config : undefined;
}

export async function startBogPaymentForOrder(
  orderId: string,
  options: StartBogPaymentOptions = {},
): Promise<StartBogPaymentResult> {
  if (!bogConfigured()) {
    throw new PaymentUserError(BOG_NOT_CONFIGURED_MESSAGE);
  }

  const caps = getBogMerchantCapabilities();

  type Prepared =
    | { kind: "reuse"; redirectUrl: string; providerOrderId?: string }
    | { kind: "apple"; providerOrderId: string; result: unknown }
    | { kind: "wait"; providerOrderId?: string }
    | { kind: "start"; paymentId: string; order: OrderWithItems; method: string; capture: "automatic" | "manual" };

  const prepared: Prepared = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new PaymentUserError("შეკვეთა ვერ მოიძებნა");
    if (!isOnlineBogMethod(order.paymentMethod) && order.paymentMethod !== "card") {
      throw new PaymentUserError("ეს შეკვეთა ონლაინ გადასახდელი არ არის");
    }

    const method = options.method ?? order.paymentMethod;
    const capture = resolveCaptureMode({
      method,
      preauthorizationEnabled: caps.preauthorization,
      explicit: options.capture,
    });

    const payments = await tx.payment.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
    });
    if (payments.some((row) => isPaidAttemptStatus(row.status) || row.status === "authorized")) {
      throw new PaymentUserError(
        payments.some((row) => row.status === "authorized")
          ? "თანხა დაბლოკილია და ადმინის დადასტურებას ელოდება."
          : "ეს შეკვეთა უკვე გადახდილია",
      );
    }

    const plan = latestUsableRedirect(payments);
    if (plan?.kind === "paid") {
      throw new PaymentUserError("ეს შეკვეთა უკვე გადახდილია");
    }
    if (plan?.kind === "reuse" && !options.googlePayToken && !options.applePayExternal) {
      return { kind: "reuse" as const, redirectUrl: plan.redirectUrl, providerOrderId: plan.providerOrderId };
    }
    if (plan?.kind === "apple" && !options.googlePayToken) {
      return { kind: "apple" as const, providerOrderId: plan.providerOrderId, result: plan.result };
    }
    if (plan?.kind === "wait" && !options.googlePayToken && !options.applePayExternal) {
      return { kind: "wait" as const, providerOrderId: plan.providerOrderId };
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
          method,
          captureMode: capture,
          savedPaymentMethodId: options.savedPaymentMethodId,
          parentProviderOrderId: options.parentOrderId,
          loanMonth: options.loan?.month,
          loanDiscountCode: options.loan?.type,
        },
      });
      paymentId = created.id;
    } else {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          method,
          captureMode: capture,
          savedPaymentMethodId: options.savedPaymentMethodId,
          parentProviderOrderId: options.parentOrderId,
          loanMonth: options.loan?.month,
          loanDiscountCode: options.loan?.type,
        },
      });
    }

    return { kind: "start" as const, paymentId, order, method, capture };
  });

  if (prepared.kind === "reuse") {
    return { redirectUrl: prepared.redirectUrl, providerOrderId: prepared.providerOrderId };
  }
  if (prepared.kind === "apple") {
    return { applePay: { providerOrderId: prepared.providerOrderId, result: prepared.result } };
  }
  if (prepared.kind === "wait") {
    return { awaitingProvider: true, providerOrderId: prepared.providerOrderId };
  }

  const order = prepared.order;
  const method = prepared.method;
  const capture = prepared.capture;
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: prepared.paymentId } });
  const split = await splitConfigForOrder(method);

  const config: BogCreateOrderConfig = {};
  if (options.googlePayToken) {
    config.google_pay = { external: true, google_pay_token: options.googlePayToken };
  }
  if (options.applePayExternal) {
    config.apple_pay = { external: true };
  }
  if (options.loan) {
    config.loan = { month: options.loan.month, type: options.loan.type };
  }
  if (split) config.split = split;

  const paymentMethods = resolveCreateOrderPaymentMethods({
    method,
    explicit: options.paymentMethods,
    caps,
  });
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
    capture,
    paymentMethods,
    applicationType: options.applePayExternal ? "web" : undefined,
    config: Object.keys(config).length > 0 ? config : undefined,
  });

  try {
    const created = options.parentOrderId
      ? await createBogSavedCardPayment({
          parentOrderId: options.parentOrderId,
          body,
          idempotencyKey: payment.idempotencyKey,
        })
      : await createBogEcommerceOrder({
          body,
          idempotencyKey: payment.idempotencyKey,
        });

    const redirectUrl = created._links?.redirect?.href;
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerOrderId: created.id,
        redirectUrl: redirectUrl ?? null,
        lastError: null,
        splitStatus: split ? "created" : undefined,
        splitSnapshot: split ? (split as object) : undefined,
        providerSession: options.applePayExternal ? (created.result ?? undefined) : undefined,
      },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "pending" },
    });

    if (options.saveCardConsent && order.customerId && created.id) {
      try {
        await requestBogSavedCardEnrollment({
          providerOrderId: created.id,
          paymentId: payment.id,
          orderId: order.id,
          customerId: order.customerId,
          consent: options.saveCardConsent,
        });
      } catch (error) {
        logError("bog.saved_card_enroll_failed", { error, paymentId: payment.id });
      }
    }

    logInfo("bog.order_created", {
      orderNumber: order.orderNumber,
      providerOrderId: created.id,
      paymentId: payment.id,
    });

    if (options.applePayExternal) {
      return { applePay: { providerOrderId: created.id, result: created.result } };
    }
    if (redirectUrl) {
      return { redirectUrl, providerOrderId: created.id };
    }
    return { providerOrderId: created.id };
  } catch (error) {
    if (error instanceof BogNotConfiguredError) {
      throw new PaymentUserError(BOG_NOT_CONFIGURED_MESSAGE);
    }
    if (error instanceof PaymentUserError) throw error;
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
