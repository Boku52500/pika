import "server-only";

import { prisma } from "@/server/db";
import { moneyToNumber } from "@/server/money";
import { pickTranslation } from "@/server/locale";

export type AdminPromotionRow = {
  id: string;
  code: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

export type AdminPromotionEditorData = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: string;
  minOrderAmount: string;
  usageLimit: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  name: string;
  description: string;
};

function datetimeLocal(value: Date | null): string {
  if (!value) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function moneyInput(value: unknown): string {
  if (value == null) return "";
  const n = moneyToNumber(value as never);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export async function listAdminPromotions(): Promise<AdminPromotionRow[]> {
  const promotions = await prisma.promotion.findMany({
    include: { translations: true },
    orderBy: { createdAt: "desc" },
  });
  return promotions.map((promotion) => ({
    id: promotion.id,
    code: promotion.code ?? "",
    name: pickTranslation(promotion.translations).name,
    type: promotion.type,
    value: moneyToNumber(promotion.value),
    minOrderAmount: promotion.minOrderAmount == null ? null : moneyToNumber(promotion.minOrderAmount),
    usageLimit: promotion.usageLimit,
    usedCount: promotion.usedCount,
    startsAt: promotion.startsAt?.toISOString() ?? null,
    endsAt: promotion.endsAt?.toISOString() ?? null,
    isActive: promotion.isActive,
  }));
}

export async function getAdminPromotionEditor(id: string): Promise<AdminPromotionEditorData | null> {
  const promotion = await prisma.promotion.findUnique({
    where: { id },
    include: { translations: true },
  });
  if (!promotion) return null;
  const ka = pickTranslation(promotion.translations);
  return {
    id: promotion.id,
    code: promotion.code ?? "",
    type: promotion.type,
    value: moneyInput(promotion.value),
    minOrderAmount: moneyInput(promotion.minOrderAmount),
    usageLimit: promotion.usageLimit == null ? "" : String(promotion.usageLimit),
    startsAt: datetimeLocal(promotion.startsAt),
    endsAt: datetimeLocal(promotion.endsAt),
    isActive: promotion.isActive,
    name: ka.name,
    description: ka.description ?? "",
  };
}

export function emptyPromotionEditor(): AdminPromotionEditorData {
  return {
    id: "",
    code: "",
    type: "percentage",
    value: "",
    minOrderAmount: "",
    usageLimit: "",
    startsAt: "",
    endsAt: "",
    isActive: true,
    name: "",
    description: "",
  };
}
