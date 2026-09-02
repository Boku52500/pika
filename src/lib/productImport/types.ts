import type { RequiredExcelColumn } from "./constants";

export type ImportErrorCode =
  | "MISSING_REQUIRED_COLUMN"
  | "BLANK_ROW"
  | "INVALID_SKU"
  | "INVALID_NAME"
  | "INVALID_CATEGORY"
  | "INVALID_BRAND"
  | "INVALID_PRICE"
  | "DUPLICATE_SKU_IN_FILE"
  | "SKIPPED_EXISTING_SKU"
  | "SLUG_CONFLICT"
  | "IMPORT_FAILED";

export type ParsedExcelRow = {
  excelRowNumber: number;
  sku: string;
  name: string;
  category: string;
  brand: string;
  price: string;
};

export type RowIssue = {
  excelRowNumber: number;
  sku: string | null;
  code: ImportErrorCode;
  message: string;
  existingProductId?: string;
  existingProductName?: string;
  duplicateRows?: number[];
};

export type PlannedProduct = {
  excelRowNumber: number;
  sku: string;
  name: string;
  /** Resolved category label used for DB assignment. */
  category: string;
  /** Original Excel category when an approved alias was applied. */
  categoryExcel?: string;
  categoryAliasApplied?: boolean;
  categoryExists: boolean;
  brand: string;
  brandExists: boolean;
  price: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  seoTitle: string;
  seoDescription: string;
  status: "READY";
};

export type CategoryAliasUsage = {
  excelLabel: string;
  resolvedLabel: string;
  productCount: number;
};

export type SuspiciousNearDuplicate = {
  excel: string;
  nearExisting: string;
  reason: string;
};

export type ImportWorkbookMeta = {
  filename: string;
  sheetName: string;
  headers: string[];
  ignoredHeaders: string[];
  columnIndex: Record<RequiredExcelColumn, number>;
};

export type ImportPlan = {
  meta: ImportWorkbookMeta;
  totalRows: number;
  blankRows: number;
  issues: RowIssue[];
  products: PlannedProduct[];
  categoriesToCreate: string[];
  categoriesReused: string[];
  brandsToCreate: string[];
  brandsReused: string[];
  categoryAliasesUsed: CategoryAliasUsage[];
  suspiciousNearDuplicates: SuspiciousNearDuplicate[];
};

export type ImportExecutionResult = {
  createdProductIds: string[];
  createdCategories: string[];
  createdBrands: string[];
  skipped: RowIssue[];
  failed: RowIssue[];
};
