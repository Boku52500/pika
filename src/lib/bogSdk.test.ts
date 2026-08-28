import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOG_API_ORIGIN,
  BOG_INSTALLMENT_ORIGIN,
  BOG_WEBSTATIC_ORIGIN,
  bogCalculatorCspSources,
  bogCalculatorLoanFromSdkSelection,
  bogCalculatorScriptUrl,
  resolveBogCreateOrderLoan,
  bogCalculatorUserMessage,
  isBogCalculatorCancelled,
  isValidBogCalculatorAmount,
  BOG_CALCULATOR_OPEN_OPTION_KEYS,
} from "./bogSdk";

describe("bogCalculatorUserMessage", () => {
  it("does not show the internal SDK error until load has actually failed", () => {
    assert.equal(
      bogCalculatorUserMessage(new Error("BOG calculator is unavailable")),
      "საქართველოს ბანკის კალკულატორი ვერ ჩაიტვირთა. სცადეთ თავიდან.",
    );
    assert.equal(
      bogCalculatorUserMessage(new Error("BOG SDK failed")),
      "საქართველოს ბანკის კალკულატორი ვერ ჩაიტვირთა. სცადეთ თავიდან.",
    );
    assert.equal(isBogCalculatorCancelled(new Error("closed")), true);
  });
});

describe("bogCalculatorScriptUrl", () => {
  it("builds the official SDK URL with public client_id and no secret or version selector", () => {
    const url = new URL(bogCalculatorScriptUrl("example-client"));
    assert.equal(url.origin, BOG_WEBSTATIC_ORIGIN);
    assert.equal(url.pathname, "/bog-sdk/bog-sdk.js");
    assert.equal(url.searchParams.get("client_id"), "example-client");
    assert.equal(url.searchParams.has("version"), false);
    assert.equal(url.searchParams.has("client_secret"), false);
    assert.doesNotMatch(url.href, /secret/i);
  });

  it("encodes client_id without injecting a secret", () => {
    const url = new URL(bogCalculatorScriptUrl("id with space"));
    assert.equal(url.searchParams.get("client_id"), "id with space");
    assert.equal(url.href.includes(" "), false);
    assert.equal(url.searchParams.has("version"), false);
  });
});

describe("isValidBogCalculatorAmount", () => {
  it("accepts GEL order totals and rejects non-positive or non-finite values", () => {
    assert.equal(isValidBogCalculatorAmount(100), true);
    assert.equal(isValidBogCalculatorAmount(59.9), true);
    assert.equal(isValidBogCalculatorAmount(90.1), true);
    assert.equal(isValidBogCalculatorAmount(0), false);
    assert.equal(isValidBogCalculatorAmount(-1), false);
    assert.equal(isValidBogCalculatorAmount(Number.NaN), false);
    assert.equal(isValidBogCalculatorAmount(Number.POSITIVE_INFINITY), false);
  });
});

describe("bogCalculatorLoanFromSdkSelection", () => {
  it("maps SDK month and discount_code to official config.loan month/type", () => {
    assert.deepEqual(bogCalculatorLoanFromSdkSelection({ month: 12, discount_code: "ZERO" }), {
      month: 12,
      type: "ZERO",
    });
    assert.deepEqual(bogCalculatorLoanFromSdkSelection({ month: 4, discount_code: "BNPL" }), {
      month: 4,
      type: "BNPL",
    });
  });
});

describe("resolveBogCreateOrderLoan", () => {
  it("keeps stored loan terms when a duplicate checkout replay omits the calculator payload", () => {
    assert.deepEqual(
      resolveBogCreateOrderLoan({
        fromCalculator: { month: 6, type: "NOW" },
        storedMonth: 12,
        storedType: "OLD",
      }),
      { month: 6, type: "NOW" },
    );
    assert.deepEqual(
      resolveBogCreateOrderLoan({ storedMonth: 12, storedType: "ZERO" }),
      { month: 12, type: "ZERO" },
    );
    assert.equal(resolveBogCreateOrderLoan({ storedMonth: 12, storedType: null }), undefined);
  });
});

describe("BOG_CALCULATOR_OPEN_OPTION_KEYS", () => {
  it("sends only the documented Calculator.open options", () => {
    assert.deepEqual([...BOG_CALCULATOR_OPEN_OPTION_KEYS], [
      "amount",
      "bnpl",
      "onClose",
      "onRequest",
      "onComplete",
    ]);
  });
});

describe("bogCalculatorCspSources", () => {
  it("allows the official SDK host and v1 calculator origins", () => {
    const csp = bogCalculatorCspSources();
    assert.equal(csp.scriptSrc.includes(BOG_WEBSTATIC_ORIGIN), true);
    assert.equal(csp.connectSrc.includes(BOG_INSTALLMENT_ORIGIN), true);
    assert.equal(csp.frameSrc.includes(BOG_INSTALLMENT_ORIGIN), true);
    assert.equal(csp.connectSrc.includes(BOG_API_ORIGIN), true);
    assert.equal(csp.scriptSrc.some((src) => src.includes("*")), false);
  });
});
