import type { ProductFacts } from "./parseProductFacts";

/** Facts safe to pass to the AI — explicit tokens only, no inferred specs. */
export type AiProductFactsPayload = {
  sku: string;
  productName: string;
  brand: string;
  category: string;
  categoryKind: string;
  productTypeKa: string;
  cleanName: string;
  modelLabel: string;
  explicitFacts: string[];
  parsed: {
    screenInches: number | null;
    screenInchesRaw: string | null;
    resolution: string | null;
    primaryStorage: string | null;
    primaryMemory: string | null;
    cpuModel: string | null;
    gpuModel: string | null;
    phoneModel: string | null;
    color: string | null;
    series: string[];
    wifiGeneration: string | null;
    formFactor: string | null;
  };
};

export function buildAiProductFactsPayload(facts: ProductFacts): AiProductFactsPayload {
  return {
    sku: facts.sku,
    productName: facts.name,
    brand: facts.brand,
    category: facts.category,
    categoryKind: facts.categoryKind,
    productTypeKa: facts.productTypeKa,
    cleanName: facts.cleanName,
    modelLabel: facts.modelLabel,
    explicitFacts: facts.explicitTokens,
    parsed: {
      screenInches: facts.screenInches,
      screenInchesRaw: facts.screenInchesRaw,
      resolution: facts.resolution,
      primaryStorage: facts.primaryStorage ? facts.primaryStorage.raw : null,
      primaryMemory: facts.primaryMemory ? facts.primaryMemory.raw : null,
      cpuModel: facts.cpuModel,
      gpuModel: facts.gpuModel,
      phoneModel: facts.phoneModel,
      color: facts.color,
      series: facts.series,
      wifiGeneration: facts.wifiGeneration,
      formFactor: facts.formFactor,
    },
  };
}
