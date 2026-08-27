import type { OrderStatus } from "@/types/account";
import type { CustomerInfo, DeliveryAddress, DeliveryMethodId, PaymentMethodId } from "@/lib/checkout";
import type { ProductVisual } from "@/types/product";

export type StorefrontOrderItem = {
  productId: string;
  slug?: string;
  name: string;
  brand: string;
  visual: ProductVisual;
  tone: 1 | 2 | 3 | 4 | 5;
  unitPrice: number;
  quantity: number;
  variants: { groupLabel: string; optionLabel: string }[];
  lineTotal: number;
};

export type StorefrontOrder = {
  id: string;
  createdAt: number;
  customerId: string | null;
  status: OrderStatus;
  paymentStatus: "unpaid" | "pending" | "processing" | "paid" | "failed" | "refunded" | "partially_refunded";
  items: StorefrontOrderItem[];
  subtotal: number;
  discount: number;
  promoCode: string | null;
  deliveryFee: number;
  deliveryMethodId: DeliveryMethodId;
  total: number;
  customer: CustomerInfo;
  delivery: DeliveryAddress;
  paymentMethod: PaymentMethodId;
  installmentMonths: number | null;
};

const PRODUCT_VISUALS: readonly ProductVisual[] = [
  "phone",
  "laptop",
  "tablet",
  "tv",
  "monitor",
  "gaming",
  "keyboard",
  "components",
  "accessory",
  "audio",
  "smart-home",
  "network",
];

export function asProductVisual(value: unknown): ProductVisual {
  return typeof value === "string" && (PRODUCT_VISUALS as readonly string[]).includes(value)
    ? (value as ProductVisual)
    : "accessory";
}

export function asTone(value: unknown): 1 | 2 | 3 | 4 | 5 {
  return value === 2 || value === 3 || value === 4 || value === 5 ? value : 1;
}

export function toUiOrderStatus(status: string): OrderStatus {
  if (status === "pending" || status === "confirmed") return "received";
  if (status === "processing" || status === "shipped" || status === "delivered" || status === "cancelled") {
    return status;
  }
  return "received";
}

export function toUiPaymentMethod(method: string): PaymentMethodId {
  if (method === "cash_on_delivery") return "cash-on-delivery";
  if (method === "installment") return "installment";
  return "card";
}
