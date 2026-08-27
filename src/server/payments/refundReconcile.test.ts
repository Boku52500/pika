import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planRefundRowUpdates } from "./refundReconcile";

const baseRefunds = [
  {
    id: "ref-1",
    amount: "10.50",
    status: "processing" as const,
    providerActionId: "action-1",
    createdAt: 1,
  },
];

describe("planRefundRowUpdates", () => {
  it("keeps refunds processing on refund_requested", () => {
    const updates = planRefundRowUpdates({
      refunds: [{ ...baseRefunds[0]!, status: "requested", providerActionId: null }],
      providerStatus: "refund_requested",
      providerRefundAmount: "0.0",
      now: new Date("2026-08-27T00:00:00Z"),
    });
    assert.equal(updates[0]?.status, "processing");
    assert.equal(updates[0]?.completedAt, null);
  });

  it("completes refunds when the provider reports refunded", () => {
    const updates = planRefundRowUpdates({
      refunds: baseRefunds,
      providerStatus: "refunded",
      providerRefundAmount: "10.50",
      now: new Date("2026-08-27T00:00:00Z"),
    });
    assert.equal(updates[0]?.status, "completed");
    assert.equal(updates[0]?.completedAt?.toISOString(), "2026-08-27T00:00:00.000Z");
  });

  it("completes matching partial refunds from refund_amount / action_id", () => {
    const updates = planRefundRowUpdates({
      refunds: baseRefunds,
      providerStatus: "refunded_partially",
      providerRefundAmount: "10.50",
      actions: [
        {
          action_id: "action-1",
          action: "partial_refund",
          status: "completed",
          amount: "10.50",
        },
      ],
      now: new Date("2026-08-27T00:00:00Z"),
    });
    assert.equal(updates[0]?.status, "completed");
  });

  it("does not complete from request_received — that key never reaches this planner", () => {
    const updates = planRefundRowUpdates({
      refunds: [{ ...baseRefunds[0]!, status: "requested" }],
      providerStatus: "completed",
      providerRefundAmount: "0.0",
    });
    assert.equal(updates.length, 0);
  });
});
