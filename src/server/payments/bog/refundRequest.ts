import { Prisma } from "@/generated/prisma/client";
import { moneyToNumber } from "@/server/money";

/** Full refund omits `amount`. Partial refund sends documented `amount`. */
export function buildBogRefundBody(
  amount?: Prisma.Decimal | string | number | null,
): Record<string, never> | { amount: number } {
  if (amount == null || amount === "") return {};
  return { amount: moneyToNumber(amount) };
}

export function buildBogRefundRequest(input: {
  apiBaseUrl: string;
  providerOrderId: string;
  idempotencyKey: string;
  amount?: Prisma.Decimal | string | number | null;
}): { url: string; headers: Record<string, string>; body: string } {
  const base = input.apiBaseUrl.replace(/\/+$/, "");
  return {
    url: `${base}/payments/v1/payment/refund/${encodeURIComponent(input.providerOrderId)}`,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify(buildBogRefundBody(input.amount)),
  };
}

export const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidV4(value: string): boolean {
  return UUID_V4_RE.test(value.trim());
}
