import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const src = join(process.cwd(), "src");

describe("storefront merch cache", () => {
  it("uses stable tags consumed by admin revalidation", () => {
    const revalidate = readFileSync(join(src, "server/admin/revalidate.ts"), "utf8");
    const merch = readFileSync(join(src, "server/catalog/merchTags.ts"), "utf8");
    const nav = readFileSync(join(src, "server/catalog/nav.ts"), "utf8");
    assert.match(nav, /STOREFRONT_NAV_CACHE_TAG = "storefront-nav"/);
    assert.match(merch, /storefront-hero/);
    assert.match(merch, /storefront-brands/);
    assert.match(merch, /storefront-homepage-categories/);
    assert.match(revalidate, /STOREFRONT_HERO_CACHE_TAG/);
    assert.match(revalidate, /STOREFRONT_BRANDS_CACHE_TAG/);
    assert.match(revalidate, /STOREFRONT_HOMEPAGE_CATEGORIES_CACHE_TAG/);
    assert.match(revalidate, /revalidatePath\("\/brand\/\[slug\]"/);
  });
});
