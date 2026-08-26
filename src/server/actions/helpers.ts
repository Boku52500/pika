import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { SavedAddress } from "@/types/account";

export function isUniqueConstraintError(error: unknown, field?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  if (!field) return true;
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.includes(field);
  if (typeof target === "string") return target.includes(field);
  return false;
}

export function firstZodMessage(error: { issues: { path: PropertyKey[]; message: string }[] }): {
  message: string;
  fieldErrors: Record<string, string>;
} {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    const root = String(issue.path[0] ?? "form");
    if (!fieldErrors[root]) fieldErrors[root] = issue.message;
  }
  const message = error.issues[0]?.message ?? "შეავსეთ ველები სწორად";
  return { message, fieldErrors };
}

export function toSavedAddress(row: {
  id: string;
  customerId: string;
  label: string | null;
  city: string;
  street: string;
  building: string | null;
  apartment: string | null;
  entrance: string | null;
  floor: string | null;
  additionalInfo: string | null;
  isDefault: boolean;
}): SavedAddress {
  return {
    id: row.id,
    customerId: row.customerId,
    label: row.label ?? undefined,
    city: row.city,
    address: row.street,
    building: row.building ?? "",
    apartment: row.apartment ?? "",
    entrance: row.entrance ?? "",
    floor: row.floor ?? "",
    notes: row.additionalInfo ?? "",
    isDefault: row.isDefault,
  };
}
