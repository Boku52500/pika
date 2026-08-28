import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  planPromoTransition,
  promoLimitAllows,
  type PromoEvent,
} from "@/server/commerce/promoState";
import { inventoryEventForDerivedPayment } from "@/server/commerce/inventoryState";
import { deriveOrderPaymentStatus } from "@/server/payments/bog/status";

export class PromoUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromoUserError";
  }
}

const PROMO_INVALID = "პრომოკოდი არასწორია ან ვადაგასულია";

export async function lockPromotionRow(tx: Prisma.TransactionClient, promotionId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Promotion" WHERE "id" = ${promotionId} FOR UPDATE`;
}

export async function countActiveRedemptions(tx: Prisma.TransactionClient, promotionId: string): Promise<number> {
  return tx.promotionRedemption.count({
    where: { promotionId, status: { in: ["held", "consumed"] } },
  });
}

export async function placePromotionRedemption(
  tx: Prisma.TransactionClient,
  input: { promotionId: string; orderId: string; event: "place_card" | "place_immediate" },
): Promise<void> {
  await lockPromotionRow(tx, input.promotionId);
  const promotion = await tx.promotion.findUniqueOrThrow({
    where: { id: input.promotionId },
    select: { id: true, usageLimit: true },
  });
  const active = await countActiveRedemptions(tx, promotion.id);
  if (!promoLimitAllows(active, promotion.usageLimit)) {
    throw new PromoUserError(PROMO_INVALID);
  }
  const plan = planPromoTransition(null, input.event);
  if (!plan) return;

  if (plan.usedCount === "increment") {
    const claimed = await tx.promotion.updateMany({
      where: {
        id: promotion.id,
        ...(promotion.usageLimit != null ? { usedCount: { lt: promotion.usageLimit } } : {}),
      },
      data: { usedCount: { increment: 1 } },
    });
    if (claimed.count !== 1) {
      throw new PromoUserError(PROMO_INVALID);
    }
  }

  await tx.promotionRedemption.create({
    data: {
      promotionId: promotion.id,
      orderId: input.orderId,
      status: plan.status,
    },
  });
}

export async function applyPromoEvent(
  tx: Prisma.TransactionClient,
  orderId: string,
  event: PromoEvent,
): Promise<void> {
  const redemption = await tx.promotionRedemption.findUnique({
    where: { orderId },
    select: { id: true, promotionId: true, status: true },
  });
  if (!redemption) return;

  const plan = planPromoTransition(redemption.status, event);
  if (!plan) return;
  if (plan.status === redemption.status && plan.usedCount === "none") return;

  await lockPromotionRow(tx, redemption.promotionId);
  const promotion = await tx.promotion.findUniqueOrThrow({
    where: { id: redemption.promotionId },
    select: { id: true, usageLimit: true },
  });

  if (plan.usedCount === "increment") {
    const claimed = await tx.promotion.updateMany({
      where: {
        id: promotion.id,
        ...(promotion.usageLimit != null ? { usedCount: { lt: promotion.usageLimit } } : {}),
      },
      data: { usedCount: { increment: 1 } },
    });
    if (claimed.count !== 1) {
      await tx.promotion.update({
        where: { id: promotion.id },
        data: { usedCount: { increment: 1 } },
      });
    }
  }

  if (plan.status !== redemption.status) {
    await tx.promotionRedemption.update({
      where: { id: redemption.id },
      data: { status: plan.status },
    });
  }
}

export async function syncPromoWithPaymentStatus(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const attempts = await tx.payment.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
    select: { status: true },
  });
  const derived = deriveOrderPaymentStatus(attempts);
  const event = inventoryEventForDerivedPayment(derived);
  if (!event) return;
  await applyPromoEvent(tx, orderId, event);
}
