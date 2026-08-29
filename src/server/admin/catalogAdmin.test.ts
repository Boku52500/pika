import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUTH_REQUIRED } from "@/server/actions/result";
import { productArchiveData } from "@/server/admin/productArchive";
import { reusableIdentityKey, reusableSlug } from "@/lib/reusableLabel";
import { parentWouldCycle, selectMainNavItems, type CategoryNavFlat } from "@/lib/categoryNav";

describe("admin authorization and historical order safety", () => {
  it("keeps a distinct unauthenticated action failure", () => {
    assert.equal(typeof AUTH_REQUIRED, "string");
    assert.ok(AUTH_REQUIRED.length > 0);
  });

  it("archives products instead of deleting rows used by OrderItem snapshots", () => {
    const data = productArchiveData();
    assert.equal(data.isActive, false);
    assert.ok(data.deletedAt instanceof Date);
    assert.equal("id" in data, false);
  });
});

describe("reusable colors and specifications", () => {
  it("reuses the same color key for casing/whitespace duplicates", () => {
    assert.equal(reusableIdentityKey("Black"), reusableIdentityKey(" BLACK "));
    assert.equal(reusableSlug("Midnight Black"), reusableSlug(" midnight  black "));
  });

  it("treats specification names/values as reusable identities", () => {
    assert.equal(reusableIdentityKey("16GB"), reusableIdentityKey(" 16gb "));
    assert.equal(reusableIdentityKey("Apple M4"), reusableIdentityKey("apple m4"));
  });
});

describe("category navigation admin rules", () => {
  it("only includes selected categories and preserves order", () => {
    const rows: CategoryNavFlat[] = [
      { id: "b", slug: "b", name: "B", parentId: null, isActive: true, showInMainNav: true, navSortOrder: 2, sortOrder: 0 },
      { id: "a", slug: "a", name: "A", parentId: null, isActive: true, showInMainNav: true, navSortOrder: 1, sortOrder: 0 },
      { id: "c", slug: "c", name: "C", parentId: null, isActive: true, showInMainNav: false, navSortOrder: 0, sortOrder: 0 },
    ];
    assert.deepEqual(selectMainNavItems(rows).map((item) => item.id), ["a", "b"]);
  });

  it("rejects self-parent and descendant cycles", () => {
    const parents = new Map<string, string | null>([
      ["root", null],
      ["child", "root"],
    ]);
    assert.equal(parentWouldCycle("root", "child", parents), true);
    assert.equal(parentWouldCycle("child", "root", parents), false);
  });
});
