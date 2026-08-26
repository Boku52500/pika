import type { ProductAvailability } from "@/types/product";

/** Single source of truth for availability copy — reused by cards, list rows and filters. */
export const availabilityLabel: Record<ProductAvailability, string> = {
  "in-stock": "მარაგშია",
  "low-stock": "მცირდება მარაგი",
  "out-of-stock": "არ არის მარაგში",
};
