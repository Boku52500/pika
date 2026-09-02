import * as XLSX from "xlsx";
import path from "node:path";

import { REQUIRED_EXCEL_COLUMNS, type RequiredExcelColumn } from "./constants";
import type { ImportWorkbookMeta, RowIssue } from "./types";

export type RawExcelSheet = {
  meta: ImportWorkbookMeta;
  rows: unknown[][];
};

function trimHeader(value: unknown): string {
  return String(value ?? "").trim();
}

export function buildColumnIndex(headers: string[]): {
  ok: true;
  columnIndex: Record<RequiredExcelColumn, number>;
  ignoredHeaders: string[];
} | {
  ok: false;
  issue: RowIssue;
} {
  const trimmed = headers.map(trimHeader);
  const columnIndex = {} as Record<RequiredExcelColumn, number>;
  const missing: RequiredExcelColumn[] = [];

  for (const required of REQUIRED_EXCEL_COLUMNS) {
    const index = trimmed.indexOf(required);
    if (index === -1) {
      missing.push(required);
    } else {
      columnIndex[required] = index;
    }
  }

  if (missing.length > 0) {
    return {
      ok: false,
      issue: {
        excelRowNumber: 1,
        sku: null,
        code: "MISSING_REQUIRED_COLUMN",
        message: `Missing required columns: ${missing.join(", ")}`,
      },
    };
  }

  const requiredSet = new Set<string>(REQUIRED_EXCEL_COLUMNS);
  const ignoredHeaders = trimmed.filter((header) => header && !requiredSet.has(header));

  return { ok: true, columnIndex, ignoredHeaders };
}

export function readProductImportWorkbook(filePath: string): RawExcelSheet {
  const workbook = XLSX.readFile(filePath, { cellDates: false, raw: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Workbook has no sheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (rows.length === 0) {
    throw new Error("Workbook sheet is empty.");
  }

  const headers = (rows[0] ?? []).map(trimHeader);
  const mapping = buildColumnIndex(headers);
  if (!mapping.ok) {
    throw new Error(mapping.issue.message);
  }

  return {
    meta: {
      filename: path.basename(filePath),
      sheetName,
      headers,
      ignoredHeaders: mapping.ignoredHeaders,
      columnIndex: mapping.columnIndex,
    },
    rows: rows.slice(1),
  };
}

export function cellValue(row: unknown[], index: number): unknown {
  return row[index] ?? "";
}
