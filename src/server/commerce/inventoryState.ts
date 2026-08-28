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
 * Card orders hold stock until PAID or an unpaid terminal state (failed / cancel).
 * Cash and installment commit immediately at placement (existing behavior).
 */
export function planInventoryTransition(
  current: InventoryHoldState | null,
  event: InventoryEvent,
): InventoryPlan {
  if (current == null) {
    if (event === "place_card") return { state: "held", stock: "allocate" };
    if (event === "place_immediate") return { state: "committed", stock: "allocate" };
    return { state: "committed", stock: "none" };
  }

  if (event === "paid") {
    if (current === "held") return { state: "committed", stock: "none" };
    if (current === "released") return { state: "committed", stock: "allocate" };
    return { state: "committed", stock: "none" };
  }

  if (event === "unpaid_terminal") {
    if (current === "held") return { state: "released", stock: "release" };
    return { state: current, stock: "none" };
  }

  if (event === "retry_payment") {
    if (current === "released") return { state: "held", stock: "allocate" };
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
