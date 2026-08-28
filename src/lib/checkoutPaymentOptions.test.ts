import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
      bnpl: true,
      bogLoan: true,
    }).map((method) => method.id);
    assert.equal(ids.includes("google_pay"), false);
    assert.equal(ids.includes("apple_pay"), false);
  });
});

describe("bogCalculatorBnplFlag", () => {
  it("opens only payment-in-installments for ნაწილ-ნაწილ and only standard loan for განვადება", () => {
    assert.equal(bogCalculatorBnplFlag("bnpl"), true);
    assert.equal(bogCalculatorBnplFlag("bog_loan"), false);
  });
});
