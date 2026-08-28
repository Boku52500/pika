import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCartTotal } from "./cart";
import {
  bogCalculatorBnplFlag,
  visibleCheckoutPaymentMethods,
  type PublicCheckoutCapabilities,
} from "./checkout";

const capsOff: PublicCheckoutCapabilities = {
  card: true,
  hostedGooglePay: false,
  externalGooglePay: false,
  externalApplePay: false,
  bogLoan: false,
  bnpl: false,
  savedCard: false,
  saveCardRecurrent: false,
  googlePay: null,
  bogClientId: null,
};

describe("visibleCheckoutPaymentMethods", () => {
  it("keeps card and cash when BOG calculator flags are off", () => {
    assert.deepEqual(
      visibleCheckoutPaymentMethods(capsOff).map((method) => method.id),
      ["card", "cash-on-delivery"],
    );
  });

  it("adds ნაწილ-ნაწილ and განვადება independently of each other", () => {
    assert.deepEqual(
      visibleCheckoutPaymentMethods({ ...capsOff, bnpl: true }).map((method) => method.id),
      ["card", "bnpl", "cash-on-delivery"],
    );
    assert.deepEqual(
      visibleCheckoutPaymentMethods({ ...capsOff, bogLoan: true }).map((method) => method.id),
      ["card", "bog_loan", "cash-on-delivery"],
    );
  });

  it("shows all four production checkout options when BNPL and installment flags are on", () => {
    assert.deepEqual(
      visibleCheckoutPaymentMethods({ ...capsOff, bnpl: true, bogLoan: true }).map((method) => method.id),
      ["card", "bnpl", "bog_loan", "cash-on-delivery"],
    );
  });

  it("does not add Google Pay or Apple Pay checkout buttons", () => {
    const ids = visibleCheckoutPaymentMethods({
      ...capsOff,
      externalGooglePay: true,
      externalApplePay: true,
      hostedGooglePay: true,
      bnpl: true,
      bogLoan: true,
    }).map((method) => method.id);
    assert.equal(ids.includes("google_pay"), false);
    assert.equal(ids.includes("apple_pay"), false);
    assert.deepEqual(ids, ["card", "bnpl", "bog_loan", "cash-on-delivery"]);
  });

  it("does not enable financing from unrelated BOG wallet flags", () => {
    assert.deepEqual(
      visibleCheckoutPaymentMethods({
        ...capsOff,
        hostedGooglePay: true,
        externalGooglePay: true,
        externalApplePay: true,
      }).map((method) => method.id),
      ["card", "cash-on-delivery"],
    );
  });
});

describe("bogCalculatorBnplFlag", () => {
  it("opens only payment-in-installments for ნაწილ-ნაწილ and only standard loan for განვადება", () => {
    assert.equal(bogCalculatorBnplFlag("bnpl"), true);
    assert.equal(bogCalculatorBnplFlag("bog_loan"), false);
  });
});

describe("checkout total passed to the BOG calculator", () => {
  it("is a finite GEL number for integer, decimal, and discounted carts", () => {
    assert.equal(getCartTotal(100, 0, 0), 100);
    assert.equal(typeof getCartTotal(100, 0, 0), "number");
    assert.equal(getCartTotal(50, 0, 9.9), 59.9);
    assert.equal(getCartTotal(100, 9.9, 0), 90.1);
    assert.equal(Number.isFinite(getCartTotal(249.99, 10, 0)), true);
  });
});
