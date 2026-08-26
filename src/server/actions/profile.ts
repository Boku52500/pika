"use server";

import { prisma } from "@/server/db";
import { getSessionCustomer } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { passwordChangeSchema, profileUpdateSchema } from "@/server/validation/auth";
import { firstZodMessage } from "@/server/actions/helpers";
import { AUTH_REQUIRED, GENERIC_SERVER_ERROR, type ActionResult } from "@/server/actions/result";
import { logError } from "@/server/log";

export async function updateCustomerProfile(input: unknown): Promise<ActionResult<{ firstName: string; lastName: string; phone: string }>> {
  const customer = await getSessionCustomer();
  if (!customer) return { ok: false, message: AUTH_REQUIRED };

  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const { message, fieldErrors } = firstZodMessage(parsed.error);
    return { ok: false, message, fieldErrors };
  }

  try {
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
      },
      select: { firstName: true, lastName: true, phone: true },
    });
    return {
      ok: true,
      data: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone ?? "",
      },
    };
  } catch (error) {
    logError("profile.update_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}

export async function changeCustomerPassword(input: unknown): Promise<ActionResult> {
  const customer = await getSessionCustomer();
  if (!customer) return { ok: false, message: AUTH_REQUIRED };

  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) {
    const { message, fieldErrors } = firstZodMessage(parsed.error);
    return { ok: false, message, fieldErrors };
  }

  const row = await prisma.customer.findUnique({
    where: { id: customer.id },
    select: { passwordHash: true },
  });
  if (!row) return { ok: false, message: AUTH_REQUIRED };

  const matches = await verifyPassword(parsed.data.currentPassword, row.passwordHash);
  if (!matches) {
    return { ok: false, message: "მიმდინარე პაროლი არასწორია", fieldErrors: { currentPassword: "მიმდინარე პაროლი არასწორია" } };
  }

  try {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });
    return { ok: true };
  } catch (error) {
    logError("profile.password_change_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}
