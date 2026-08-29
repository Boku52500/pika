import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCategoryNavTree,
  parentWouldCycle,
  selectMainNavItems,
  type CategoryNavFlat,
} from "./categoryNav";

const rows: CategoryNavFlat[] = [
  { id: "phones", slug: "phones", name: "ტელეფონები", parentId: null, isActive: true, showInMainNav: true, navSortOrder: 1, sortOrder: 1 },
  { id: "apple", slug: "apple", name: "Apple", parentId: "phones", isActive: true, showInMainNav: false, navSortOrder: 0, sortOrder: 1 },
  { id: "samsung", slug: "samsung", name: "Samsung", parentId: "phones", isActive: true, showInMainNav: false, navSortOrder: 0, sortOrder: 2 },
  { id: "laptops", slug: "laptops", name: "ლეპტოპები", parentId: null, isActive: true, showInMainNav: true, navSortOrder: 0, sortOrder: 2 },
  { id: "hidden", slug: "hidden", name: "Hidden", parentId: null, isActive: true, showInMainNav: false, navSortOrder: 9, sortOrder: 9 },
  { id: "inactive", slug: "inactive", name: "Off", parentId: null, isActive: false, showInMainNav: true, navSortOrder: 0, sortOrder: 0 },
];

describe("category navigation", () => {
  it("builds the full active hierarchy", () => {
    const tree = buildCategoryNavTree(rows);
    assert.equal(tree.length, 3);
    assert.equal(tree[0]?.slug, "phones");
    assert.deepEqual(
      tree[0]?.children.map((child) => child.slug),
      ["apple", "samsung"],
    );
    assert.equal(tree.some((node) => node.slug === "hidden"), true);
    assert.equal(tree.some((node) => node.slug === "inactive"), false);
  });

  it("uses only selected categories for the main navbar, in nav order", () => {
    const nav = selectMainNavItems(rows);
    assert.deepEqual(
      nav.map((item) => item.id),
      ["laptops", "phones"],
    );
    assert.equal(nav.some((item) => item.id === "hidden" || item.id === "apple"), false);
    assert.equal(nav.some((item) => item.id === "inactive"), false);
  });

  it("falls back to active top-level categories when none are flagged for main nav", () => {
    const nav = selectMainNavItems(rows.map((row) => ({ ...row, showInMainNav: false })));
    assert.deepEqual(
      nav.map((item) => item.slug),
      ["phones", "laptops", "hidden"],
    );
    assert.equal(nav.some((item) => item.slug === "apple"), false);
  });

  it("protects against self-parent and descendant cycles", () => {
    const parents = new Map<string, string | null>([
      ["phones", null],
      ["apple", "phones"],
      ["iphone", "apple"],
    ]);
    assert.equal(parentWouldCycle("phones", "phones", parents), true);
    assert.equal(parentWouldCycle("phones", "apple", parents), true);
    assert.equal(parentWouldCycle("apple", "iphone", parents), true);
    assert.equal(parentWouldCycle("iphone", "laptops", parents), false);
    assert.equal(parentWouldCycle("apple", null, parents), false);
  });
});
