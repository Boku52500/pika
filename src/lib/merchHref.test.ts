import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isExternalMerchHref, normalizeMerchHref } from "./merchHref";

describe("normalizeMerchHref", () => {
  it("accepts internal paths", () => {
    assert.equal(normalizeMerchHref("/category/phones"), "/category/phones");
    assert.equal(normalizeMerchHref("/brand/apple"), "/brand/apple");
    assert.equal(normalizeMerchHref("/search?q=iphone"), "/search?q=iphone");
  });

  it("accepts http(s) URLs", () => {
    assert.equal(normalizeMerchHref("https://example.com/a"), "https://example.com/a");
  });

  it("rejects empty and dangerous schemes", () => {
    assert.equal(normalizeMerchHref(""), null);
    assert.equal(normalizeMerchHref("   "), null);
    assert.equal(normalizeMerchHref("javascript:alert(1)"), null);
    assert.equal(normalizeMerchHref("//evil.com"), null);
  });
});

describe("isExternalMerchHref", () => {
  it("detects absolute URLs", () => {
    assert.equal(isExternalMerchHref("https://x.com"), true);
    assert.equal(isExternalMerchHref("/category/phones"), false);
  });
});
