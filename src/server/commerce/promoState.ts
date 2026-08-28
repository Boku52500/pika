export type PromotionRedemptionStatus = "held" | "consumed" | "released";

export type PromoEvent = "place_card" | "place_immediate" | "paid" | "unpaid_terminal";

export type PromoPlan = {
  status: PromotionRedemptionStatus;
  usedCount: "increment" | "none";
};

/**
 * Card: reserve (held) at placement; usedCount increments only on PAID.
 * Cash/installment: consume immediately at placement (existing behavior).
 * Unpaid card fail/cancel releases a hold without touching usedCount.
 */
export function planPromoTransition(
  current: PromotionRedemptionStatus | null,
  event: PromoEvent,
): PromoPlan | null {
  if (current == null) {
    if (event === "place_card") return { status: "held", usedCount: "none" };
    if (event === "place_immediate") return { status: "consumed", usedCount: "increment" };
    return null;
  }

  if (event === "paid") {
    if (current === "held") return { status: "consumed", usedCount: "increment" };
    if (current === "released") return { status: "consumed", usedCount: "increment" };
    return { status: "consumed", usedCount: "none" };
  }

  if (event === "unpaid_terminal") {
    if (current === "held") return { status: "released", usedCount: "none" };
    return { status: current, usedCount: "none" };
  }

  return { status: current, usedCount: "none" };
}

export function promoLimitAllows(activeHeldAndConsumed: number, usageLimit: number | null | undefined): boolean {
  if (usageLimit == null) return true;
  return activeHeldAndConsumed < usageLimit;
}

export function isActivePromoRedemption(status: PromotionRedemptionStatus): boolean {
  return status === "held" || status === "consumed";
}
