import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { pickTranslation } from "@/server/locale";
import { normalizeReusableLabel, reusableIdentityKey, reusableSlugOrFallback } from "@/lib/reusableLabel";

export async function findOrCreateVariantOption(
  tx: Prisma.TransactionClient,
  attributeId: string,
  rawName: string,
): Promise<{ id: string; name: string; slug: string }> {
  const name = normalizeReusableLabel(rawName);
  if (!name) throw new Error("INVALID_OPTION_NAME");
  const key = reusableIdentityKey(name);
  const slug = reusableSlugOrFallback(name, "opt");

  const existing = await tx.variantAttributeOption.findMany({
    where: { attributeId },
    include: { translations: true },
  });
  const match = existing.find(
    (row) => row.slug === slug || row.translations.some((translation) => reusableIdentityKey(translation.name) === key),
  );
  if (match) {
    return {
      id: match.id,
      slug: match.slug,
      name: pickTranslation(match.translations).name || name,
    };
  }

  const created = await tx.variantAttributeOption.create({
    data: {
      attributeId,
      slug,
      sortOrder: existing.length,
      translations: { create: { locale: "ka", name } },
    },
    include: { translations: true },
  });
  return { id: created.id, slug: created.slug, name };
}

export async function createReusableVariantOption(attributeId: string, rawName: string) {
  const attribute = await prisma.variantAttribute.findUnique({
    where: { id: attributeId },
    select: { id: true },
  });
  if (!attribute) throw new Error("NOT_FOUND");
  return prisma.$transaction((tx) => findOrCreateVariantOption(tx, attributeId, rawName));
}
