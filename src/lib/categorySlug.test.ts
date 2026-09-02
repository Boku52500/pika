import assert from "node:assert/strict";
import test from "node:test";

import {
  categorySlugFromName,
  categorySlugNeedsLatinRewrite,
  containsGeorgianCharacters,
  ensureUniqueCategorySlug,
  isCanonicalCategorySlug,
} from "./categorySlug";
import { categoryHref } from "./categoryNav";
import { catalogSlug } from "./productImport/slug";

test("ბლენდერი -> blenderi", () => {
  assert.equal(categorySlugFromName("ბლენდერი"), "blenderi");
});

test("multi-word Georgian transliteration", () => {
  assert.equal(categorySlugFromName("აერო გრილი"), "aero-grili");
  assert.equal(categorySlugFromName("თმის უთო"), "tmis-uto");
  assert.equal(categorySlugFromName("თმის სახვევი"), "tmis-sakhvevi");
  assert.equal(categorySlugFromName("ვაფლის აპარატი"), "vaflis-aparati");
  assert.equal(categorySlugFromName("ყავის აპარატები"), "yavis-aparatebi");
  assert.equal(categorySlugFromName("დეჰიდრატორი"), "dehidratori");
});

test("generated slug has no Georgian characters", () => {
  const slug = categorySlugFromName("კომპიუტერის ყურსასმენები");
  assert.equal(containsGeorgianCharacters(slug), false);
  assert.equal(isCanonicalCategorySlug(slug), true);
});

test("slug uniqueness / collision handling is deterministic", () => {
  const reserved = new Set(["blenderi", "blenderi-2"]);
  assert.equal(ensureUniqueCategorySlug("blenderi", reserved), "blenderi-3");
  assert.equal(ensureUniqueCategorySlug("grili", reserved), "grili");
});

test("category name and slug can differ (Latin slug, Georgian name)", () => {
  const name = "ბლენდერი";
  const slug = categorySlugFromName(name);
  assert.notEqual(name, slug);
  assert.equal(slug, "blenderi");
});

test("persisted Category.slug is used for href — never name", () => {
  assert.equal(categoryHref("blenderi"), "/category/blenderi");
  assert.notEqual(categoryHref("blenderi"), `/category/${"ბლენდერი"}`);
});

test("catalogSlug(category) uses Latin transliteration", () => {
  assert.equal(catalogSlug("ბლენდერი", "category"), "blenderi");
  assert.equal(containsGeorgianCharacters(catalogSlug("გრილი", "category")), false);
});

test("categorySlugNeedsLatinRewrite detects Georgian and invalid slugs", () => {
  assert.equal(categorySlugNeedsLatinRewrite("ბლენდერი"), true);
  assert.equal(categorySlugNeedsLatinRewrite("აერო-გრილი"), true);
  assert.equal(categorySlugNeedsLatinRewrite("Bad_Slug"), true);
  assert.equal(categorySlugNeedsLatinRewrite("tv"), false);
  assert.equal(categorySlugNeedsLatinRewrite("phones"), false);
  assert.equal(categorySlugNeedsLatinRewrite("blenderi"), false);
});

test("canonical slug format rejects spaces/underscores/Georgian", () => {
  assert.equal(isCanonicalCategorySlug("aero-grili"), true);
  assert.equal(isCanonicalCategorySlug("aero_grili"), false);
  assert.equal(isCanonicalCategorySlug("aero grili"), false);
  assert.equal(isCanonicalCategorySlug("აერო"), false);
  assert.equal(isCanonicalCategorySlug("-aero"), false);
});

test("/category/blenderi resolves transliterated ბლენდერი", () => {
  assert.equal(categoryHref(categorySlugFromName("ბლენდერი")), "/category/blenderi");
});

test("old Georgian slug redirect target differs (no loop)", () => {
  const oldSlug = "ბლენდერი";
  const newSlug = categorySlugFromName("ბლენდერი");
  assert.notEqual(oldSlug, newSlug);
  assert.equal(newSlug, "blenderi");
});
