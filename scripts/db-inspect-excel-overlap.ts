import { loadLocalEnv } from "./loadLocalEnv";
loadLocalEnv();

import { parseAllExcelProducts } from "../src/lib/productImport/excelProducts";
import { prisma } from "../src/server/prisma";

async function main() {
  const excel = parseAllExcelProducts(process.argv[2] ?? "C:\\Users\\Boku\\Desktop\\პროდუქტები (1).xlsx");
  const excelSkus = new Set(excel.map((r) => r.sku));
  const products = await prisma.product.findMany({
    select: {
      sku: true,
      slug: true,
      isActive: true,
      deletedAt: true,
      stockQuantity: true,
      previousPrice: true,
      _count: { select: { variants: true, images: true, specifications: true } },
      translations: { where: { locale: "ka" }, select: { name: true } },
    },
  });
  const excelInDb = products.filter((p) => excelSkus.has(p.sku));
  const otherInDb = products.filter((p) => !excelSkus.has(p.sku));
  console.log(
    JSON.stringify(
      {
        totalProducts: products.length,
        excelSkuCount: excel.length,
        excelSkusAlreadyInDb: excelInDb.map((p) => ({
          sku: p.sku,
          name: p.translations[0]?.name,
          slug: p.slug,
          variants: p._count.variants,
          images: p._count.images,
          specs: p._count.specifications,
          stock: p.stockQuantity,
          prev: p.previousPrice,
          deletedAt: p.deletedAt,
        })),
        otherProductsInDb: otherInDb.length,
        otherSample: otherInDb.slice(0, 8).map((p) => ({
          sku: p.sku,
          name: p.translations[0]?.name,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
