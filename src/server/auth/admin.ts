import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { ADMIN_REQUIRED, AUTH_REQUIRED, type ActionFail } from "@/server/actions/result";
import type { CustomerRole } from "@/generated/prisma/client";

export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: CustomerRole;
};

function toAdminUser(row: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: CustomerRole;
}): AdminUser {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone ?? "",
    role: row.role,
  };
}

/**
 * Loads the authenticated customer from PostgreSQL and confirms ADMIN role.
 * Session cookies are not enough — role is always re-read from the database.
 */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const row = await prisma.customer.findUnique({
    where: { id: session.user.id },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true },
  });
  if (!row || row.role !== "ADMIN") return null;
  return toAdminUser(row);
});

export async function requireAdmin(redirectTo = "/admin"): Promise<AdminUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  const row = await prisma.customer.findUnique({
    where: { id: session.user.id },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true },
  });
  if (!row) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }
  if (row.role !== "ADMIN") {
    redirect("/forbidden");
  }
  return toAdminUser(row);
}

export async function requireAdminAction(): Promise<{ ok: true; admin: AdminUser } | ActionFail> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: AUTH_REQUIRED };
  }

  const row = await prisma.customer.findUnique({
    where: { id: session.user.id },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true },
  });
  if (!row) return { ok: false, message: AUTH_REQUIRED };
  if (row.role !== "ADMIN") return { ok: false, message: ADMIN_REQUIRED };
  return { ok: true, admin: toAdminUser(row) };
}
