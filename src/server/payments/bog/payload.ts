import { Prisma } from "@/generated/prisma/client";
import { moneyToNumber, moneyToTetri } from "@/server/money";

export type BogBasketLine = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: Prisma.Decimal | string | number;
  lineTotal: Prisma.Decimal | string | number;
};

export type BogCreateOrderInput = {
  callbackUrl: string;
  externalOrderId: string;
  successUrl: string;
  failUrl: string;
  currency: string;
  total: Prisma.Decimal | string | number;
  discount: Prisma.Decimal | string | number;
  deliveryFee: Prisma.Decimal | string | number;
  items: BogBasketLine[];
  buyerName?: string;
};

export type BogCreateOrderBody = {
  callback_url: string;
  external_order_id: string;
  capture: "automatic";
  purchase_units: {
    currency: string;
    total_amount: number;
    total_discount_amount?: number;
    delivery?: { amount: number };
    basket: Array<{
      product_id: string;
      description: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
  };
  redirect_urls: {
    success: string;
    fail: string;
  };
  payment_method: ["card"];
  buyer?: { full_name: string };
};

function moneyJson(value: Prisma.Decimal | string | number): number {
  return moneyToNumber(value);
}

export function buildBogCreateOrderBody(input: BogCreateOrderInput): BogCreateOrderBody {
  const discount = moneyJson(input.discount);
  const deliveryFee = moneyJson(input.deliveryFee);
  const body: BogCreateOrderBody = {
    callback_url: input.callbackUrl,
    external_order_id: input.externalOrderId,
    capture: "automatic",
    purchase_units: {
      currency: input.currency,
      total_amount: moneyJson(input.total),
      basket: input.items.map((item) => ({
        product_id: item.productId,
        description: item.productName.slice(0, 200),
        quantity: item.quantity,
        unit_price: moneyJson(item.unitPrice),
        total_price: moneyJson(item.lineTotal),
      })),
    },
    redirect_urls: {
      success: input.successUrl,
      fail: input.failUrl,
    },
    payment_method: ["card"],
  };

  if (discount > 0) {
    body.purchase_units.total_discount_amount = discount;
  }
  if (deliveryFee > 0) {
    body.purchase_units.delivery = { amount: deliveryFee };
  }
  const buyerName = input.buyerName?.trim();
  if (buyerName) {
    body.buyer = { full_name: buyerName.slice(0, 120) };
  }
  return body;
}

export function parseBogAmount(value: string | number | undefined): Prisma.Decimal | null {
  if (value == null) return null;
  try {
    const raw = typeof value === "number" ? value.toFixed(2) : value.trim().replace(",", ".");
    if (!/^\d+(\.\d{1,4})?$/.test(raw)) return null;
    return new Prisma.Decimal(raw).toDecimalPlaces(2);
  } catch {
    return null;
  }
}

export function amountsMatch(
  expected: Prisma.Decimal | string | number,
  actual: Prisma.Decimal | string | number | null | undefined,
): boolean {
  if (actual == null) return false;
  return moneyToTetri(expected) === moneyToTetri(actual);
}
