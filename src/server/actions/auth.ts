"use server";

import { prisma } from "@/server/db";
import { forgotPasswordInputSchema, registerInputSchema, resetPasswordInputSchema } from "@/server/validation/auth";
import { hashPassword } from "@/server/auth/password";
import { consumeRateLimit } from "@/server/auth/rateLimit";
import { logError } from "@/server/log";
import { isUniqueConstraintError, firstZodMessage } from "@/server/actions/helpers";
import { GENERIC_SERVER_ERROR, type ActionResult } from "@/server/actions/result";
import { isValidEmail } from "@/lib/checkoutValidation";
import { createHash, randomBytes } from "node:crypto";
import { scheduleEmail } from "@/server/email/schedule";
import { notifyPasswordReset } from "@/server/email/notify";
import { acceptedPasswordResetRequest } from "@/server/email/events";

export async function registerCustomer(input: unknown): Promise<ActionResult> {
  const parsed = registerInputSchema.safeParse(input);
  if (!parsed.success) {
    const { message, fieldErrors } = firstZodMessage(parsed.error);
    return { ok: false, message, fieldErrors };
  }

  const email = parsed.data.email;
  if (!(await consumeRateLimit(`register:${email}`, 8, 15 * 60 * 1000))) {
    return { ok: false, message: "ძალიან ბევრი მცდელობაა. სცადეთ მოგვიანებით." };
  }

  const existing = await prisma.customer.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { ok: false, message: "ამ ელ. ფოსტით მომხმარებელი უკვე არსებობს", fieldErrors: { email: "ამ ელ. ფოსტით მომხმარებელი უკვე არსებობს" } };
  }

  try {
    await prisma.customer.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email,
        phone: parsed.data.phone,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error, "email")) {
      return { ok: false, message: "ამ ელ. ფოსტით მომხმარებელი უკვე არსებობს", fieldErrors: { email: "ამ ელ. ფოსტით მომხმარებელი უკვე არსებობს" } };
    }
    logError("auth.register_failed", { email, error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }

  return { ok: true };
}

/**
 * Creates a hashed reset token when the email exists. Always returns the same
 * generic success so callers cannot enumerate accounts. Email delivery is
 * best-effort and must not change this result.
 */
export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordInputSchema.safeParse(input);
  if (!parsed.success) {
    const { message, fieldErrors } = firstZodMessage(parsed.error);
    return { ok: false, message, fieldErrors };
  }

  if (!isValidEmail(parsed.data.email)) {
    return { ok: false, message: "შეიყვანეთ ვალიდური ელ. ფოსტის მისამართი", fieldErrors: { email: "შეიყვანეთ ვალიდური ელ. ფოსტის მისამართი" } };
  }

  if (!(await consumeRateLimit(`reset:${parsed.data.email}`, 5, 15 * 60 * 1000))) {
    return acceptedPasswordResetRequest();
  }

  const customer = await prisma.customer.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true },
  });

  if (customer) {
    const raw = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    const created = await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { customerId: customer.id } });
      return tx.passwordResetToken.create({
        data: {
          customerId: customer.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
    });
    scheduleEmail(() =>
      notifyPasswordReset({
        tokenId: created.id,
        recipient: customer.email,
        rawToken: raw,
        customerId: customer.id,
      }),
    );
  }

  return acceptedPasswordResetRequest();
}

const RESET_TOKEN_INVALID = "ბმული არასწორია ან ვადაგასულია.";

export async function completePasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordInputSchema.safeParse(input);
  if (!parsed.success) {
    const { message, fieldErrors } = firstZodMessage(parsed.error);
    return { ok: false, message, fieldErrors };
  }

  if (!(await consumeRateLimit(`reset-complete:${parsed.data.token.slice(0, 12)}`, 8, 15 * 60 * 1000))) {
    return { ok: false, message: "ძალიან ბევრი მცდელობაა. სცადეთ მოგვიანებით." };
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, customerId: true, expiresAt: true, usedAt: true },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, message: RESET_TOKEN_INVALID };
  }

  try {
    await prisma.$transaction([
      prisma.customer.update({
        where: { id: row.customerId },
        data: { passwordHash: await hashPassword(parsed.data.password) },
      }),
      prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { customerId: row.customerId, id: { not: row.id } },
      }),
    ]);
  } catch (error) {
    logError("auth.reset_complete_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }

  return { ok: true };
}
