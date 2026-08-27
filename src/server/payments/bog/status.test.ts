import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveOrderPaymentStatus,
  mapBogStatusToAttempt,
  shouldApplyAttemptStatus,
} from "./status";

describe("mapBogStatusToAttempt", () => {
  it("maps documented provider keys", () => {
    assert.equal(mapBogStatusToAttempt("created"), "pending");
    assert.equal(mapBogStatusToAttempt("processing"), "processing");
    assert.equal(mapBogStatusToAttempt("completed"), "paid");
    assert.equal(mapBogStatusToAttempt("rejected"), "failed");
    assert.equal(mapBogStatusToAttempt("refund_requested"), "processing");
    assert.equal(mapBogStatusToAttempt("refunded"), "refunded");
    assert.equal(mapBogStatusToAttempt("refunded_partially"), "partially_refunded");
  });
});

describe("shouldApplyAttemptStatus", () => {
  it("does not let a paid attempt become failed", () => {
    assert.equal(shouldApplyAttemptStatus("paid", "failed"), false);
    assert.equal(shouldApplyAttemptStatus("paid", "paid"), true);
    assert.equal(shouldApplyAttemptStatus("failed", "paid"), true);
  });

  it("lets paid become refunded or partially refunded, but not processing", () => {
    assert.equal(shouldApplyAttemptStatus("paid", "refunded"), true);
    assert.equal(shouldApplyAttemptStatus("paid", "partially_refunded"), true);
    assert.equal(shouldApplyAttemptStatus("paid", "processing"), false);
    assert.equal(shouldApplyAttemptStatus("refunded", "paid"), false);
  });
});

describe("deriveOrderPaymentStatus", () => {
  it("prefers refunded over paid and partial", () => {
    assert.equal(
      deriveOrderPaymentStatus([{ status: "paid" }, { status: "partially_refunded" }]),
      "partially_refunded",
    );
    assert.equal(
      deriveOrderPaymentStatus([{ status: "partially_refunded" }, { status: "refunded" }]),
      "refunded",
    );
  });

  it("uses the latest failed/pending when nothing is paid", () => {
    assert.equal(deriveOrderPaymentStatus([{ status: "failed" }]), "failed");
    assert.equal(deriveOrderPaymentStatus([{ status: "pending" }]), "pending");
    assert.equal(deriveOrderPaymentStatus([]), "unpaid");
  });
});
