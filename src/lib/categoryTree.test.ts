import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canDeleteCategory, planCategoryTreeMove, type CategoryTreeNode } from "./categoryTree";
import { AUTH_REQUIRED } from "@/server/actions/result";

function nodes(list: Array<[string, string | null, number]>): CategoryTreeNode[] {
  return list.map(([id, parentId, sortOrder]) => ({ id, parentId, sortOrder }));
}

describe("category tree move planning", () => {
  it("moves root category under another as a child", () => {
    const plan = planCategoryTreeMove({
      nodes: nodes([
        ["phones", null, 0],
        ["apple", null, 1],
        ["laptops", null, 2],
      ]),
      categoryId: "apple",
      newParentId: "phones",
      indexAmongSiblings: 0,
    });
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    const apple = plan.updates.find((u) => u.id === "apple");
    assert.deepEqual(apple, { id: "apple", parentId: "phones", sortOrder: 0 });
    // Root siblings reindexed without apple
    assert.deepEqual(
      plan.updates.filter((u) => u.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder),
      [
        { id: "phones", parentId: null, sortOrder: 0 },
        { id: "laptops", parentId: null, sortOrder: 1 },
      ],
    );
  });

  it("moves child back to root", () => {
    const plan = planCategoryTreeMove({
      nodes: nodes([
        ["phones", null, 0],
        ["apple", "phones", 0],
        ["samsung", "phones", 1],
      ]),
      categoryId: "apple",
      newParentId: null,
      indexAmongSiblings: 1,
    });
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.deepEqual(plan.updates.find((u) => u.id === "apple"), {
      id: "apple",
      parentId: null,
      sortOrder: 1,
    });
    assert.deepEqual(plan.updates.find((u) => u.id === "samsung"), {
      id: "samsung",
      parentId: "phones",
      sortOrder: 0,
    });
  });

  it("reorders siblings under the same parent", () => {
    const plan = planCategoryTreeMove({
      nodes: nodes([
        ["phones", null, 0],
        ["apple", "phones", 0],
        ["samsung", "phones", 1],
      ]),
      categoryId: "samsung",
      newParentId: "phones",
      indexAmongSiblings: 0,
    });
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.deepEqual(
      plan.updates
        .filter((u) => u.parentId === "phones")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((u) => u.id),
      ["samsung", "apple"],
    );
  });

  it("supports nested hierarchy under a deeper parent", () => {
    const plan = planCategoryTreeMove({
      nodes: nodes([
        ["tech", null, 0],
        ["computers", "tech", 0],
        ["laptops", null, 1],
      ]),
      categoryId: "laptops",
      newParentId: "computers",
      indexAmongSiblings: 0,
    });
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.deepEqual(plan.updates.find((u) => u.id === "laptops"), {
      id: "laptops",
      parentId: "computers",
      sortOrder: 0,
    });
  });

  it("rejects parenting a category to itself", () => {
    const plan = planCategoryTreeMove({
      nodes: nodes([["phones", null, 0]]),
      categoryId: "phones",
      newParentId: "phones",
      indexAmongSiblings: 0,
    });
    assert.equal(plan.ok, false);
    if (plan.ok) return;
    assert.equal(plan.code, "CYCLE");
  });

  it("rejects moving a parent beneath its descendant", () => {
    const plan = planCategoryTreeMove({
      nodes: nodes([
        ["a", null, 0],
        ["b", "a", 0],
        ["c", "b", 0],
      ]),
      categoryId: "a",
      newParentId: "c",
      indexAmongSiblings: 0,
    });
    assert.equal(plan.ok, false);
    if (plan.ok) return;
    assert.equal(plan.code, "CYCLE");
  });

  it("blocks delete when children or products exist", () => {
    assert.equal(canDeleteCategory({ childCount: 1, productCount: 0 }).ok, false);
    assert.equal(canDeleteCategory({ childCount: 0, productCount: 12 }).ok, false);
    assert.equal(canDeleteCategory({ childCount: 0, productCount: 0 }).ok, true);
  });

  it("does not invent slug or product changes in the plan", () => {
    const plan = planCategoryTreeMove({
      nodes: nodes([
        ["phones", null, 0],
        ["apple", null, 1],
      ]),
      categoryId: "apple",
      newParentId: "phones",
      indexAmongSiblings: 0,
    });
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    for (const update of plan.updates) {
      assert.equal("slug" in update, false);
      assert.equal("productIds" in update, false);
      assert.ok("parentId" in update);
      assert.ok("sortOrder" in update);
    }
  });
});

describe("admin auth constant for category tree mutations", () => {
  it("exposes AUTH_REQUIRED for unauthenticated action failures", () => {
    assert.equal(typeof AUTH_REQUIRED, "string");
    assert.ok(AUTH_REQUIRED.length > 0);
  });
});
