import { Prisma } from "@/generated/prisma/client";
import { isValidMoneyInput, moneyToTetri, parseMoneyInput, tetriToMoney, tetriToNumber, type Money } from "@/server/money";
import { supportsBogPartialRefund } from "@/server/payments/methods";

export const IN_FLIGHT_REFUND_STATUSES = ["requested", "processing"] as const;
export const COMPLETED_REFUND_STATUS = "completed" as const;

export type RefundKind = "full" | "partial";

export type RefundAmountRow = {
  amount: Prisma.Decimal | string | number;
  status: string;
};

export type RefundEvaluationOk = {
  ok: true;
  amount: Money;
  remaining: Money;
  remainingTetri: number;
};

export type RefundEvaluationFail = {
  ok: false;
  code:
    | "not_bog"
    | "missing_provider_id"
    | "not_refundable_status"
    | "already_refunded"
    | "in_flight"
    | "invalid_amount"
    | "zero_amount"
    | "exceeds_remaining"
    | "method_no_partial";
};

export type RefundEvaluation = RefundEvaluationOk | RefundEvaluationFail;

const REFUNDABLE_PAYMENT_STATUSES = new Set(["paid", "partially_refunded"]);

export function isRefundablePaymentStatus(status: string): boolean {
  return REFUNDABLE_PAYMENT_STATUSES.has(status);
}

export function isInFlightRefundStatus(status: string): boolean {
  return status === "requested" || status === "processing";
}

/** Partial refunds are documented for card, Apple Pay and Google Pay. */
export function supportsPartialRefund(method: string | null | undefined): boolean {
  return supportsBogPartialRefund(method);
}

export function confirmedRefundedTetri(input: {
  refunds: RefundAmountRow[];
  providerRefundAmount?: Prisma.Decimal | string | number | null;
}): number {
  const localCompleted = input.refunds
    .filter((row) => row.status === COMPLETED_REFUND_STATUS)
    .reduce((sum, row) => sum + moneyToTetri(row.amount), 0);
  if (input.providerRefundAmount == null || input.providerRefundAmount === "") {
    return localCompleted;
  }
  const provider = moneyToTetri(input.providerRefundAmount);
  return Math.max(localCompleted, provider);
}

export function inFlightRefundTetri(refunds: RefundAmountRow[]): number {
  return refunds
    .filter((row) => isInFlightRefundStatus(row.status))
    .reduce((sum, row) => sum + moneyToTetri(row.amount), 0);
}

/**
 * Remaining refundable amount in tetri: processed payment − confirmed refunded − in-flight.
 * Payment.amount is the original processed charge. Do not use current product prices.
 */
export function remainingRefundableTetri(input: {
  paymentAmount: Prisma.Decimal | string | number;
  paymentStatus: string;
  refunds: RefundAmountRow[];
  providerRefundAmount?: Prisma.Decimal | string | number | null;
}): number {
  if (input.paymentStatus === "refunded") return 0;
  const processed = moneyToTetri(input.paymentAmount);
  const confirmed = confirmedRefundedTetri(input);
  const reserved = inFlightRefundTetri(input.refunds);
  return Math.max(0, processed - confirmed - reserved);
}

export function remainingRefundableMoney(input: {
  paymentAmount: Prisma.Decimal | string | number;
  paymentStatus: string;
  refunds: RefundAmountRow[];
  providerRefundAmount?: Prisma.Decimal | string | number | null;
}): Money {
  return tetriToMoney(remainingRefundableTetri(input));
}

export function parseRefundAmountInput(raw: string): RefundEvaluationFail | { ok: true; amount: Money } {
  const value = raw.trim().replace(",", ".");
  if (!isValidMoneyInput(value)) return { ok: false, code: "invalid_amount" };
  const amount = parseMoneyInput(value);
  if (moneyToTetri(amount) <= 0) return { ok: false, code: "zero_amount" };
  return { ok: true, amount };
}

export function evaluateRefundRequest(input: {
  provider: string;
  providerOrderId: string | null | undefined;
  paymentStatus: string;
  paymentMethod: string | null | undefined;
  paymentAmount: Prisma.Decimal | string | number;
  refunds: RefundAmountRow[];
  kind: RefundKind;
  partialAmountRaw?: string;
  providerRefundAmount?: Prisma.Decimal | string | number | null;
}): RefundEvaluation {
  if (input.provider !== "bog") return { ok: false, code: "not_bog" };
  if (!input.providerOrderId?.trim()) return { ok: false, code: "missing_provider_id" };
  if (!isRefundablePaymentStatus(input.paymentStatus)) {
    return { ok: false, code: input.paymentStatus === "refunded" ? "already_refunded" : "not_refundable_status" };
  }

  const remainingTetri = remainingRefundableTetri(input);
  if (remainingTetri <= 0) {
    const confirmed = confirmedRefundedTetri(input);
    const processed = moneyToTetri(input.paymentAmount);
    if (confirmed >= processed || input.paymentStatus === "refunded") {
      return { ok: false, code: "already_refunded" };
    }
    return { ok: false, code: "in_flight" };
  }

  if (input.kind === "full") {
    return {
      ok: true,
      amount: tetriToMoney(remainingTetri),
      remaining: tetriToMoney(remainingTetri),
      remainingTetri,
    };
  }

  if (!supportsPartialRefund(input.paymentMethod)) {
    return { ok: false, code: "method_no_partial" };
  }

  const parsed = parseRefundAmountInput(input.partialAmountRaw ?? "");
  if (!parsed.ok) return parsed;
  const requestedTetri = moneyToTetri(parsed.amount);
  if (requestedTetri > remainingTetri) return { ok: false, code: "exceeds_remaining" };

  return {
    ok: true,
    amount: parsed.amount,
    remaining: tetriToMoney(remainingTetri),
    remainingTetri,
  };
}

export const REFUND_EVALUATION_MESSAGE: Record<RefundEvaluationFail["code"], string> = {
  not_bog: "დაბრუნება მხოლოდ საქართველოს ბანკის გადახდაზეა შესაძლებელი.",
  missing_provider_id: "ამ გადახდაზე BOG იდენტიფიკატორი არ არის.",
  not_refundable_status: "დაბრუნება შესაძლებელია მხოლოდ წარმატებულ გადახდაზე.",
  already_refunded: "თანხა უკვე სრულად დაბრუნებულია.",
  in_flight: "თანხის დაბრუნება უკვე მუშავდება.",
  invalid_amount: "შეიყვანეთ ვალიდური თანხა.",
  zero_amount: "დასაბრუნებელი თანხა უნდა იყოს ნულზე მეტი.",
  exceeds_remaining: "დასაბრუნებელი თანხა აღემატება დარჩენილ თანხას.",
  method_no_partial: "ნაწილობრივი დაბრუნება ამ გადახდის მეთოდზე არ არის მხარდაჭერილი.",
};

export function customerRefundSnapshot(
  payments: Array<{
    status: string;
    amount?: Prisma.Decimal | string | number;
    providerRefundAmount?: Prisma.Decimal | string | number | null;
    refunds?: Array<{ status: string; amount: Prisma.Decimal | string | number }>;
  }>,
): { refundInProgress: boolean; refundedAmount: number | null } {
  const refunds = payments.flatMap((payment) => payment.refunds ?? []);
  const refundInProgress = refunds.some((row) => isInFlightRefundStatus(row.status));
  const confirmed = payments.reduce((sum, payment) => {
    return (
      sum +
      confirmedRefundedTetri({
        refunds: payment.refunds ?? [],
        providerRefundAmount: payment.providerRefundAmount,
      })
    );
  }, 0);
  return {
    refundInProgress,
    refundedAmount: confirmed > 0 ? tetriToNumber(confirmed) : null,
  };
}

function parseKind(value: unknown): RefundKind | null {
  return value === "full" || value === "partial" ? value : null;
}

export function parseAdminRefundInput(input: unknown): {
  paymentId: string;
  kind: RefundKind;
  amountRaw?: string;
  adminNote?: string;
} | { error: string } {
  if (!input || typeof input !== "object") return { error: "არასწორი მოთხოვნა" };
  const record = input as {
    paymentId?: unknown;
    kind?: unknown;
    amount?: unknown;
    adminNote?: unknown;
  };
  const paymentId = typeof record.paymentId === "string" ? record.paymentId.trim() : "";
  const kind = parseKind(record.kind);
  if (!paymentId) return { error: "გადახდა ვერ მოიძებნა" };
  if (!kind) return { error: "აირჩიეთ სრული ან ნაწილობრივი დაბრუნება." };
  const amountRaw = typeof record.amount === "string" ? record.amount : undefined;
  const adminNote = typeof record.adminNote === "string" ? record.adminNote : undefined;
  if (kind === "partial" && !amountRaw?.trim()) return { error: REFUND_EVALUATION_MESSAGE.invalid_amount };
  return { paymentId, kind, amountRaw, adminNote };
}
