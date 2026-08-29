export type InventoryHoldState = "held" | "committed" | "released";

export type InventoryEvent =
  | "place_card"
  | "place_immediate"
  | "paid"
  | "unpaid_terminal"
  | "retry_payment";

export type StockMutation = "allocate" | "release" | "none";

export type InventoryPlan = {
  state: InventoryHoldState;
  stock: StockMutation;
};

/**
 * Physical stock holds are disabled — availability is manual via isActive only.
 * State transitions are retained for schema compatibility but never mutate stock.
 */
export function planInventoryTransition(
  current: InventoryHoldState | null,
  event: InventoryEvent,
): InventoryPlan {
  if (current == null) {
    if (event === "place_card") return { state: "held", stock: "none" };
    if (event === "place_immediate") return { state: "committed", stock: "none" };
    return { state: "committed", stock: "none" };
  }

  if (event === "paid") {
    if (current === "held") return { state: "committed", stock: "none" };
    return { state: "committed", stock: "none" };
  }

  if (event === "unpaid_terminal") {
    if (current === "held") return { state: "released", stock: "none" };
    return { state: current, stock: "none" };
  }

  if (event === "retry_payment") {
    if (current === "released") return { state: "held", stock: "none" };
    return { state: current, stock: "none" };
  }

  return { state: current, stock: "none" };
}

export function isPaidLikePaymentStatus(status: string): boolean {
  return status === "paid" || status === "refunded" || status === "partially_refunded";
}

export function inventoryEventForDerivedPayment(status: string): "paid" | "unpaid_terminal" | null {
  if (isPaidLikePaymentStatus(status)) return "paid";
  if (status === "failed") return "unpaid_terminal";
  return null;
}
