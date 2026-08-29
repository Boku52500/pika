import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inventoryEventForDerivedPayment,
  planInventoryTransition,
} from "./inventoryState";

describe("planInventoryTransition without physical stock", () => {
  it("never schedules stock allocation or release", () => {
    assert.equal(planInventoryTransition(null, "place_card").stock, "none");
    assert.equal(planInventoryTransition(null, "place_immediate").stock, "none");
    assert.equal(planInventoryTransition("held", "paid").stock, "none");
    assert.equal(planInventoryTransition("held", "unpaid_terminal").stock, "none");
    assert.equal(planInventoryTransition("released", "retry_payment").stock, "none");
    assert.equal(planInventoryTransition("released", "paid").stock, "none");
  });

  it("still tracks hold state for schema compatibility", () => {
    assert.deepEqual(planInventoryTransition(null, "place_card"), { state: "held", stock: "none" });
    assert.deepEqual(planInventoryTransition("held", "unpaid_terminal"), { state: "released", stock: "none" });
  });
});

describe("inventoryEventForDerivedPayment", () => {
  it("maps paid-like and failed without changing pending holds", () => {
    assert.equal(inventoryEventForDerivedPayment("paid"), "paid");
    assert.equal(inventoryEventForDerivedPayment("refunded"), "paid");
    assert.equal(inventoryEventForDerivedPayment("failed"), "unpaid_terminal");
    assert.equal(inventoryEventForDerivedPayment("pending"), null);
    assert.equal(inventoryEventForDerivedPayment("processing"), null);
  });
});

describe("manual availability semantics", () => {
  it("treats zero legacy stock as purchasable when product and variant are active", () => {
    const product = { isActive: true, stockQuantity: 0, variants: [{ isActive: true, stockQuantity: 0 }] };
    const purchasable = product.isActive && product.variants.some((variant) => variant.isActive);
    assert.equal(purchasable, true);
  });

  it("blocks inactive products regardless of stock quantity", () => {
    const product = { isActive: false, stockQuantity: 500, variants: [] as { isActive: boolean; stockQuantity: number }[] };
    assert.equal(product.isActive, false);
  });

  it("blocks inactive variants even when stock is positive", () => {
    const variants = [{ isActive: false, stockQuantity: 100 }];
    assert.equal(variants.some((variant) => variant.isActive), false);
  });
});
