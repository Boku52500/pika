"use server";

import { prisma } from "@/server/db";
import { getSessionCustomer } from "@/server/auth/session";
import { addressInputSchema } from "@/server/validation/address";
import { firstZodMessage, toSavedAddress } from "@/server/actions/helpers";
import { AUTH_REQUIRED, GENERIC_SERVER_ERROR, type ActionResult } from "@/server/actions/result";
import { logError } from "@/server/log";
import type { SavedAddress } from "@/types/account";

export async function listMyAddresses(): Promise<SavedAddress[]> {
  const customer = await getSessionCustomer();
  if (!customer) return [];

  const rows = await prisma.address.findMany({
    where: { customerId: customer.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toSavedAddress);
}

export async function createAddress(input: unknown): Promise<ActionResult<SavedAddress>> {
  const customer = await getSessionCustomer();
  if (!customer) return { ok: false, message: AUTH_REQUIRED };

  const parsed = addressInputSchema.safeParse(input);
  if (!parsed.success) {
    const { message, fieldErrors } = firstZodMessage(parsed.error);
    return { ok: false, message, fieldErrors };
  }

  try {
    const address = await prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { customerId: customer.id } });
      const makeDefault = parsed.data.isDefault || count === 0;
      if (makeDefault) {
        await tx.address.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } });
      }
      return tx.address.create({
        data: {
          customerId: customer.id,
          label: parsed.data.label,
          city: parsed.data.city,
          street: parsed.data.address,
          building: parsed.data.building,
          apartment: parsed.data.apartment,
          entrance: parsed.data.entrance,
          floor: parsed.data.floor,
          additionalInfo: parsed.data.notes,
          isDefault: makeDefault,
        },
      });
    });
    return { ok: true, data: toSavedAddress(address) };
  } catch (error) {
    logError("address.create_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}

export async function updateAddress(id: string, input: unknown): Promise<ActionResult<SavedAddress>> {
  const customer = await getSessionCustomer();
  if (!customer) return { ok: false, message: AUTH_REQUIRED };
  if (!id) return { ok: false, message: "მისამართი ვერ მოიძებნა" };

  const parsed = addressInputSchema.safeParse(input);
  if (!parsed.success) {
    const { message, fieldErrors } = firstZodMessage(parsed.error);
    return { ok: false, message, fieldErrors };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({ where: { id, customerId: customer.id } });
      if (!existing) return null;
      if (parsed.data.isDefault) {
        await tx.address.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } });
      }
      return tx.address.update({
        where: { id: existing.id },
        data: {
          label: parsed.data.label,
          city: parsed.data.city,
          street: parsed.data.address,
          building: parsed.data.building,
          apartment: parsed.data.apartment,
          entrance: parsed.data.entrance,
          floor: parsed.data.floor,
          additionalInfo: parsed.data.notes,
          isDefault: parsed.data.isDefault ?? existing.isDefault,
        },
      });
    });
    if (!result) return { ok: false, message: "მისამართი ვერ მოიძებნა" };
    return { ok: true, data: toSavedAddress(result) };
  } catch (error) {
    logError("address.update_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  const customer = await getSessionCustomer();
  if (!customer) return { ok: false, message: AUTH_REQUIRED };
  if (!id) return { ok: false, message: "მისამართი ვერ მოიძებნა" };

  try {
    const removed = await prisma.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({ where: { id, customerId: customer.id } });
      if (!existing) return false;
      await tx.address.delete({ where: { id: existing.id } });
      if (existing.isDefault) {
        const next = await tx.address.findFirst({
          where: { customerId: customer.id },
          orderBy: { createdAt: "desc" },
        });
        if (next) {
          await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }
      return true;
    });
    if (!removed) return { ok: false, message: "მისამართი ვერ მოიძებნა" };
    return { ok: true };
  } catch (error) {
    logError("address.delete_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}

export async function setDefaultAddress(id: string): Promise<ActionResult> {
  const customer = await getSessionCustomer();
  if (!customer) return { ok: false, message: AUTH_REQUIRED };
  if (!id) return { ok: false, message: "მისამართი ვერ მოიძებნა" };

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({ where: { id, customerId: customer.id } });
      if (!existing) return false;
      await tx.address.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } });
      await tx.address.update({ where: { id: existing.id }, data: { isDefault: true } });
      return true;
    });
    if (!updated) return { ok: false, message: "მისამართი ვერ მოიძებნა" };
    return { ok: true };
  } catch (error) {
    logError("address.set_default_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}
