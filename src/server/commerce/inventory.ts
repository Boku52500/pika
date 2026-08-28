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

export async function applyStockMutation(
  tx: Prisma.TransactionClient,
  lines: StockLine[],
  mutation: "allocate" | "release",
): Promise<void> {
  for (const line of lines) {
    if (line.quantity <= 0) continue;
    if (line.variantId) {
      if (mutation === "allocate") {
        const updated = await tx.productVariant.updateMany({
          where: { id: line.variantId, stockQuantity: { gte: line.quantity } },
          data: { stockQuantity: { decrement: line.quantity } },
        });
        if (updated.count !== 1) {
          throw new InventoryUserError("სამწუხაროდ, ერთ-ერთი პროდუქტი ამჟამად არ არის საკმარისი რაოდენობით.");
        }
      } else {
        await tx.productVariant.updateMany({
          where: { id: line.variantId },
          data: { stockQuantity: { increment: line.quantity } },
        });
      }
      continue;
    }
    if (!line.productId) continue;
    if (mutation === "allocate") {
      const updated = await tx.product.updateMany({
        where: { id: line.productId, stockQuantity: { gte: line.quantity } },
        data: { stockQuantity: { decrement: line.quantity } },
      });
      if (updated.count !== 1) {
        throw new InventoryUserError("სამწუხაროდ, ერთ-ერთი პროდუქტი ამჟამად არ არის საკმარისი რაოდენობით.");
      }
    } else {
      await tx.product.updateMany({
        where: { id: line.productId },
        data: { stockQuantity: { increment: line.quantity } },
      });
    }
  }
}

export async function applyInventoryEvent(
  tx: Prisma.TransactionClient,
  orderId: string,
  event: "place_card" | "place_immediate" | "paid" | "unpaid_terminal" | "retry_payment",
  lines?: StockLine[],
): Promise<InventoryHoldState> {
  await lockOrderRow(tx, orderId);
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      inventoryState: true,
      items: { select: { productId: true, variantId: true, quantity: true } },
    },
  });
  const plan = planInventoryTransition(order.inventoryState, event);
  if (plan.stock !== "none") {
    await applyStockMutation(tx, lines ?? order.items, plan.stock);
  }
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
