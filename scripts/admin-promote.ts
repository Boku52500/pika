/**
 * Promote an existing customer to ADMIN.
 *
 * Usage: npm run admin:promote -- user@example.com
 *
 * Does not create accounts, print passwords, or accept a hardcoded email.
 */
import "dotenv/config";

import { prisma } from "../src/server/prisma";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function main() {
  const emailArg = process.argv.slice(2).find((arg) => arg && !arg.startsWith("-"));
  if (!emailArg) {
    console.error("Usage: npm run admin:promote -- user@example.com");
    console.error("The customer must already exist. Register them on the storefront first.");
    process.exit(1);
  }

  const email = normalizeEmail(emailArg);
  const customer = await prisma.customer.findUnique({
    where: { email },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });

  if (!customer) {
    console.error(`No customer found for ${email}. Register this email on the storefront, then retry.`);
    process.exit(1);
  }

  if (customer.role === "ADMIN") {
    console.log(`Already ADMIN: ${customer.email} (${customer.firstName} ${customer.lastName})`);
    process.exit(0);
  }

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: { role: "ADMIN" },
    select: { email: true, firstName: true, lastName: true, role: true },
  });

  console.log(
    `Promoted ${updated.email} (${updated.firstName} ${updated.lastName}) to ${updated.role}.`,
  );
  console.log("They can open /admin after signing in. Role is read from PostgreSQL on each request.");
}

main()
  .catch((error) => {
    console.error("Failed to promote administrator.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
