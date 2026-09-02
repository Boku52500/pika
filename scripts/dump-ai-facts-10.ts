/**
 * Dump AI factual payloads for the 10-product test set (no LLM calls).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/dump-ai-facts-10.ts "C:\\path\\products.xlsx"
 */
import fs from "node:fs/promises";
import path from "node:path";

import { buildAiProductFactsPayload } from "../src/lib/productImport/aiProductFactsPayload";
import { parseAllExcelProducts } from "../src/lib/productImport/excelProducts";
import { parseProductFacts } from "../src/lib/productImport/parseProductFacts";
import { selectAiTestProducts } from "../src/lib/productImport/selectAiTestProducts";

const fileArg = process.argv[2];
if (!fileArg) {
  console.error("Usage: npx tsx scripts/dump-ai-facts-10.ts \"C:\\path\\products.xlsx\"");
  process.exit(1);
}

const rows = selectAiTestProducts(parseAllExcelProducts(path.resolve(fileArg)));
const output: Array<{ sku: string; sourceName: string; payload: ReturnType<typeof buildAiProductFactsPayload> }> = [];

for (const row of rows) {
  const facts = parseProductFacts(row);
  output.push({
    sku: row.sku,
    sourceName: row.name,
    payload: buildAiProductFactsPayload(facts),
  });
}

const outPath = path.join(process.cwd(), "tmp", "ai-facts-10-dump.json");

async function main() {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`Wrote ${output.length} payloads to ${outPath}`);

  for (const item of output) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`SKU: ${item.sku}`);
    console.log(`Exact source name: ${item.sourceName}`);
    console.log(`Facts supplied to AI:\n${JSON.stringify(item.payload, null, 2)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
