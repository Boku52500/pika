import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldForceScrollTop, scrollHomeLogoToTop } from "./scrollRestoration";

describe("scroll restoration on navigate", () => {
  it("scrolls to top on a fresh product or category navigation", () => {
    assert.equal(shouldForceScrollTop({ hash: "", isHistoryTraversal: false }), true);
  });

  it("does not force top when restoring back/forward history", () => {
    assert.equal(shouldForceScrollTop({ hash: "", isHistoryTraversal: true }), false);
  });

  it("does not force top for hash targets", () => {
    assert.equal(shouldForceScrollTop({ hash: "#specs", isHistoryTraversal: false }), false);
    assert.equal(shouldForceScrollTop({ hash: "#specs", isHistoryTraversal: true }), false);
  });

  it("scrolls the window to the top for a same-route homepage logo click", () => {
    const calls: ScrollToOptions[] = [];
    scrollHomeLogoToTop((options) => {
      calls.push(options);
    });
    assert.deepEqual(calls, [{ top: 0, left: 0, behavior: "smooth" }]);
  });
});
