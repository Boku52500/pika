/**
 * Latinize Category.slug values that contain Georgian (or otherwise non-canonical) characters.
 * Updates existing Category rows in place (preserves Product.categoryId).
 * Writes CategorySlugRedirect rows for 308 old→new.
 *
 * Safety: writes run ONLY when RUN_CATEGORY_SLUG_LATINIZE=true.
 * Otherwise the script prints "Category slug latinize disabled" and exits 0.
 *
 * Usage:
 *   RUN_CATEGORY_SLUG_LATINIZE=true npm run categories:latinize-slugs
 *   npm run categories:latinize-slugs -- --dry-run
 *
 * Does not touch products, brands, prices, or stock.
 */
import {
  categorySlugFromName,
  categorySlugNeedsLatinRewrite,
  ensureUniqueCategorySlug,
  isCanonicalCategorySlug,
} from "../src/lib/categorySlug";
import { prisma } from "../src/server/prisma";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun && process.env.RUN_CATEGORY_SLUG_LATINIZE !== "true") {
    console.log("Category slug latinize disabled");
    return;
  }
  console.log(`\n=== Category slug latinize ${dryRun ? "(DRY-RUN)" : "(WRITE)"} ===\n`);

  const categories = await prisma.category.findMany({
    select: {
      id: true,
      slug: true,
      translations: { where: { locale: "ka" }, select: { name: true }, take: 1 },
      _count: { select: { products: true } },
    },
    orderBy: { slug: "asc" },
  });

  const reserved = new Set(categories.map((c) => c.slug));
  const plan: Array<{
    id: string;
    name: string;
    oldSlug: string;
    newSlug: string;
    productCount: number;
  }> = [];

  for (const category of categories) {
    const name = category.translations[0]?.name ?? "";
    if (!categorySlugNeedsLatinRewrite(category.slug)) {
      continue;
    }
    reserved.delete(category.slug);
    const base = categorySlugFromName(name || category.slug);
    const newSlug = ensureUniqueCategorySlug(base, reserved);
    reserved.add(newSlug);
    plan.push({
      id: category.id,
      name,
      oldSlug: category.slug,
      newSlug,
      productCount: category._count.products,
    });
  }

  console.log(`Categories scanned: ${categories.length}`);
  console.log(`To rewrite: ${plan.length}`);
  for (const row of plan) {
    console.log(`  ${row.name}: ${row.oldSlug} -> ${row.newSlug} (products=${row.productCount})`);
  }

  if (dryRun) {
    console.log("\nDry-run only — no writes.");
    return;
  }

  for (const row of plan) {
    if (row.oldSlug === row.newSlug) continue;
    await prisma.$transaction(async (tx) => {
      await tx.category.update({
        where: { id: row.id },
        data: { slug: row.newSlug },
      });
      await tx.categorySlugRedirect.upsert({
        where: { oldSlug: row.oldSlug },
        create: {
          oldSlug: row.oldSlug,
          newSlug: row.newSlug,
          categoryId: row.id,
        },
        update: {
          newSlug: row.newSlug,
          categoryId: row.id,
        },
      });
    });
  }

  const after = await prisma.category.findMany({ select: { slug: true } });
  const bad = after.filter((c) => !isCanonicalCategorySlug(c.slug));
  const slugCounts = new Map<string, number>();
  for (const c of after) slugCounts.set(c.slug, (slugCounts.get(c.slug) ?? 0) + 1);
  const dups = [...slugCounts.entries()].filter(([, n]) => n > 1);

  console.log(`\nAfter: categories=${after.length} non-latin=${bad.length} duplicateSlugs=${dups.length}`);
  if (bad.length || dups.length) {
    throw new Error("Post-latinize verification failed");
  }
  console.log("Category slug latinize complete.\n");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
