import { Prisma } from "@/generated/prisma/client";
import { moneyToTetri } from "@/server/money";
import { parseBogAmount } from "@/server/payments/bog/payload";

export type RefundReconcileRow = {
  id: string;
  amount: Prisma.Decimal | string | number;
  status: string;
  providerActionId: string | null;
  createdAt: Date | string | number;
};

export type PlannedRefundUpdate = {
  id: string;
  status: "processing" | "completed" | "failed";
  providerStatus: string;
  completedAt: Date | null;
};

function isRefundAction(action: string | undefined): boolean {
  return action === "refund" || action === "partial_refund";
}

function createdAtMs(value: Date | string | number): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Map BOG Payment Details onto local PaymentRefund rows.
 * `request_received` is not an input here — only provider details / callback state.
 */
export function planRefundRowUpdates(input: {
  refunds: RefundReconcileRow[];
  providerStatus: string;
  providerRefundAmount?: Prisma.Decimal | string | number | null;
  actions?: Array<{ action_id: string; action?: string; status?: string; amount?: string }>;
  now?: Date;
}): PlannedRefundUpdate[] {
  const now = input.now ?? new Date();
  const providerStatus = input.providerStatus.toLowerCase();
  const open = input.refunds
    .filter((row) => row.status === "requested" || row.status === "processing")
    .slice()
    .sort((a, b) => createdAtMs(a.createdAt) - createdAtMs(b.createdAt));

  const byActionId = new Map<string, RefundReconcileRow>();
  for (const row of open) {
    if (row.providerActionId) byActionId.set(row.providerActionId, row);
  }

  const updates = new Map<string, PlannedRefundUpdate>();
  const claimed = new Set<string>();

  for (const action of input.actions ?? []) {
    if (!isRefundAction(action.action)) continue;
    const local = byActionId.get(action.action_id);
    if (!local) continue;
    claimed.add(local.id);
    if (action.status === "completed") {
      updates.set(local.id, {
        id: local.id,
        status: "completed",
        providerStatus,
        completedAt: now,
      });
    } else if (action.status === "rejected") {
      updates.set(local.id, {
        id: local.id,
        status: "failed",
        providerStatus: action.status,
        completedAt: null,
      });
    } else if (local.status === "requested") {
      updates.set(local.id, {
        id: local.id,
        status: "processing",
        providerStatus,
        completedAt: null,
      });
    }
  }

  if (providerStatus === "refund_requested") {
    for (const row of open) {
      if (claimed.has(row.id) || updates.has(row.id)) continue;
      if (row.status === "requested") {
        updates.set(row.id, {
          id: row.id,
          status: "processing",
          providerStatus,
          completedAt: null,
        });
      }
    }
    return [...updates.values()];
  }

  if (providerStatus === "refunded") {
    for (const row of open) {
      if (updates.get(row.id)?.status === "failed") continue;
      updates.set(row.id, {
        id: row.id,
        status: "completed",
        providerStatus,
        completedAt: now,
      });
    }
    return [...updates.values()];
  }

  if (providerStatus === "refunded_partially") {
    const completedTetri =
      input.refunds
        .filter((row) => row.status === "completed" || updates.get(row.id)?.status === "completed")
        .reduce((sum, row) => sum + moneyToTetri(row.amount), 0);
    const providerRefunded = input.providerRefundAmount == null || input.providerRefundAmount === ""
      ? null
      : moneyToTetri(input.providerRefundAmount);

    let leftover = providerRefunded == null ? 0 : Math.max(0, providerRefunded - completedTetri);

    for (const row of open) {
      if (updates.get(row.id)?.status === "completed" || updates.get(row.id)?.status === "failed") continue;
      const amount = moneyToTetri(row.amount);
      if (providerRefunded != null && leftover >= amount && amount > 0) {
        updates.set(row.id, {
          id: row.id,
          status: "completed",
          providerStatus,
          completedAt: now,
        });
        leftover -= amount;
      } else if (row.status === "requested") {
        updates.set(row.id, {
          id: row.id,
          status: "processing",
          providerStatus,
          completedAt: null,
        });
      }
    }
  }

  return [...updates.values()];
}

export function providerRefundAmountFromDetails(
  refundAmount: string | undefined,
): Prisma.Decimal | null {
  return parseBogAmount(refundAmount);
}
