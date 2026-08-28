export const ONLINE_BOG_METHODS = [
  "card",
  "google_pay",
  "apple_pay",
  "bog_loan",
  "bnpl",
  "saved_card",
] as const;

export type OnlineBogMethod = (typeof ONLINE_BOG_METHODS)[number];

/** Asynchronous BOG methods: inventory/promo held until authoritative PAID. */
export function isOnlineBogMethod(method: string | null | undefined): boolean {
  if (!method) return false;
  return (ONLINE_BOG_METHODS as readonly string[]).includes(method);
}

export const PARTIAL_REFUND_METHODS = ["card", "google_pay", "apple_pay"] as const;

export function supportsBogPartialRefund(method: string | null | undefined): boolean {
  if (!method) return true;
  return (PARTIAL_REFUND_METHODS as readonly string[]).includes(method.trim().toLowerCase());
}

export const SPLIT_COMPATIBLE_METHODS = ["card", "google_pay", "apple_pay", "bog_loyalty", "bog_p2p"] as const;

export function isSplitCompatibleMethod(method: string | null | undefined): boolean {
  if (!method) return false;
  return (SPLIT_COMPATIBLE_METHODS as readonly string[]).includes(method.trim().toLowerCase());
}

export const PREAUTH_METHODS = ["card", "google_pay", "apple_pay"] as const;

export function supportsPreauthorization(method: string | null | undefined): boolean {
  if (!method) return false;
  return (PREAUTH_METHODS as readonly string[]).includes(method.trim().toLowerCase());
}
