import { Prisma } from "@/generated/prisma/client";
import { moneyToNumber } from "@/server/money";
import { isSplitCompatibleMethod } from "@/server/payments/methods";

export const BOG_SPLIT_MAX_ENTRIES = 10;
export const BOG_SPLIT_CURRENCY = "GEL";

export type BogSplitEntryInput = {
  iban: string;
  amount?: number | string | Prisma.Decimal | null;
  percent?: number | string | null;
  description?: string | null;
};

export type BogSplitConfig = {
  split_payments: Array<{
    iban: string;
    amount?: number;
    percent?: number;
    description?: string;
  }>;
};

export type SplitValidationFail = {
  ok: false;
  code:
    | "empty"
    | "too_many"
    | "iban_required"
    | "amount_and_percent"
    | "missing_amount_or_percent"
    | "invalid_amount"
    | "invalid_percent"
    | "percent_sum"
    | "amount_sum"
    | "currency"
    | "method_incompatible";
  message: string;
};

export type SplitValidationOk = { ok: true; config: BogSplitConfig };

const IBAN_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i;

export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function validateBogSplitPayments(input: {
  entries: BogSplitEntryInput[];
  currency?: string;
  paymentMethod?: string | null;
  captureAmount?: number | null;
}): SplitValidationOk | SplitValidationFail {
  if (input.currency && input.currency.toUpperCase() !== BOG_SPLIT_CURRENCY) {
    return { ok: false, code: "currency", message: "Split payment is documented for GEL only." };
  }
  if (input.paymentMethod && !isSplitCompatibleMethod(input.paymentMethod)) {
    return {
      ok: false,
      code: "method_incompatible",
      message: "Split is not executed for this payment method; funds stay on the main account.",
    };
  }
  if (input.entries.length === 0) {
    return { ok: false, code: "empty", message: "Split requires at least one destination." };
  }
  if (input.entries.length > BOG_SPLIT_MAX_ENTRIES) {
    return { ok: false, code: "too_many", message: `Split supports at most ${BOG_SPLIT_MAX_ENTRIES} parts.` };
  }

  const split_payments: BogSplitConfig["split_payments"] = [];
  let percentSum = 0;
  let amountSum = 0;
  let usedPercent = false;
  let usedAmount = false;

  for (const entry of input.entries) {
    const iban = normalizeIban(entry.iban ?? "");
    if (!iban || !IBAN_RE.test(iban)) {
      return { ok: false, code: "iban_required", message: "Each split destination needs a valid IBAN." };
    }
    const hasAmount = entry.amount != null && entry.amount !== "";
    const hasPercent = entry.percent != null && entry.percent !== "";
    if (hasAmount && hasPercent) {
      return { ok: false, code: "amount_and_percent", message: "A split entry cannot include both amount and percent." };
    }
    if (!hasAmount && !hasPercent) {
      return { ok: false, code: "missing_amount_or_percent", message: "A split entry must include amount or percent." };
    }
    const row: BogSplitConfig["split_payments"][number] = { iban };
    if (entry.description?.trim()) row.description = entry.description.trim().slice(0, 200);

    if (hasAmount) {
      usedAmount = true;
      const amount = moneyToNumber(entry.amount as Prisma.Decimal | string | number);
      if (!Number.isFinite(amount) || amount <= 0) {
        return { ok: false, code: "invalid_amount", message: "Split amounts must be positive." };
      }
      row.amount = amount;
      amountSum += amount;
    } else {
      usedPercent = true;
      const percent = Number(entry.percent);
      if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
        return { ok: false, code: "invalid_percent", message: "Split percent must be an integer from 1 to 100." };
      }
      row.percent = percent;
      percentSum += percent;
    }
    split_payments.push(row);
  }

  if (usedPercent && percentSum > 100) {
    return { ok: false, code: "percent_sum", message: "Split percents must not exceed 100." };
  }
  if (usedAmount && input.captureAmount != null && amountSum > input.captureAmount + 0.0001) {
    return { ok: false, code: "amount_sum", message: "Split amounts must not exceed the capture amount." };
  }

  return { ok: true, config: { split_payments } };
}

export function parseSplitRecipientsEnv(raw: string | null | undefined): BogSplitEntryInput[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const record = row as { iban?: unknown; amount?: unknown; percent?: unknown; description?: unknown };
      if (typeof record.iban !== "string") return [];
      return [
        {
          iban: record.iban,
          amount: typeof record.amount === "number" || typeof record.amount === "string" ? record.amount : null,
          percent: typeof record.percent === "number" || typeof record.percent === "string" ? record.percent : null,
          description: typeof record.description === "string" ? record.description : null,
        },
      ];
    });
  } catch {
    return [];
  }
}
