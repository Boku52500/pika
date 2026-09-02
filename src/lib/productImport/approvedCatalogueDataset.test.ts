import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const DATASET_PATH = path.join(
  process.cwd(),
  "data",
  "product-catalogue-import",
  "approved-catalogue-v1.json",
);

test("approved catalogue dataset is present, complete, and secret-free", () => {
  assert.equal(fs.existsSync(DATASET_PATH), true, "dataset file must exist in repo");
  const raw = fs.readFileSync(DATASET_PATH, "utf8");
  assert.equal(/postgres(ql)?:\/\//i.test(raw), false, "must not contain database URLs");
  assert.equal(/sk-[a-zA-Z0-9]/i.test(raw), false, "must not contain OpenAI-style keys");
  assert.equal(/neon\.tech/i.test(raw), false, "must not contain Neon hosts");
  assert.equal(/password\s*[:=]/i.test(raw), false, "must not contain password fields");

  const data = JSON.parse(raw) as {
    version: string;
    productCount: number;
    philipsDuplicateReviewSkus: string[];
    products: Array<Record<string, string>>;
  };

  assert.equal(data.productCount, 458);
  assert.equal(data.products.length, 458);
  assert.deepEqual(data.philipsDuplicateReviewSkus, ["172492", "177053"]);

  const skus = new Set<string>();
  const slugs = new Set<string>();
  for (const product of data.products) {
    for (const key of [
      "sku",
      "name",
      "brand",
      "category",
      "price",
      "slug",
      "shortDescription",
      "fullDescription",
      "seoTitle",
      "seoDescription",
    ]) {
      assert.equal(typeof product[key], "string");
      assert.ok(product[key].length > 0, `${product.sku} missing ${key}`);
    }
    assert.equal(skus.has(product.sku), false, `duplicate sku ${product.sku}`);
    assert.equal(slugs.has(product.slug), false, `duplicate slug ${product.slug}`);
    skus.add(product.sku);
    slugs.add(product.slug);
  }

  assert.equal(skus.has("172492"), true);
  assert.equal(skus.has("177053"), true);
});
