import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  inventoryEventForDerivedPayment,
  planInventoryTransition,
  type InventoryHoldState,
} from "@/server/commerce/inventoryState";
import { deriveOrderPaymentStatus } from "@/server/payments/bog/status";

export class InventoryUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryUserError";
  }
}

export type StockLine = {
  productId: string | null;
  variantId: string | null;
  quantity: number;
};

export async function lockOrderRow(tx: Prisma.TransactionClient, orderId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
}

/** No-op — numeric stock is not managed. Kept for call-site compatibility. */
export async function applyStockMutation(
  ..._args: [Prisma.TransactionClient, StockLine[], "allocate" | "release"]
): Promise<void> {
  void _args;
}

export async function applyInventoryEvent(
  tx: Prisma.TransactionClient,
  orderId: string,
  event: "place_card" | "place_immediate" | "paid" | "unpaid_terminal" | "retry_payment",
): Promise<InventoryHoldState> {
  await lockOrderRow(tx, orderId);
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { inventoryState: true },
  });
  const plan = planInventoryTransition(order.inventoryState, event);
  if (plan.state !== order.inventoryState) {
    await tx.order.update({
      where: { id: orderId },
      data: { inventoryState: plan.state },
    });
  }
  return plan.state;
}

export async function syncInventoryWithPaymentStatus(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<void> {
  const attempts = await tx.payment.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
    select: { status: true },
  });
  const derived = deriveOrderPaymentStatus(attempts);
  const event = inventoryEventForDerivedPayment(derived);
  if (!event) return;
  await applyInventoryEvent(tx, orderId, event);
}
