import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { wrapCarouselIndex } from "./heroCarousel";

describe("hero carousel index", () => {
  it("wraps previous from the first slide to the last when looping", () => {
    assert.equal(wrapCarouselIndex(-1, 3), 2);
    assert.equal(wrapCarouselIndex(0 - 1, 4), 3);
  });

  it("wraps next from the last slide to the first", () => {
    assert.equal(wrapCarouselIndex(3, 3), 0);
    assert.equal(wrapCarouselIndex(2 + 1, 3), 0);
  });

  it("keeps in-range indexes unchanged", () => {
    assert.equal(wrapCarouselIndex(1, 3), 1);
    assert.equal(wrapCarouselIndex(0, 1), 0);
  });
});
