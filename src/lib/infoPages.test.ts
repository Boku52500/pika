import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getInfoPage, INFO_PAGE_SLUGS, INFO_PAGES } from "./infoPages";

describe("info pages", () => {
  it("exposes every previously linked footer/utility slug", () => {
    const expected = [
      "about",
      "stores",
      "careers",
      "partners",
      "service-centers",
      "support",
      "warranty",
      "delivery",
      "returns",
      "privacy",
      "terms",
    ];
    assert.deepEqual([...INFO_PAGE_SLUGS].sort(), [...expected].sort());
  });

  it("returns null for unknown slugs so the catch-all can 404", () => {
    assert.equal(getInfoPage("login"), null);
    assert.equal(getInfoPage("not-a-page"), null);
  });

  it("marks legal and location copy as needing admin review", () => {
    for (const slug of ["privacy", "terms", "warranty", "returns", "delivery", "stores"]) {
      assert.equal(INFO_PAGES[slug]?.needsAdminReview, true);
    }
    assert.equal(INFO_PAGES.about?.needsAdminReview, false);
    assert.equal(INFO_PAGES.support?.needsAdminReview, false);
  });
});
