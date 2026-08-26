import "server-only";

export const LOW_STOCK_THRESHOLD = 3;

export type StockState = "in-stock" | "low-stock" | "out-of-stock";

export function stockStateFromQuantity(quantity: number): StockState {
  if (quantity <= 0) return "out-of-stock";
  if (quantity <= LOW_STOCK_THRESHOLD) return "low-stock";
  return "in-stock";
}

export const STOCK_STATE_LABEL: Record<StockState, string> = {
  "in-stock": "მარაგშია",
  "low-stock": "მარაგი იწურება",
  "out-of-stock": "მარაგში არ არის",
};

export function effectiveStockQuantity(productStock: number, variantStocks: number[]): number {
  if (variantStocks.length > 0) {
    return variantStocks.reduce((sum, value) => sum + value, 0);
  }
  return productStock;
}
