import { resolveImportCategory } from "./categoryAliases";
import {
  generateFullDescription,
  generateSeoDescription,
  generateSeoTitle,
  generateShortDescription,
} from "./content";
import {
  isBlankImportRow,
  normalizeCatalogLabel,
  normalizeProductName,
  normalizeSku,
  parseImportPrice,
} from "./normalize";
import { cellValue, readProductImportWorkbook } from "./parseExcel";
import { catalogIdentityKey, resolveUniqueProductSlug } from "./slug";
import type { CategoryAliasUsage, ImportPlan, PlannedProduct, RowIssue, SuspiciousNearDuplicate } from "./types";

export type ExistingSkuRecord = {
  sku: string;
  productId: string;
  productName: string;
};

export type CatalogLabelRecord = {
  key: string;
  displayName: string;
};

export type PlanImportContext = {
  existingSkus: Map<string, ExistingSkuRecord>;
  existingSlugs: Set<string>;
  existingCategories: Map<string, CatalogLabelRecord>;
  existingBrands: Map<string, CatalogLabelRecord>;
};

type ParsedCandidate = {
  excelRowNumber: number;
  sku: string;
  name: string;
  categoryExcel: string;
  categoryResolved: string;
  categoryAliasApplied: boolean;
  brand: string;
  price: string;
};

function pushIssue(issues: RowIssue[], issue: RowIssue): void {
  issues.push(issue);
}

function detectDuplicateSkus(candidates: ParsedCandidate[]): Map<string, number[]> {
  const bySku = new Map<string, number[]>();
  for (const row of candidates) {
    const list = bySku.get(row.sku) ?? [];
    list.push(row.excelRowNumber);
    bySku.set(row.sku, list);
  }
  return bySku;
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) dp[i]![0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[a.length]![b.length]!;
}

function findSuspiciousNearDuplicates(
  toCreate: string[],
  existing: Map<string, CatalogLabelRecord>,
): SuspiciousNearDuplicate[] {
  const results: SuspiciousNearDuplicate[] = [];
  for (const label of toCreate) {
    const key = catalogIdentityKey(label);
    for (const record of existing.values()) {
      if (record.key === key) continue;
      const dist = levenshtein(key, record.key);
      if (dist > 0 && dist <= 3) {
        results.push({
          excel: label,
          nearExisting: record.displayName,
          reason: `normalized identity edit distance ${dist} (not auto-merged)`,
        });
      }
    }
  }
  return results.sort((a, b) => a.excel.localeCompare(b.excel, "ka"));
}

export function planProductImport(filePath: string, context: PlanImportContext): ImportPlan {
  const sheet = readProductImportWorkbook(filePath);
  const issues: RowIssue[] = [];
  let blankRows = 0;

  const candidates: ParsedCandidate[] = [];

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

    if (isBlankImportRow(raw)) {
      blankRows += 1;
      continue;
    }

    const sku = normalizeSku(raw.sku);
    if (!sku) {
      pushIssue(issues, {
        excelRowNumber,
        sku: null,
        code: "INVALID_SKU",
        message: "SKU is missing or invalid",
      });
      continue;
    }

    const name = normalizeProductName(raw.name);
    if (!name) {
      pushIssue(issues, {
        excelRowNumber,
        sku,
        code: "INVALID_NAME",
        message: "Product name is missing",
      });
      continue;
    }

    const categoryRaw = normalizeCatalogLabel(raw.category);
    if (!categoryRaw) {
      pushIssue(issues, {
        excelRowNumber,
        sku,
        code: "INVALID_CATEGORY",
        message: "Category is missing",
      });
      continue;
    }

    const brand = normalizeCatalogLabel(raw.brand);
    if (!brand) {
      pushIssue(issues, {
        excelRowNumber,
        sku,
        code: "INVALID_BRAND",
        message: "Brand is missing",
      });
      continue;
    }

    const priceParsed = parseImportPrice(raw.price);
    if (!priceParsed.ok) {
      pushIssue(issues, {
        excelRowNumber,
        sku,
        code: "INVALID_PRICE",
        message: "Selling price is missing or invalid",
      });
      continue;
    }

    const categoryResolved = resolveImportCategory(categoryRaw);

    candidates.push({
      excelRowNumber,
      sku,
      name,
      categoryExcel: categoryResolved.excelLabel,
      categoryResolved: categoryResolved.resolvedLabel,
      categoryAliasApplied: categoryResolved.aliasApplied,
      brand,
      price: priceParsed.value,
    });
  }

  const duplicateMap = detectDuplicateSkus(candidates);
  const duplicateSkus = new Set(
    [...duplicateMap.entries()].filter(([, rows]) => rows.length > 1).map(([sku]) => sku),
  );

  const reservedSlugs = new Set(context.existingSlugs);
  const products: PlannedProduct[] = [];
  const categoriesReusedSet = new Set<string>();
  const categoriesToCreateSet = new Set<string>();
  const brandsReusedSet = new Set<string>();
  const brandsToCreateSet = new Set<string>();
  const aliasUsageMap = new Map<string, CategoryAliasUsage>();

  for (const row of candidates) {
    if (duplicateSkus.has(row.sku)) {
      pushIssue(issues, {
        excelRowNumber: row.excelRowNumber,
        sku: row.sku,
        code: "DUPLICATE_SKU_IN_FILE",
        message: "Duplicate SKU in workbook",
        duplicateRows: duplicateMap.get(row.sku),
      });
      continue;
    }

    const existing = context.existingSkus.get(row.sku);
    if (existing) {
      pushIssue(issues, {
        excelRowNumber: row.excelRowNumber,
        sku: row.sku,
        code: "SKIPPED_EXISTING_SKU",
        message: "SKU already exists in database",
        existingProductId: existing.productId,
        existingProductName: existing.productName,
      });
      continue;
    }

    if (row.categoryAliasApplied) {
      const aliasKey = `${row.categoryExcel}→${row.categoryResolved}`;
      const current = aliasUsageMap.get(aliasKey) ?? {
        excelLabel: row.categoryExcel,
        resolvedLabel: row.categoryResolved,
        productCount: 0,
      };
      current.productCount += 1;
      aliasUsageMap.set(aliasKey, current);
    }

    const categoryKey = catalogIdentityKey(row.categoryResolved);
    const brandKey = catalogIdentityKey(row.brand);
    const categoryExists = context.existingCategories.has(categoryKey);
    const brandExists = context.existingBrands.has(brandKey);

    if (categoryExists) {
      categoriesReusedSet.add(context.existingCategories.get(categoryKey)!.displayName);
    } else {
      categoriesToCreateSet.add(row.categoryResolved);
    }

    if (brandExists) brandsReusedSet.add(context.existingBrands.get(brandKey)!.displayName);
    else brandsToCreateSet.add(row.brand);

    const slug = resolveUniqueProductSlug({
      name: row.name,
      sku: row.sku,
      reservedSlugs,
    });
    reservedSlugs.add(slug);

    products.push({
      excelRowNumber: row.excelRowNumber,
      sku: row.sku,
      name: row.name,
      category: row.categoryResolved,
      categoryExcel: row.categoryAliasApplied ? row.categoryExcel : undefined,
      categoryAliasApplied: row.categoryAliasApplied,
      categoryExists,
      brand: row.brand,
      brandExists,
      price: row.price,
      slug,
      shortDescription: generateShortDescription(row.sku, row.name, row.brand, row.categoryResolved),
      fullDescription: generateFullDescription(row.sku, row.name, row.brand, row.categoryResolved),
      seoTitle: generateSeoTitle(row.name),
      seoDescription: generateSeoDescription(row.sku, row.name, row.brand, row.categoryResolved),
      status: "READY",
    });
  }

  return {
    meta: sheet.meta,
    totalRows: sheet.rows.length,
    blankRows,
    issues,
    products,
    categoriesToCreate: [...categoriesToCreateSet].sort((a, b) => a.localeCompare(b, "ka")),
    categoriesReused: [...categoriesReusedSet].sort((a, b) => a.localeCompare(b, "ka")),
    brandsToCreate: [...brandsToCreateSet].sort((a, b) => a.localeCompare(b, "ka")),
    brandsReused: [...brandsReusedSet].sort((a, b) => a.localeCompare(b, "ka")),
    categoryAliasesUsed: [...aliasUsageMap.values()].sort((a, b) =>
      a.excelLabel.localeCompare(b.excelLabel, "ka"),
    ),
    suspiciousNearDuplicates: findSuspiciousNearDuplicates(
      [...categoriesToCreateSet],
      context.existingCategories,
    ),
  };
}

export function summarizeImportPlan(plan: ImportPlan) {
  const byCode = (code: ImportPlan["issues"][number]["code"]) =>
    plan.issues.filter((issue) => issue.code === code);

  return {
    filename: plan.meta.filename,
    sheetName: plan.meta.sheetName,
    headers: plan.meta.headers,
    ignoredHeaders: plan.meta.ignoredHeaders,
    totalRows: plan.totalRows,
    blankRows: plan.blankRows,
    validRows: plan.products.length,
    invalidRows: plan.issues.filter((issue) =>
      ["INVALID_SKU", "INVALID_NAME", "INVALID_CATEGORY", "INVALID_BRAND", "INVALID_PRICE"].includes(issue.code),
    ).length,
    duplicateSkuRows: byCode("DUPLICATE_SKU_IN_FILE").length,
    existingSkuRows: byCode("SKIPPED_EXISTING_SKU").length,
    readyToCreate: plan.products.length,
    categoriesToCreate: plan.categoriesToCreate,
    categoriesReused: plan.categoriesReused,
    brandsToCreate: plan.brandsToCreate,
    brandsReused: plan.brandsReused,
    categoryAliasesUsed: plan.categoryAliasesUsed,
    suspiciousNearDuplicates: plan.suspiciousNearDuplicates,
  };
}
