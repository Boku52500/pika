import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = join(process.cwd(), "src");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("storefront compare and review removal", () => {
  it("removes dead compare/review component files", () => {
    for (const file of [
      "components/product/CompareButton.tsx",
      "components/product/ProductRating.tsx",
      "components/product/ProductReviews.tsx",
    ]) {
      assert.equal(existsSync(join(root, file)), false, file);
    }
  });

  it("keeps compare and review UI off the product page", () => {
    const page = read("app/product/[slug]/page.tsx");
    assert.equal(page.includes("ProductReviews"), false);
    assert.equal(page.includes("ProductRating"), false);
    assert.equal(page.includes("CompareButton"), false);
    assert.equal(page.includes('id="reviews"'), false);
  });

  it("keeps compare and ratings off shared product surfaces", () => {
    for (const file of [
      "components/product/ProductCard.tsx",
      "components/product/ProductListItem.tsx",
      "components/product/ProductInfo.tsx",
      "components/product/ProductActions.tsx",
    ]) {
      const source = read(file);
      assert.equal(source.includes("ProductRating"), false, file);
      assert.equal(source.includes("CompareButton"), false, file);
      assert.equal(source.includes("ProductReviews"), false, file);
    }
  });

  it("removes rating filters from category faceting", () => {
    const filters = read("components/category/filters.ts");
    assert.equal(filters.includes("minRating"), false);
    assert.equal(filters.includes('"rating"'), false);
    const sidebar = read("components/category/FilterSidebar.tsx");
    assert.equal(sidebar.includes("შეფასება"), false);
  });
});

describe("search suggestion cancellation", () => {
  it("aborts stale in-flight requests in useSearchBox", () => {
    const hook = read("components/layout/search/useSearchBox.ts");
    assert.match(hook, /AbortController/);
    assert.match(hook, /requestIdRef/);
    assert.match(hook, /controller\.abort\(\)/);
  });
});

describe("mini-cart on add to cart", () => {
  it("opens the mini-cart after a successful add", () => {
    const button = read("components/product/AddToCartButton.tsx");
    assert.match(button, /useMiniCart|openWithItem/);
    const store = read("lib/cartStore.ts");
    assert.match(store, /CartLineItem \| null/);
  });

  it("does not lock page scroll for the desktop popover", () => {
    const popover = read("components/cart/MiniCartPopover.tsx");
    assert.match(popover, /if \(isMobile\) document\.body\.style\.overflow = "hidden"/);
  });
});

describe("hero carousel controls", () => {
  it("isolates CTA navigation from slide wrapper links", () => {
    const hero = read("components/home/HeroCarousel.tsx");
    assert.match(hero, /იხილე მეტი/);
    assert.doesNotMatch(hero, /<Link[\s\S]*className="group relative flex h-\[260px\]/);
  });
});

describe("interactive cursor defaults", () => {
  it("applies pointer cursor to interactive storefront elements globally", () => {
    const css = read("app/globals.css");
    assert.match(css, /cursor:\s*pointer/);
  });
});
