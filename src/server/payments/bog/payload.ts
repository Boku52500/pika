import { Prisma } from "@/generated/prisma/client";
import { moneyToNumber, moneyToTetri } from "@/server/money";
import type { BogSplitConfig } from "@/server/payments/bog/split";

export type BogBasketLine = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: Prisma.Decimal | string | number;
  lineTotal: Prisma.Decimal | string | number;
};

export type BogPaymentMethodValue =
  | "card"
  | "google_pay"
  | "apple_pay"
  | "bog_p2p"
  | "bog_loyalty"
  | "bnpl"
  | "bog_loan"
  | "gift_card";

export type BogCreateOrderConfig = {
  loan?: { type?: string; month?: number };
  google_pay?: { external?: boolean; google_pay_token?: string };
  apple_pay?: { external?: boolean };
  split?: BogSplitConfig;
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
  capture?: "automatic" | "manual";
  paymentMethods?: BogPaymentMethodValue[];
  applicationType?: "web" | "mobile";
  config?: BogCreateOrderConfig;
};

export type BogCreateOrderBody = {
  callback_url: string;
  external_order_id: string;
  capture: "automatic" | "manual";
  application_type?: "web" | "mobile";
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
  payment_method: BogPaymentMethodValue[];
  buyer?: { full_name: string };
  config?: BogCreateOrderConfig;
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
    capture: input.capture ?? "automatic",
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
    payment_method: input.paymentMethods?.length ? input.paymentMethods : ["card"],
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
  if (input.applicationType) {
    body.application_type = input.applicationType;
  }
  if (input.config && Object.keys(input.config).length > 0) {
    body.config = input.config;
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

export function amountLessOrEqual(
  left: Prisma.Decimal | string | number,
  right: Prisma.Decimal | string | number,
): boolean {
  return moneyToTetri(left) <= moneyToTetri(right);
}
