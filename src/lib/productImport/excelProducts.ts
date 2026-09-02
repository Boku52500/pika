import { resolveImportCategory } from "./categoryAliases";
import {
  isBlankImportRow,
  normalizeCatalogLabel,
  normalizeProductName,
  normalizeSku,
  parseImportPrice,
} from "./normalize";
import { cellValue, readProductImportWorkbook } from "./parseExcel";

export type ExcelProductRow = {
  excelRowNumber: number;
  sku: string;
  name: string;
  brand: string;
  category: string;
  categoryExcel: string;
  price: string;
};

/** Parse all valid Excel product rows (458 expected), without DB skip logic. */
export function parseAllExcelProducts(filePath: string): ExcelProductRow[] {
  const sheet = readProductImportWorkbook(filePath);
  const rows: ExcelProductRow[] = [];
  const seenSkus = new Set<string>();

  for (const [index, row] of sheet.rows.entries()) {
    const excelRowNumber = index + 2;
    const cols = sheet.meta.columnIndex;
    const raw = {
      sku: cellValue(row, cols.SKU),
      name: cellValue(row, cols["დასახელება"]),
      category: cellValue(row, cols["კატეგორია"]),
      brand: cellValue(row, cols["ბრენდი"]),
      price: cellValue(row, cols["გასაყიდი ფასი"]),
    };

    if (isBlankImportRow(raw)) continue;

    const sku = normalizeSku(raw.sku);
    const name = normalizeProductName(raw.name);
    const categoryRaw = normalizeCatalogLabel(raw.category);
    const brand = normalizeCatalogLabel(raw.brand);
    const priceParsed = parseImportPrice(raw.price);

    if (!sku || !name || !categoryRaw || !brand || !priceParsed.ok) continue;
    if (seenSkus.has(sku)) continue;
    seenSkus.add(sku);

    const categoryResolved = resolveImportCategory(categoryRaw);
    rows.push({
      excelRowNumber,
      sku,
      name,
      brand,
      category: categoryResolved.resolvedLabel,
      categoryExcel: categoryResolved.excelLabel,
      price: priceParsed.value,
    });
  }

  return rows;
}
