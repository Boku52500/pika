import type { BogPaymentMethodValue } from "@/server/payments/bog/payload";
import { supportsPreauthorization } from "@/server/payments/methods";

export const BOG_REQUEST_RECEIVED = "request_received";

export type HostedMethodCaps = {
  hostedGooglePay: boolean;
  hostedApplePay: boolean;
  hostedP2p: boolean;
  hostedLoyalty: boolean;
  hostedGiftCard: boolean;
};

/**
 * Methods for Pika's standard "Card" checkout on BOG's hosted page.
 *
 * Official Order Request: `google_pay` is Google Pay + bank card; `apple_pay`
 * is Apple Pay + bank card. Do not omit `payment_method` — an empty list lets
 * BOG show every merchant-activated method (installment, BNPL, P2P, loyalty,
 * gift card). Do not set `config.google_pay.external` / `config.apple_pay.external`.
 */
export function hostedPaymentMethods(caps: HostedMethodCaps): BogPaymentMethodValue[] {
  const methods = new Set<BogPaymentMethodValue>(["card", "google_pay", "apple_pay"]);
  if (caps.hostedP2p) methods.add("bog_p2p");
  if (caps.hostedLoyalty) methods.add("bog_loyalty");
  if (caps.hostedGiftCard) methods.add("gift_card");
  return [...methods];
}

/** Recurrent vs automatic saved-card consent. Ordinary save-card is recurrent only. */
export function savedCardConsentFromType(
  savedCardType: string | null | undefined,
): "recurrent" | "subscription" | null {
  if (savedCardType === "subscription") return "subscription";
  if (savedCardType === "recurrent") return "recurrent";
  return null;
}

export function automaticChargeWorkflowAllowed(caps: {
  automaticChargeWorkflow: boolean;
  savedCardAutomatic: boolean;
}): boolean {
  return caps.automaticChargeWorkflow && caps.savedCardAutomatic;
}

export function savedMethodOwnedBy(
  method: { customerId: string; deletedAt: Date | null } | null | undefined,
  customerId: string,
): boolean {
  return Boolean(method && method.deletedAt == null && method.customerId === customerId);
}

export function hasInFlightProviderAction(
  actions: Array<{ type: string; status: string }>,
  types: readonly string[],
): boolean {
  return actions.some(
    (row) => types.includes(row.type) && (row.status === "requested" || row.status === "accepted"),
  );
}

export function resolveCaptureMode(input: {
  method?: string | null;
  preauthorizationEnabled: boolean;
  explicit?: "automatic" | "manual";
}): "automatic" | "manual" {
  if (input.explicit) return input.explicit;
  if (input.preauthorizationEnabled && supportsPreauthorization(input.method ?? "card")) {
    return "manual";
  }
  return "automatic";
}

export function resolveCreateOrderPaymentMethods(input: {
  method?: string | null;
  explicit?: BogPaymentMethodValue[];
  caps: HostedMethodCaps;
}): BogPaymentMethodValue[] {
  if (input.explicit?.length) return input.explicit;
  switch (input.method) {
    case "google_pay":
      return ["google_pay"];
    case "apple_pay":
      return ["apple_pay"];
    case "bog_loan":
      return ["bog_loan"];
    case "bnpl":
      return ["bnpl"];
    default:
      return hostedPaymentMethods(input.caps);
  }
}

/** Refund does not reverse an executed partner split (BOG Split Payment docs). */
export function refundReversesExecutedSplit(): false {
  return false;
}
