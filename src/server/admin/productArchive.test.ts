import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isStorefrontVisible, productArchiveData, productRestoreData, storefrontProductWhere } from "./productArchive";

describe("product archive strategy", () => {
  it("soft-deletes without removing the product row or order snapshots", () => {
    const now = new Date("2026-08-28T12:00:00.000Z");
    const data = productArchiveData(now);
    assert.equal(data.deletedAt, now);
    assert.equal(data.isActive, false);
    assert.equal(data.isFeatured, false);
    assert.equal(data.isNew, false);
  });

  it("hides archived products from storefront queries even if isActive is stale", () => {
    assert.equal(isStorefrontVisible({ isActive: true, deletedAt: null }), true);
    assert.equal(isStorefrontVisible({ isActive: false, deletedAt: null }), false);
    assert.equal(isStorefrontVisible({ isActive: true, deletedAt: new Date() }), false);
    const where = storefrontProductWhere({ categoryId: "cat-1" });
    assert.equal(where.isActive, true);
    assert.equal(where.deletedAt, null);
    assert.equal(where.categoryId, "cat-1");
  });

  it("restore clears deletedAt so the product can return to the catalogue", () => {
    assert.deepEqual(productRestoreData(), { deletedAt: null, isActive: true });
  });
});
