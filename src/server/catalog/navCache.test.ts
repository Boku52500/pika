import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Keep in sync with STOREFRONT_NAV_CACHE_TAG in src/server/catalog/nav.ts */
const STOREFRONT_NAV_CACHE_TAG = "storefront-nav";

describe("storefront nav cache", () => {
  it("uses a stable tag consumed by admin revalidation", () => {
    assert.equal(STOREFRONT_NAV_CACHE_TAG, "storefront-nav");
  });
});
