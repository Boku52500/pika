import "server-only";

import { prisma } from "@/server/db";
import { logError } from "@/server/log";
import { applyInventoryEvent, syncInventoryWithPaymentStatus } from "@/server/commerce/inventory";
import { applyPromoEvent, syncPromoWithPaymentStatus } from "@/server/commerce/promoRedemption";

/** After BOG reconciliation has already persisted payment/order status. Never throws. */
export async function syncCommerceAfterPaymentReconciliation(orderId: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await syncInventoryWithPaymentStatus(tx, orderId);
      await syncPromoWithPaymentStatus(tx, orderId);
    });
  } catch (error) {
    logError("commerce.payment_sync_failed", { error, orderId });
  }
}

export async function releaseUnpaidCardCommerce(orderId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await applyInventoryEvent(tx, orderId, "unpaid_terminal");
    await applyPromoEvent(tx, orderId, "unpaid_terminal");
  });
}
