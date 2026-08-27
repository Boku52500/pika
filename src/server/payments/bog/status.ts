import type { PaymentAttemptStatus, PaymentStatus } from "@/generated/prisma/client";

/** Documented `order_status.key` values from BOG payment details. */
export const BOG_PROVIDER_STATUSES = [
  "created",
  "processing",
  "completed",
  "rejected",
  "refund_requested",
  "refunded",
  "refunded_partially",
  "auth_requested",
  "blocked",
  "partial_completed",
] as const;

export type BogProviderStatus = (typeof BOG_PROVIDER_STATUSES)[number];

export function isBogProviderStatus(value: string): value is BogProviderStatus {
  return (BOG_PROVIDER_STATUSES as readonly string[]).includes(value);
}

export function mapBogStatusToAttempt(providerStatus: string): PaymentAttemptStatus {
  switch (providerStatus) {
    case "completed":
      return "paid";
    case "rejected":
      return "failed";
    case "processing":
    case "auth_requested":
    case "blocked":
    case "partial_completed":
    case "refund_requested":
      return "processing";
    case "refunded":
      return "refunded";
    case "refunded_partially":
      return "partially_refunded";
    case "created":
    default:
      return "pending";
  }
}

export function deriveOrderPaymentStatus(attempts: Array<{ status: PaymentAttemptStatus }>): PaymentStatus {
  if (attempts.some((row) => row.status === "refunded")) return "refunded";
  if (attempts.some((row) => row.status === "partially_refunded")) return "partially_refunded";
  if (attempts.some((row) => row.status === "paid")) return "paid";
  const latest = attempts[attempts.length - 1];
  if (!latest) return "unpaid";
  if (latest.status === "processing") return "processing";
  if (latest.status === "failed") return "failed";
  if (latest.status === "pending") return "pending";
  return "pending";
}

const TERMINAL_PAID: PaymentAttemptStatus[] = ["paid", "refunded", "partially_refunded"];

/** Whether incoming provider status should overwrite the stored attempt. */
export function shouldApplyAttemptStatus(
  current: PaymentAttemptStatus,
  incoming: PaymentAttemptStatus,
): boolean {
  if (current === incoming) return true;
  if (TERMINAL_PAID.includes(current) && incoming === "failed") return false;
  if (TERMINAL_PAID.includes(current) && (incoming === "pending" || incoming === "processing")) return false;
  if (current === "refunded" && incoming !== "refunded") return false;
  return true;
}

export function isRetryableAttemptStatus(status: PaymentAttemptStatus): boolean {
  return status === "failed" || status === "pending" || status === "processing";
}

export function isPaidAttemptStatus(status: PaymentAttemptStatus): boolean {
  return status === "paid" || status === "refunded" || status === "partially_refunded";
}
