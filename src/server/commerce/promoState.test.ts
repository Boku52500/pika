import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planPromoTransition, promoLimitAllows } from "./promoState";

describe("planPromoTransition", () => {
  it("holds a card claim without incrementing usedCount", () => {
    assert.deepEqual(planPromoTransition(null, "place_card"), { status: "held", usedCount: "none" });
  });

  it("consumes cash/installment immediately (existing behavior)", () => {
    assert.deepEqual(planPromoTransition(null, "place_immediate"), { status: "consumed", usedCount: "increment" });
  });

  it("increments usedCount only on the first PAID from a hold", () => {
    assert.deepEqual(planPromoTransition("held", "paid"), { status: "consumed", usedCount: "increment" });
    assert.deepEqual(planPromoTransition("consumed", "paid"), { status: "consumed", usedCount: "none" });
  });

  it("releases an unpaid card hold without decrementing usedCount", () => {
    assert.deepEqual(planPromoTransition("held", "unpaid_terminal"), { status: "released", usedCount: "none" });
    assert.deepEqual(planPromoTransition("released", "unpaid_terminal"), { status: "released", usedCount: "none" });
  });

  it("does not un-consume cash on cancel", () => {
    assert.deepEqual(planPromoTransition("consumed", "unpaid_terminal"), { status: "consumed", usedCount: "none" });
  });
});

describe("promoLimitAllows", () => {
  it("counts held plus consumed against usageLimit", () => {
    assert.equal(promoLimitAllows(0, 1), true);
    assert.equal(promoLimitAllows(1, 1), false);
    assert.equal(promoLimitAllows(5, null), true);
  });

  it("rejects a second concurrent card hold when the limit is 1", () => {
    let active = 0;
    const limit = 1;
    function placeCard(): boolean {
      if (!promoLimitAllows(active, limit)) return false;
      active += 1;
      return true;
    }
    assert.equal(placeCard(), true);
    assert.equal(placeCard(), false);
    active -= 1;
    assert.equal(placeCard(), true);
  });
});
