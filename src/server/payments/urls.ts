import { getAppOriginString } from "@/lib/appUrl";

export function bogCallbackUrl(): string {
  return `${getAppOriginString()}/api/payments/bog/callback`;
}

export function bogCustomerSuccessUrl(orderNumber: string): string {
  return `${getAppOriginString()}/checkout/payment/success?order=${encodeURIComponent(orderNumber)}`;
}

export function bogCustomerFailUrl(orderNumber: string): string {
  return `${getAppOriginString()}/checkout/payment/fail?order=${encodeURIComponent(orderNumber)}`;
}
