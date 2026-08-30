import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectHomepageCategories, type HomepageCategoryFlat } from "./homepageCategories";

function row(partial: Partial<HomepageCategoryFlat> & Pick<HomepageCategoryFlat, "id" | "slug" | "name">): HomepageCategoryFlat {
  return {
    parentId: null,
    isActive: true,
    showOnHomepage: false,
    homepageSortOrder: 0,
    sortOrder: 0,
    imageUrl: null,
    iconKey: null,
    ...partial,
  };
}

describe("selectHomepageCategories", () => {
  it("uses configured homepage categories in homepage order", () => {
    const selected = selectHomepageCategories([
      row({ id: "1", slug: "a", name: "A", showOnHomepage: true, homepageSortOrder: 2 }),
      row({ id: "2", slug: "b", name: "B", showOnHomepage: true, homepageSortOrder: 1 }),
      row({ id: "3", slug: "c", name: "C", showOnHomepage: false }),
    ]);
    assert.deepEqual(
      selected.map((item) => item.slug),
      ["b", "a"],
    );
  });

  it("falls back to active top-level categories when none are configured", () => {
    const selected = selectHomepageCategories([
      row({ id: "1", slug: "phones", name: "ტელეფონები", sortOrder: 1 }),
      row({ id: "2", slug: "child", name: "Child", parentId: "1", sortOrder: 0 }),
      row({ id: "3", slug: "laptops", name: "ლეპტოპები", sortOrder: 2 }),
      row({ id: "4", slug: "off", name: "Off", isActive: false, sortOrder: 0 }),
    ]);
    assert.deepEqual(
      selected.map((item) => item.slug),
      ["phones", "laptops"],
    );
  });

  it("excludes inactive categories from configured selection", () => {
    const selected = selectHomepageCategories([
      row({ id: "1", slug: "a", name: "A", showOnHomepage: true, isActive: false }),
      row({ id: "2", slug: "b", name: "B", showOnHomepage: true }),
    ]);
    assert.deepEqual(
      selected.map((item) => item.slug),
      ["b"],
    );
  });
});
