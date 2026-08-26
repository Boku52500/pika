"use server";

import { prisma } from "@/server/db";
import { registerInputSchema, forgotPasswordInputSchema } from "@/server/validation/auth";
import { hashPassword } from "@/server/auth/password";
import { consumeRateLimit } from "@/server/auth/rateLimit";
import { logError } from "@/server/log";
import { isUniqueConstraintError, firstZodMessage } from "@/server/actions/helpers";
import { GENERIC_SERVER_ERROR, type ActionResult } from "@/server/actions/result";
import { isValidEmail } from "@/lib/checkoutValidation";
import { createHash, randomBytes } from "node:crypto";

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
 * Creates a hashed reset token when the email exists. Never returns the token
 * and never claims an email was sent — delivery is not configured.
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
    return { ok: true };
  }

  const customer = await prisma.customer.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (customer) {
    const raw = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { customerId: customer.id } }),
      prisma.passwordResetToken.create({
        data: {
          customerId: customer.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      }),
    ]);
  }

  return { ok: true };
}
