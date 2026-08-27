import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logError, logInfo } from "@/server/log";
import { moneyToTetri } from "@/server/money";
import { GENERIC_SERVER_ERROR, type ActionResult } from "@/server/actions/result";
import { revalidateOrders } from "@/server/admin/revalidate";
import { bogConfigured, BOG_REFUND_NOT_CONFIGURED_MESSAGE } from "@/server/payments/bog/config";
import { getBogPaymentDetails, refundBogPayment } from "@/server/payments/bog/client";
import { BogApiError, BogNotConfiguredError } from "@/server/payments/bog/errors";
import { isUuidV4 } from "@/server/payments/bog/refundRequest";
import { reconcileBogPaymentDetails } from "@/server/payments/reconcile";
import {
  evaluateRefundRequest,
  REFUND_EVALUATION_MESSAGE,
  type RefundKind,
} from "@/server/payments/refundable";

const ADMIN_NOTE_MAX = 500;
const BOG_REJECT_MESSAGE = "ბანკმა დაბრუნების მოთხოვნა ვერ მიიღო. სცადეთ ხელახლა ან განაახლეთ სტატუსი.";
const BOG_TIMEOUT_MESSAGE =
  "ბანკთან კავშირი ვერ დამყარდა. მოთხოვნა შენახულია — განაახლეთ სტატუსი ან სცადეთ იგივე დაბრუნება ხელახლა.";
const BOG_INVALID_RESPONSE_MESSAGE = "ბანკის პასუხი ვერ დამუშავდა. განაახლეთ გადახდის სტატუსი.";

function trimAdminNote(raw: string | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  return value.slice(0, ADMIN_NOTE_MAX);
}

export async function requestAdminBogRefund(input: {
  paymentId: string;
  kind: RefundKind;
  amountRaw?: string;
  adminNote?: string;
  adminId: string;
}): Promise<ActionResult> {
  if (!bogConfigured()) {
    return { ok: false, message: BOG_REFUND_NOT_CONFIGURED_MESSAGE };
  }

  const paymentId = input.paymentId.trim();
  if (!paymentId) return { ok: false, message: "გადახდა ვერ მოიძებნა" };
  const adminNote = trimAdminNote(input.adminNote);

  let reserved: {
    refundId: string;
    idempotencyKey: string;
    amount: Prisma.Decimal;
    reused: boolean;
    orderNumber: string;
    providerOrderId: string;
  };

  try {
    reserved = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id" = ${paymentId} FOR UPDATE`;
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
          include: {
            order: { select: { id: true, orderNumber: true, paymentMethod: true } },
            refunds: { orderBy: { createdAt: "asc" } },
          },
        });
        if (!payment) {
          throw new RefundUserError("გადახდა ვერ მოიძებნა");
        }

        const reusableCandidates = payment.refunds.filter(
          (row) => row.status === "requested" && !row.providerActionId,
        );
        const refundsForEval =
          reusableCandidates.length === 1
            ? payment.refunds.filter((row) => row.id !== reusableCandidates[0]?.id)
            : payment.refunds;

        const evaluated = evaluateRefundRequest({
          provider: payment.provider,
          providerOrderId: payment.providerOrderId,
          paymentStatus: payment.status,
          paymentMethod: payment.method,
          paymentAmount: payment.amount,
          refunds: refundsForEval,
          kind: input.kind,
          partialAmountRaw: input.amountRaw,
          providerRefundAmount: payment.providerRefundAmount,
        });
        if (!evaluated.ok) {
          throw new RefundUserError(REFUND_EVALUATION_MESSAGE[evaluated.code]);
        }

        const candidate = reusableCandidates[0];
        if (
          reusableCandidates.length === 1 &&
          candidate &&
          moneyToTetri(candidate.amount) === moneyToTetri(evaluated.amount)
        ) {
          if (adminNote && adminNote !== candidate.adminNote) {
            await tx.paymentRefund.update({
              where: { id: candidate.id },
              data: { adminNote },
            });
          }
          return {
            refundId: candidate.id,
            idempotencyKey: candidate.idempotencyKey,
            amount: candidate.amount,
            reused: true,
            orderNumber: payment.order.orderNumber,
            providerOrderId: payment.providerOrderId!,
          };
        }

        if (reusableCandidates.length > 0) {
          throw new RefundUserError(REFUND_EVALUATION_MESSAGE.in_flight);
        }

        const idempotencyKey = randomUUID();
        if (!isUuidV4(idempotencyKey)) {
          throw new Error("Failed to allocate refund idempotency key");
        }

        const created = await tx.paymentRefund.create({
          data: {
            paymentId: payment.id,
            provider: "bog",
            idempotencyKey,
            amount: evaluated.amount,
            status: "requested",
            adminNote,
            requestedByAdminId: input.adminId,
          },
        });

        return {
          refundId: created.id,
          idempotencyKey,
          amount: created.amount,
          reused: false,
          orderNumber: payment.order.orderNumber,
          providerOrderId: payment.providerOrderId!,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof RefundUserError) {
      return { ok: false, message: error.message };
    }
    logError("bog.refund_request_failed", { error, paymentId });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }

  logInfo("bog.refund_requested", {
    paymentId,
    refundId: reserved.refundId,
    orderNumber: reserved.orderNumber,
    providerOrderId: reserved.providerOrderId,
    reused: reserved.reused,
  });

  const omitAmount = input.kind === "full";

  let response: { key: string; message?: string; action_id: string };
  try {
    response = await refundBogPayment({
      providerOrderId: reserved.providerOrderId,
      idempotencyKey: reserved.idempotencyKey,
      amount: omitAmount ? null : reserved.amount,
    });
  } catch (error) {
    const timeout = error instanceof BogApiError && error.status === 0;
    const invalidBody = error instanceof BogApiError && error.status === 200 && !error.code;
    const notConfigured = error instanceof BogNotConfiguredError;
    const ambiguous = timeout || invalidBody;

    try {
      await prisma.paymentRefund.update({
        where: { id: reserved.refundId },
        data: ambiguous
          ? { lastError: timeout ? "bog_timeout" : "bog_invalid_response" }
          : {
              status: "failed",
              lastError: notConfigured ? "bog_not_configured" : "bog_rejected",
            },
      });
    } catch (persistError) {
      logError("bog.refund_request_failed", {
        error: persistError,
        paymentId,
        refundId: reserved.refundId,
        reason: "persist_failed_after_provider_error",
      });
    }

    logError("bog.refund_request_failed", {
      error,
      paymentId,
      refundId: reserved.refundId,
      orderNumber: reserved.orderNumber,
      providerOrderId: reserved.providerOrderId,
    });

    if (notConfigured) return { ok: false, message: BOG_REFUND_NOT_CONFIGURED_MESSAGE };
    if (timeout) return { ok: false, message: BOG_TIMEOUT_MESSAGE };
    if (invalidBody) return { ok: false, message: BOG_INVALID_RESPONSE_MESSAGE };
    return { ok: false, message: BOG_REJECT_MESSAGE };
  }

  try {
    await prisma.paymentRefund.update({
      where: { id: reserved.refundId },
      data: {
        status: "processing",
        providerActionId: response.action_id,
        providerStatus: response.key,
        providerMessage: response.message ?? null,
        lastError: null,
      },
    });
  } catch (error) {
    logError("bog.refund_request_failed", {
      error,
      paymentId,
      refundId: reserved.refundId,
      orderNumber: reserved.orderNumber,
      providerOrderId: reserved.providerOrderId,
      actionId: response.action_id,
      reason: "persist_failed_after_provider_accept",
    });
    return { ok: false, message: BOG_INVALID_RESPONSE_MESSAGE };
  }

  logInfo("bog.refund_accepted", {
    paymentId,
    refundId: reserved.refundId,
    orderNumber: reserved.orderNumber,
    providerOrderId: reserved.providerOrderId,
    actionId: response.action_id,
  });

  try {
    const details = await getBogPaymentDetails(reserved.providerOrderId);
    await reconcileBogPaymentDetails(details);
  } catch (error) {
    logError("bog.refund_request_failed", {
      error,
      paymentId,
      refundId: reserved.refundId,
      reason: "reconcile_after_refund_failed",
      orderNumber: reserved.orderNumber,
      providerOrderId: reserved.providerOrderId,
    });
  }

  revalidateOrders();
  return { ok: true };
}

class RefundUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefundUserError";
  }
}
