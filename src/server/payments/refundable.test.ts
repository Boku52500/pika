import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@/generated/prisma/client";
import {
  evaluateRefundRequest,
  parseAdminRefundInput,
  remainingRefundableTetri,
} from "./refundable";

const paidBase = {
  provider: "bog",
  providerOrderId: "bog-order-1",
  paymentStatus: "paid",
  paymentMethod: "card",
  paymentAmount: "100.00",
  refunds: [] as Array<{ amount: string; status: string }>,
};

describe("remainingRefundableTetri", () => {
  it("subtracts confirmed and in-flight refunds from the processed payment", () => {
    assert.equal(
      remainingRefundableTetri({
        paymentAmount: "100.00",
        paymentStatus: "paid",
        refunds: [
          { amount: "10.50", status: "completed" },
          { amount: "5.00", status: "processing" },
        ],
      }),
      8450,
    );
  });

  it("prefers the larger of local completed vs provider refund_amount", () => {
    assert.equal(
      remainingRefundableTetri({
        paymentAmount: "100.00",
        paymentStatus: "partially_refunded",
        refunds: [{ amount: "10.00", status: "completed" }],
        providerRefundAmount: "25.00",
      }),
      7500,
    );
  });

  it("is zero when the payment is fully refunded", () => {
    assert.equal(
      remainingRefundableTetri({
        paymentAmount: "100.00",
        paymentStatus: "refunded",
        refunds: [{ amount: "100.00", status: "completed" }],
      }),
      0,
    );
  });
});

describe("evaluateRefundRequest", () => {
  it("omits a new amount for a full refund and uses remaining", () => {
    const result = evaluateRefundRequest({ ...paidBase, kind: "full" });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.amount.equals(new Prisma.Decimal("100.00")), true);
  });

  it("accepts a partial GEL amount within remaining", () => {
    const result = evaluateRefundRequest({
      ...paidBase,
      kind: "partial",
      partialAmountRaw: "10.50",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.amount.equals(new Prisma.Decimal("10.50")), true);
  });

  it("rejects over-refund, zero, and negative/invalid amounts", () => {
    assert.equal(
      evaluateRefundRequest({ ...paidBase, kind: "partial", partialAmountRaw: "100.01" }).ok,
      false,
    );
    assert.equal(evaluateRefundRequest({ ...paidBase, kind: "partial", partialAmountRaw: "0" }).ok, false);
    assert.equal(evaluateRefundRequest({ ...paidBase, kind: "partial", partialAmountRaw: "-1" }).ok, false);
    assert.equal(evaluateRefundRequest({ ...paidBase, kind: "partial", partialAmountRaw: "10.123" }).ok, false);
  });

  it("rejects an already fully refunded payment", () => {
    const result = evaluateRefundRequest({
      ...paidBase,
      paymentStatus: "refunded",
      refunds: [{ amount: "100.00", status: "completed" }],
      kind: "full",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "already_refunded");
  });

  it("rejects a second concurrent partial that would exceed remaining", () => {
    const afterFirst = evaluateRefundRequest({
      ...paidBase,
      refunds: [{ amount: "60.00", status: "processing" }],
      kind: "partial",
      partialAmountRaw: "50.00",
    });
    assert.equal(afterFirst.ok, false);
    if (afterFirst.ok) return;
    assert.equal(afterFirst.code, "exceeds_remaining");
  });

  it("rejects a new refund when in-flight requests already reserve the remainder", () => {
    const result = evaluateRefundRequest({
      ...paidBase,
      refunds: [{ amount: "100.00", status: "requested" }],
      kind: "full",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "in_flight");
  });
});

describe("parseAdminRefundInput", () => {
  it("requires admin-shaped input and a kind", () => {
    const parsed = parseAdminRefundInput({ paymentId: "pay_1", kind: "partial", amount: "10.50" });
    assert.equal("error" in parsed, false);
    const denied = parseAdminRefundInput({ paymentId: "pay_1" });
    assert.equal("error" in denied, true);
  });
});
