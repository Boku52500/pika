import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeReusableLabel, reusableIdentityKey, reusableSlug, reusableSlugOrFallback } from "./reusableLabel";

describe("reusable label normalization", () => {
  it("collapses casing and whitespace to the same identity", () => {
    assert.equal(reusableIdentityKey("Black"), reusableIdentityKey(" black "));
    assert.equal(reusableIdentityKey("Black"), reusableIdentityKey("BLACK"));
    assert.equal(normalizeReusableLabel("  Midnight   Black "), "Midnight Black");
  });

  it("produces the same slug for duplicate color spellings", () => {
    assert.equal(reusableSlug("Black"), "black");
    assert.equal(reusableSlug(" BLACK "), "black");
    assert.equal(reusableSlug("Midnight Black"), "midnight-black");
  });

  it("keeps Georgian letters in slugs", () => {
    assert.equal(reusableSlug("შავი"), "შავი");
    assert.match(reusableSlugOrFallback("   ", "opt"), /^opt-/);
  });
});
