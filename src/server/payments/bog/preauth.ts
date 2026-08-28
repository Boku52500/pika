import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import { logError } from "@/server/log";
import { GENERIC_SERVER_ERROR, type ActionResult } from "@/server/actions/result";
import { revalidateOrders } from "@/server/admin/revalidate";
import { recordProviderAction } from "@/server/payments/audit";
import { approveBogPreauthorization, getBogPaymentDetails, rejectBogPreauthorization } from "@/server/payments/bog/client";
import { getBogMerchantCapabilities } from "@/server/payments/bog/capabilities";
import { BogApiError, BogNotConfiguredError } from "@/server/payments/bog/errors";
import { validateBogSplitPayments } from "@/server/payments/bog/split";
import { bogConfigured, BOG_REFUND_NOT_CONFIGURED_MESSAGE } from "@/server/payments/bog/config";
import { reconcileBogPaymentDetails } from "@/server/payments/reconcile";
import { parseMoneyInput } from "@/server/money";
import { hasInFlightProviderAction } from "@/server/payments/bog/policy";

const NOT_AUTHORIZED = "ეს გადახდა არ არის პრეავტორიზებული.";
const DUPLICATE = "დადასტურება ან გაუქმება უკვე მუშავდება.";

export async function captureAuthorizedPayment(input: {
  paymentId: string;
  amountRaw?: string;
  description?: string;
  adminId: string;
}): Promise<ActionResult> {
  if (!bogConfigured()) return { ok: false, message: BOG_REFUND_NOT_CONFIGURED_MESSAGE };
  const caps = getBogMerchantCapabilities();
  if (!caps.preauthorization) return { ok: false, message: "პრეავტორიზაცია ამჟამად მიუწვდომელია." };

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: input.paymentId },
      include: { order: { select: { id: true, orderNumber: true } }, providerActions: { where: { type: { in: ["capture", "reject_authorization"] } } } },
    });
    if (!payment?.providerOrderId) return { ok: false, message: "გადახდა ვერ მოიძებნა" };
    if (payment.status !== "authorized" || payment.captureMode !== "manual") {
      return { ok: false, message: NOT_AUTHORIZED };
    }
    if (hasInFlightProviderAction(payment.providerActions, ["capture", "reject_authorization"])) {
      return { ok: false, message: DUPLICATE };
    }

    let amount: string | undefined;
    if (input.amountRaw?.trim()) {
      amount = parseMoneyInput(input.amountRaw.trim().replace(",", ".")).toFixed(2);
    }

    let split: Parameters<typeof approveBogPreauthorization>[0]["split"];
    if (caps.split && payment.splitSnapshot && typeof payment.splitSnapshot === "object") {
      const snapshot = payment.splitSnapshot as { split_payments?: unknown };
      if (Array.isArray(snapshot.split_payments)) {
        const validated = validateBogSplitPayments({
          entries: snapshot.split_payments as never,
          currency: payment.currency,
          paymentMethod: payment.method,
          captureAmount: amount ? Number(amount) : undefined,
        });
        if (validated.ok) split = validated.config;
      }
    }

    const idempotencyKey = randomUUID();
    await recordProviderAction({
      type: "capture",
      status: "requested",
      paymentId: payment.id,
      orderId: payment.orderId,
      idempotencyKey,
      amount: amount ?? payment.amount,
    });
    const accepted = await approveBogPreauthorization({
      providerOrderId: payment.providerOrderId,
      idempotencyKey,
      amount,
      description: input.description,
      split,
    });
    await prisma.providerAction.updateMany({
      where: { idempotencyKey },
      data: {
        status: "accepted",
        providerActionId: accepted.action_id,
        normalizedStatus: accepted.key,
        completedAt: new Date(),
      },
    });
    const details = await getBogPaymentDetails(payment.providerOrderId);
    await reconcileBogPaymentDetails(details);
    revalidateOrders();
    return { ok: true };
  } catch (error) {
    if (error instanceof BogNotConfiguredError) return { ok: false, message: BOG_REFUND_NOT_CONFIGURED_MESSAGE };
    logError("bog.preauth_capture_failed", { error, paymentId: input.paymentId });
    const category = error instanceof BogApiError ? "provider_rejected" : "provider_error";
    await recordProviderAction({
      type: "capture",
      status: "failed",
      paymentId: input.paymentId,
      errorCategory: category,
    }).catch(() => undefined);
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}

export async function rejectAuthorizedPayment(input: {
  paymentId: string;
  description?: string;
  adminId: string;
}): Promise<ActionResult> {
  if (!bogConfigured()) return { ok: false, message: BOG_REFUND_NOT_CONFIGURED_MESSAGE };
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: input.paymentId },
      include: { providerActions: { where: { type: { in: ["capture", "reject_authorization"] } } } },
    });
    if (!payment?.providerOrderId) return { ok: false, message: "გადახდა ვერ მოიძებნა" };
    if (payment.status !== "authorized" || payment.captureMode !== "manual") {
      return { ok: false, message: NOT_AUTHORIZED };
    }
    if (hasInFlightProviderAction(payment.providerActions, ["capture", "reject_authorization"])) {
      return { ok: false, message: DUPLICATE };
    }
    const idempotencyKey = randomUUID();
    await recordProviderAction({
      type: "reject_authorization",
      status: "requested",
      paymentId: payment.id,
      orderId: payment.orderId,
      idempotencyKey,
    });
    const accepted = await rejectBogPreauthorization({
      providerOrderId: payment.providerOrderId,
      idempotencyKey,
      description: input.description,
    });
    await prisma.providerAction.updateMany({
      where: { idempotencyKey },
      data: {
        status: "accepted",
        providerActionId: accepted.action_id,
        normalizedStatus: accepted.key,
        completedAt: new Date(),
      },
    });
    const details = await getBogPaymentDetails(payment.providerOrderId);
    await reconcileBogPaymentDetails(details);
    revalidateOrders();
    return { ok: true };
  } catch (error) {
    logError("bog.preauth_reject_failed", { error, paymentId: input.paymentId });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}
