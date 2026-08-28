import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma, ProviderActionStatus, ProviderActionType } from "@/generated/prisma/client";
import { prisma } from "@/server/db";

export async function recordProviderAction(input: {
  type: ProviderActionType;
  status?: ProviderActionStatus;
  orderId?: string | null;
  paymentId?: string | null;
  savedPaymentMethodId?: string | null;
  customerId?: string | null;
  providerActionId?: string | null;
  idempotencyKey?: string;
  amount?: Prisma.Decimal | string | number | null;
  normalizedStatus?: string | null;
  errorCategory?: string | null;
}) {
  return prisma.providerAction.create({
    data: {
      type: input.type,
      status: input.status ?? "requested",
      orderId: input.orderId ?? undefined,
      paymentId: input.paymentId ?? undefined,
      savedPaymentMethodId: input.savedPaymentMethodId ?? undefined,
      customerId: input.customerId ?? undefined,
      providerActionId: input.providerActionId ?? undefined,
      idempotencyKey: input.idempotencyKey ?? randomUUID(),
      amount: input.amount ?? undefined,
      normalizedStatus: input.normalizedStatus ?? undefined,
      errorCategory: input.errorCategory ?? undefined,
      completedAt: input.status === "completed" || input.status === "failed" || input.status === "accepted" ? new Date() : undefined,
    },
  });
}

export async function completeProviderAction(
  id: string,
  patch: {
    status: ProviderActionStatus;
    providerActionId?: string | null;
    normalizedStatus?: string | null;
    errorCategory?: string | null;
  },
) {
  return prisma.providerAction.update({
    where: { id },
    data: {
      status: patch.status,
      providerActionId: patch.providerActionId ?? undefined,
      normalizedStatus: patch.normalizedStatus ?? undefined,
      errorCategory: patch.errorCategory ?? undefined,
      completedAt: new Date(),
    },
  });
}
