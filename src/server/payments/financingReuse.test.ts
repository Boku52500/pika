import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canReuseBogPaymentAttempt,
  financingCheckoutReuseDecision,
  overlayIncompatibleFinancingPlan,
} from "./financingReuse";

const bnplTerms = { month: 4, type: "BNPL" };
const loan12 = { month: 12, type: "ZERO" };
const loan6 = { month: 6, type: "ZERO" };

function pendingPayment(input: {
  method: string;
  loanMonth: number;
  loanDiscountCode: string;
  providerOrderId?: string | null;
}) {
  return {
    method: input.method,
    loanMonth: input.loanMonth,
    loanDiscountCode: input.loanDiscountCode,
    status: "pending",
    providerOrderId: input.providerOrderId === undefined ? "bog-provider-1" : input.providerOrderId,
  };
}

describe("canReuseBogPaymentAttempt", () => {
  it("reuses identical BNPL and identical installment terms", () => {
    assert.equal(
      canReuseBogPaymentAttempt(
        { method: "bnpl", loanMonth: 4, loanDiscountCode: "BNPL" },
        { method: "bnpl", loan: bnplTerms },
      ),
      true,
    );
    assert.equal(
      canReuseBogPaymentAttempt(
        { method: "bog_loan", loanMonth: 12, loanDiscountCode: "ZERO" },
        { method: "bog_loan", loan: loan12 },
      ),
      true,
    );
  });

  it("does not reuse BNPL for standard installment or the reverse", () => {
    assert.equal(
      canReuseBogPaymentAttempt(
        { method: "bnpl", loanMonth: 4, loanDiscountCode: "BNPL" },
        { method: "bog_loan", loan: loan12 },
      ),
      false,
    );
    assert.equal(
      canReuseBogPaymentAttempt(
        { method: "bog_loan", loanMonth: 12, loanDiscountCode: "ZERO" },
        { method: "bnpl", loan: bnplTerms },
      ),
      false,
    );
  });

  it("does not reuse installment when the month or discount code changed", () => {
    assert.equal(
      canReuseBogPaymentAttempt(
        { method: "bog_loan", loanMonth: 12, loanDiscountCode: "ZERO" },
        { method: "bog_loan", loan: loan6 },
      ),
      false,
    );
    assert.equal(
      canReuseBogPaymentAttempt(
        { method: "bog_loan", loanMonth: 12, loanDiscountCode: "ZERO" },
        { method: "bog_loan", loan: { month: 12, type: "NOW" } },
      ),
      false,
    );
  });

  it("leaves card retries reusable and does not send card into a BNPL provider order", () => {
    assert.equal(
      canReuseBogPaymentAttempt(
        { method: "card", loanMonth: null, loanDiscountCode: null },
        { method: "card" },
      ),
      true,
    );
    assert.equal(
      canReuseBogPaymentAttempt(
        { method: "bnpl", loanMonth: 4, loanDiscountCode: "BNPL" },
        { method: "card" },
      ),
      false,
    );
  });
});

describe("overlayIncompatibleFinancingPlan", () => {
  const bnplAttempt = { method: "bnpl", loanMonth: 4, loanDiscountCode: "BNPL" };

  it("keeps reuse / wait / retry-same when financing terms still match", () => {
    const reuse = overlayIncompatibleFinancingPlan(
      { kind: "reuse" as const, redirectUrl: "https://example.test/pay", providerOrderId: "p1" },
      bnplAttempt,
      { method: "bnpl", loan: bnplTerms },
    );
    assert.equal(reuse?.kind, "reuse");

    const retry = overlayIncompatibleFinancingPlan(
      { kind: "retry-same" as const, paymentId: "pay-1", idempotencyKey: "key-1" },
      bnplAttempt,
      { method: "bnpl", loan: bnplTerms },
    );
    assert.equal(retry?.kind, "retry-same");
  });

  it("forces a new Payment when the unpaid provider order is a different financing product", () => {
    const fromReuse = overlayIncompatibleFinancingPlan(
      { kind: "reuse" as const, redirectUrl: "https://example.test/pay", providerOrderId: "p1" },
      bnplAttempt,
      { method: "bog_loan", loan: loan12 },
    );
    assert.deepEqual(fromReuse, { kind: "new" });

    const fromWait = overlayIncompatibleFinancingPlan(
      { kind: "wait" as const, providerOrderId: "p1" },
      bnplAttempt,
      { method: "bog_loan", loan: loan12 },
    );
    assert.deepEqual(fromWait, { kind: "new" });

    const fromRetry = overlayIncompatibleFinancingPlan(
      { kind: "retry-same" as const, paymentId: "pay-1", idempotencyKey: "key-1" },
      { method: "bog_loan", loanMonth: 12, loanDiscountCode: "ZERO" },
      { method: "bog_loan", loan: loan6 },
    );
    assert.deepEqual(fromRetry, { kind: "new" });
  });

  it("does not override an already-paid attempt", () => {
    const paid = overlayIncompatibleFinancingPlan(
      { kind: "paid" as const },
      bnplAttempt,
      { method: "bog_loan", loan: loan12 },
    );
    assert.equal(paid?.kind, "paid");
  });
});

describe("financingCheckoutReuseDecision", () => {
  it("A: BNPL cancel then BNPL with identical terms reuses Order, Payment, and provider order", () => {
    assert.deepEqual(
      financingCheckoutReuseDecision({
        existingUnpaidMerchantOrder: true,
        latestPayment: pendingPayment({
          method: "bnpl",
          loanMonth: 4,
          loanDiscountCode: "BNPL",
        }),
        requested: { method: "bnpl", loan: bnplTerms },
      }),
      { merchantOrder: "reuse", paymentAttempt: "reuse", providerOrder: "reuse" },
    );
  });

  it("B: BNPL cancel then standard installment reuses the merchant Order only", () => {
    assert.deepEqual(
      financingCheckoutReuseDecision({
        existingUnpaidMerchantOrder: true,
        latestPayment: pendingPayment({
          method: "bnpl",
          loanMonth: 4,
          loanDiscountCode: "BNPL",
        }),
        requested: { method: "bog_loan", loan: loan12 },
      }),
      { merchantOrder: "reuse", paymentAttempt: "new", providerOrder: "new" },
    );
  });

  it("C: standard installment cancel then BNPL reuses the merchant Order only", () => {
    assert.deepEqual(
      financingCheckoutReuseDecision({
        existingUnpaidMerchantOrder: true,
        latestPayment: pendingPayment({
          method: "bog_loan",
          loanMonth: 12,
          loanDiscountCode: "ZERO",
        }),
        requested: { method: "bnpl", loan: bnplTerms },
      }),
      { merchantOrder: "reuse", paymentAttempt: "new", providerOrder: "new" },
    );
  });

  it("D: installment cancel then a different month reuses the merchant Order only", () => {
    assert.deepEqual(
      financingCheckoutReuseDecision({
        existingUnpaidMerchantOrder: true,
        latestPayment: pendingPayment({
          method: "bog_loan",
          loanMonth: 12,
          loanDiscountCode: "ZERO",
        }),
        requested: { method: "bog_loan", loan: loan6 },
      }),
      { merchantOrder: "reuse", paymentAttempt: "new", providerOrder: "new" },
    );
  });

  it("E: installment retry with identical method and loan terms reuses all three", () => {
    assert.deepEqual(
      financingCheckoutReuseDecision({
        existingUnpaidMerchantOrder: true,
        latestPayment: pendingPayment({
          method: "bog_loan",
          loanMonth: 12,
          loanDiscountCode: "ZERO",
        }),
        requested: { method: "bog_loan", loan: loan12 },
      }),
      { merchantOrder: "reuse", paymentAttempt: "reuse", providerOrder: "reuse" },
    );
  });

  it("F: repeated onRequest with identical selection reuses Order and Payment; provider only if it already exists", () => {
    assert.deepEqual(
      financingCheckoutReuseDecision({
        existingUnpaidMerchantOrder: true,
        latestPayment: pendingPayment({
          method: "bog_loan",
          loanMonth: 12,
          loanDiscountCode: "ZERO",
        }),
        requested: { method: "bog_loan", loan: loan12 },
      }),
      { merchantOrder: "reuse", paymentAttempt: "reuse", providerOrder: "reuse" },
    );
    assert.deepEqual(
      financingCheckoutReuseDecision({
        existingUnpaidMerchantOrder: true,
        latestPayment: pendingPayment({
          method: "bog_loan",
          loanMonth: 12,
          loanDiscountCode: "ZERO",
          providerOrderId: null,
        }),
        requested: { method: "bog_loan", loan: loan12 },
      }),
      { merchantOrder: "reuse", paymentAttempt: "reuse", providerOrder: "new" },
    );
  });
});
