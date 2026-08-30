import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isManuallyPurchasable,
  resolveOrderVariant,
  variantMatchesSelection,
  type ResolvableVariant,
} from "./variantResolution";

function variant(id: string, axes: Array<[string, string]>): ResolvableVariant {
  return {
    id,
    options: axes.map(([attributeSlug, optionSlug]) => ({
      option: { slug: optionSlug, attribute: { slug: attributeSlug } },
    })),
  };
}

describe("resolveOrderVariant without numeric stock", () => {
  it("matches an explicit selection", () => {
    const variants = [
      variant("a", [["color", "black"]]),
      variant("b", [["color", "white"]]),
    ];
    const match = resolveOrderVariant(variants, [{ attributeSlug: "color", optionSlug: "white" }]);
    assert.equal(match?.id, "b");
  });

  it("falls back to the first active variant when selection is empty (stock=0 irrelevant)", () => {
    const variants = [variant("first", [["color", "black"]]), variant("second", [["color", "white"]])];
    const match = resolveOrderVariant(variants, []);
    assert.equal(match?.id, "first");
  });

  it("returns null when an explicit selection does not match", () => {
    const variants = [variant("a", [["color", "black"]])];
    const match = resolveOrderVariant(variants, [{ attributeSlug: "color", optionSlug: "red" }]);
    assert.equal(match, null);
  });

  it("returns null when the product has no variants", () => {
    assert.equal(resolveOrderVariant([], []), null);
  });
});

describe("variantMatchesSelection", () => {
  it("requires every variant axis to be present in the selection", () => {
    const row = variant("a", [
      ["color", "black"],
      ["storage", "128"],
    ]);
    assert.equal(
      variantMatchesSelection(row, [
        { attributeSlug: "color", optionSlug: "black" },
        { attributeSlug: "storage", optionSlug: "128" },
      ]),
      true,
    );
    assert.equal(variantMatchesSelection(row, [{ attributeSlug: "color", optionSlug: "black" }]), false);
  });
});

describe("financing eligibility uses manual availability, not stock", () => {
  it("allows BNPL when the product and variant are active even if stock is 0", () => {
    assert.equal(
      isManuallyPurchasable({ productActive: true, productDeleted: false, variantActive: true }),
      true,
    );
    assert.equal(resolveOrderVariant([variant("v1", [["color", "black"]])], [])?.id, "v1");
  });

  it("allows standard installment when the product and variant are active even if stock is 0", () => {
    assert.equal(
      isManuallyPurchasable({ productActive: true, productDeleted: false, variantActive: true }),
      true,
    );
    assert.equal(
      resolveOrderVariant([variant("v1", [["color", "black"]])], [
        { attributeSlug: "color", optionSlug: "black" },
      ])?.id,
      "v1",
    );
  });

  it("blocks financing when the selected variant is inactive (no active match)", () => {
    assert.equal(
      isManuallyPurchasable({ productActive: true, productDeleted: false, variantActive: false }),
      false,
    );
    assert.equal(resolveOrderVariant([], [{ attributeSlug: "color", optionSlug: "black" }]), null);
  });

  it("blocks financing when the product is archived or inactive", () => {
    assert.equal(
      isManuallyPurchasable({ productActive: false, productDeleted: false, variantActive: true }),
      false,
    );
    assert.equal(
      isManuallyPurchasable({ productActive: true, productDeleted: true, variantActive: true }),
      false,
    );
  });
});

describe("isManuallyPurchasable", () => {
  it("allows active product and active variant regardless of legacy stock", () => {
    assert.equal(
      isManuallyPurchasable({ productActive: true, productDeleted: false, variantActive: true }),
      true,
    );
  });

  it("blocks inactive variants", () => {
    assert.equal(
      isManuallyPurchasable({ productActive: true, productDeleted: false, variantActive: false }),
      false,
    );
  });

  it("blocks archived or inactive products", () => {
    assert.equal(
      isManuallyPurchasable({ productActive: true, productDeleted: true, variantActive: true }),
      false,
    );
    assert.equal(
      isManuallyPurchasable({ productActive: false, productDeleted: false, variantActive: true }),
      false,
    );
  });
});
