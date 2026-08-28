import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inventoryEventForDerivedPayment,
  planInventoryTransition,
} from "./inventoryState";

describe("planInventoryTransition", () => {
  it("allocates a hold for card placement and commits cash immediately", () => {
    assert.deepEqual(planInventoryTransition(null, "place_card"), { state: "held", stock: "allocate" });
    assert.deepEqual(planInventoryTransition(null, "place_immediate"), { state: "committed", stock: "allocate" });
  });

  it("commits a hold on PAID without a second stock mutation", () => {
    assert.deepEqual(planInventoryTransition("held", "paid"), { state: "committed", stock: "none" });
  });

  it("releases held stock on unpaid terminal (failed / cancel) once", () => {
    assert.deepEqual(planInventoryTransition("held", "unpaid_terminal"), { state: "released", stock: "release" });
    assert.deepEqual(planInventoryTransition("released", "unpaid_terminal"), { state: "released", stock: "none" });
    assert.deepEqual(planInventoryTransition("committed", "unpaid_terminal"), { state: "committed", stock: "none" });
  });

  it("does not release committed cash/installment stock on cancel", () => {
    assert.deepEqual(planInventoryTransition("committed", "unpaid_terminal"), { state: "committed", stock: "none" });
  });

  it("re-allocates on payment retry after a failed/abandoned release", () => {
    assert.deepEqual(planInventoryTransition("released", "retry_payment"), { state: "held", stock: "allocate" });
    assert.deepEqual(planInventoryTransition("held", "retry_payment"), { state: "held", stock: "none" });
  });

  it("re-allocates if PAID arrives after a failed release", () => {
    assert.deepEqual(planInventoryTransition("released", "paid"), { state: "committed", stock: "allocate" });
  });

  it("is idempotent on duplicate PAID", () => {
    assert.deepEqual(planInventoryTransition("committed", "paid"), { state: "committed", stock: "none" });
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

describe("stock ledger simulation", () => {
  it("concurrent allocate against one unit: only the first succeeds", () => {
    let stock = 1;
    function allocate(qty: number): boolean {
      if (stock < qty) return false;
      stock -= qty;
      return true;
    }
    assert.equal(allocate(1), true);
    assert.equal(allocate(1), false);
    assert.equal(stock, 0);
  });

  it("failed then retry then paid does not leak stock", () => {
    let stock = 2;
    let state: "held" | "committed" | "released" | null = null;
    function apply(event: Parameters<typeof planInventoryTransition>[1], qty = 1) {
      const plan = planInventoryTransition(state, event);
      if (plan.stock === "allocate") {
        assert.ok(stock >= qty);
        stock -= qty;
      }
      if (plan.stock === "release") stock += qty;
      state = plan.state;
    }
    apply("place_card");
    assert.equal(stock, 1);
    apply("unpaid_terminal");
    assert.equal(stock, 2);
    apply("unpaid_terminal");
    assert.equal(stock, 2);
    apply("retry_payment");
    assert.equal(stock, 1);
    apply("paid");
    apply("paid");
    assert.equal(stock, 1);
    assert.equal(state, "committed");
  });
});
