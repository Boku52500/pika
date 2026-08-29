import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldForceScrollTop } from "./scrollRestoration";

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
});
