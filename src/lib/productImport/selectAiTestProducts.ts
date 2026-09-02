import { parseProductFacts } from "./parseProductFacts";
import type { ExcelProductRow } from "./excelProducts";

export type AiTestSlot = {
  kind: string;
  label: string;
  /** When omitted, only categoryKind is used (stricter slots like appliance/router). */
  matchCategory?: RegExp;
};

export const AI_TEST_SLOTS: AiTestSlot[] = [
  { kind: "cpu", label: "CPU", matchCategory: /პროცეს|cpu/i },
  { kind: "gpu", label: "GPU", matchCategory: /ვიდეო|gpu|კარტ/i },
  { kind: "monitor", label: "Monitor", matchCategory: /მონიტ/i },
  { kind: "tv", label: "TV", matchCategory: /ტელევ/i },
  { kind: "phone", label: "Phone", matchCategory: /ტელეფ/i },
  { kind: "laptop", label: "Laptop", matchCategory: /ლეპტ/i },
  { kind: "storage", label: "SSD/Storage", matchCategory: /ssd|hdd|მეხს/i },
  { kind: "case", label: "Case", matchCategory: /ქეის/i },
  { kind: "appliance", label: "Appliance" },
  { kind: "router", label: "Networking" },
];

/** Pick 10 diverse Excel products for AI quality preview (one per slot where possible). */
export function selectAiTestProducts(rows: ExcelProductRow[]): ExcelProductRow[] {
  const selected: ExcelProductRow[] = [];
  const usedSkus = new Set<string>();

  for (const slot of AI_TEST_SLOTS) {
    const match = rows.find((row) => {
      if (usedSkus.has(row.sku)) return false;
      const facts = parseProductFacts(row);
      if (facts.categoryKind === slot.kind) return true;
      if (!slot.matchCategory) return false;
      return slot.matchCategory.test(row.category);
    });
    if (match) {
      selected.push(match);
      usedSkus.add(match.sku);
    }
  }

  for (const row of rows) {
    if (selected.length >= 10) break;
    if (!usedSkus.has(row.sku)) {
      selected.push(row);
      usedSkus.add(row.sku);
    }
  }

  return selected.slice(0, 10);
}

export function describeAiTestSelection(rows: ExcelProductRow[]): Array<{ kind: string; sku: string; name: string; category: string }> {
  return selectAiTestProducts(rows).map((row) => {
    const facts = parseProductFacts(row);
    return { kind: facts.categoryKind, sku: row.sku, name: row.name, category: row.category };
  });
}
