/**
 * Official BOG Payments paths from https://api.bog.ge/docs/en/payments/introduction
 * and the linked module pages. Keep request construction aligned with these strings.
 */
export const BOG_OAUTH_TOKEN_URL =
  "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";

export const BOG_API_BASE = "https://api.bog.ge";

export function bogEcommerceOrdersUrl(apiBase: string): string {
  return `${apiBase}/payments/v1/ecommerce/orders`;
}

export function bogPaymentDetailsUrl(apiBase: string, orderId: string): string {
  return `${apiBase}/payments/v1/receipt/${encodeURIComponent(orderId)}`;
}

export function bogRefundUrl(apiBase: string, orderId: string): string {
  return `${apiBase}/payments/v1/payment/refund/${encodeURIComponent(orderId)}`;
}

/** Save card for recurring / customer-initiated payments. PUT, HTTP 202. */
export function bogSaveRecurrentCardUrl(apiBase: string, orderId: string): string {
  return `${apiBase}/payments/v1/orders/${encodeURIComponent(orderId)}/cards`;
}

/** Save card for automatic payments. PUT, HTTP 202. */
export function bogSaveAutomaticCardUrl(apiBase: string, orderId: string): string {
  return `${apiBase}/payments/v1/orders/${encodeURIComponent(orderId)}/subscriptions`;
}

/** Delete saved card. DELETE, HTTP 202. Path uses the parent order id. */
export function bogDeleteSavedCardUrl(apiBase: string, parentOrderId: string): string {
  return `${apiBase}/payments/v1/charges/card/${encodeURIComponent(parentOrderId)}`;
}

/** Payment by the saved card (customer-initiated). */
export function bogSavedCardPaymentUrl(apiBase: string, parentOrderId: string): string {
  return `${apiBase}/payments/v1/ecommerce/orders/${encodeURIComponent(parentOrderId)}`;
}

/** Automatic payment by the saved card (off-session). */
export function bogAutomaticSavedCardPaymentUrl(apiBase: string, parentOrderId: string): string {
  return `${apiBase}/payments/v1/ecommerce/orders/${encodeURIComponent(parentOrderId)}/subscribe`;
}

/** Confirm / capture pre-authorization. */
export function bogPreauthApproveUrl(apiBase: string, orderId: string): string {
  return `${apiBase}/payments/v1/payment/authorization/approve/${encodeURIComponent(orderId)}`;
}

/** Reject / void pre-authorization. */
export function bogPreauthRejectUrl(apiBase: string, orderId: string): string {
  return `${apiBase}/payments/v1/payment/authorization/cancel/${encodeURIComponent(orderId)}`;
}

/** Apple Pay Accept Payment. */
export function bogApplePayAcceptUrl(apiBase: string, orderId: string): string {
  return `${apiBase}/payments/v1/ecommerce/orders/${encodeURIComponent(orderId)}/payment`;
}

export function bogSavedCardEnrollUrl(
  apiBase: string,
  orderId: string,
  consent: "recurrent" | "subscription",
): string {
  return consent === "subscription"
    ? bogSaveAutomaticCardUrl(apiBase, orderId)
    : bogSaveRecurrentCardUrl(apiBase, orderId);
}
