import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { pickTranslation } from "@/server/locale";
import { normalizeReusableLabel, reusableIdentityKey, reusableSlugOrFallback } from "@/lib/reusableLabel";

const GENERAL_GROUP_SLUG = "general";

export type AdminSpecValue = {
  id: string;
  slug: string;
  name: string;
  usageCount: number;
};

export type AdminSpecLibraryRow = {
  id: string;
  slug: string;
  name: string;
  unit: string | null;
  groupId: string;
  groupName: string;
  usageCount: number;
  values: AdminSpecValue[];
};

export type AdminSpecDefinitionOption = {
  id: string;
  slug: string;
  name: string;
  unit: string | null;
  values: { id: string; name: string }[];
};

async function ensureGeneralGroup(tx: Prisma.TransactionClient) {
  const existing = await tx.specificationGroup.findUnique({ where: { slug: GENERAL_GROUP_SLUG } });
  if (existing) return existing;
  return tx.specificationGroup.create({
    data: {
      slug: GENERAL_GROUP_SLUG,
      sortOrder: 999,
      translations: { create: { locale: "ka", name: "სხვა" } },
    },
  });
}

function matchesLabel(
  rows: { locale: string; name: string }[],
  key: string,
): boolean {
  return rows.some((row) => reusableIdentityKey(row.name) === key);
}

export async function listAdminSpecLibrary(query = ""): Promise<AdminSpecLibraryRow[]> {
  const q = query.trim();
  const definitions = await prisma.specificationDefinition.findMany({
    include: {
      translations: true,
      group: { include: { translations: true } },
      libraryValues: {
        include: { translations: true, _count: { select: { usages: true } } },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { values: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const rows = definitions.map((definition) => ({
    id: definition.id,
    slug: definition.slug,
    name: pickTranslation(definition.translations).name,
    unit: definition.unit,
    groupId: definition.groupId,
    groupName: pickTranslation(definition.group.translations).name,
    usageCount: definition._count.values,
    values: definition.libraryValues.map((value) => ({
      id: value.id,
      slug: value.slug,
      name: pickTranslation(value.translations).name,
      usageCount: value._count.usages,
    })),
  }));

  if (!q) return rows;
  const needle = reusableIdentityKey(q);
  return rows.filter(
    (row) =>
      reusableIdentityKey(row.name).includes(needle) ||
      row.slug.includes(q.toLowerCase()) ||
      row.values.some((value) => reusableIdentityKey(value.name).includes(needle)),
  );
}

export async function listAdminSpecDefinitions(): Promise<AdminSpecDefinitionOption[]> {
  const definitions = await prisma.specificationDefinition.findMany({
    include: {
      translations: true,
      libraryValues: { include: { translations: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  });
  return definitions.map((definition) => ({
    id: definition.id,
    slug: definition.slug,
    name: pickTranslation(definition.translations).name,
    unit: definition.unit,
    values: definition.libraryValues.map((value) => ({
      id: value.id,
      name: pickTranslation(value.translations).name,
    })),
  }));
}

export async function findOrCreateSpecificationDefinition(
  tx: Prisma.TransactionClient,
  rawName: string,
): Promise<{ id: string; name: string }> {
  const name = normalizeReusableLabel(rawName);
  if (!name) throw new Error("INVALID_SPEC_NAME");
  const key = reusableIdentityKey(name);
  const slug = reusableSlugOrFallback(name, "spec");

  const existing = await tx.specificationDefinition.findMany({
    include: { translations: true },
  });
  const match = existing.find(
    (row) => row.slug === slug || matchesLabel(row.translations, key),
  );
  if (match) {
    return { id: match.id, name: pickTranslation(match.translations).name || name };
  }

  const group = await ensureGeneralGroup(tx);
  const created = await tx.specificationDefinition.create({
    data: {
      groupId: group.id,
      slug,
      sortOrder: existing.length,
      translations: { create: { locale: "ka", name } },
    },
    include: { translations: true },
  });
  return { id: created.id, name };
}

export async function findOrCreateSpecificationValue(
  tx: Prisma.TransactionClient,
  specificationId: string,
  rawName: string,
): Promise<{ id: string; name: string }> {
  const name = normalizeReusableLabel(rawName);
  if (!name) throw new Error("INVALID_SPEC_VALUE");
  const key = reusableIdentityKey(name);
  const slug = reusableSlugOrFallback(name, "val");

  const existing = await tx.specificationValue.findMany({
    where: { specificationId },
    include: { translations: true },
  });
  const match = existing.find(
    (row) => row.slug === slug || matchesLabel(row.translations, key),
  );
  if (match) {
    return { id: match.id, name: pickTranslation(match.translations).name || name };
  }

  const created = await tx.specificationValue.create({
    data: {
      specificationId,
      slug,
      sortOrder: existing.length,
      translations: { create: { locale: "ka", name } },
    },
    include: { translations: true },
  });
  return { id: created.id, name };
}

export async function renameSpecificationDefinition(id: string, rawName: string) {
  const name = normalizeReusableLabel(rawName);
  if (!name) throw new Error("INVALID_SPEC_NAME");
  const slug = reusableSlugOrFallback(name, "spec");
  await prisma.$transaction(async (tx) => {
    const current = await tx.specificationDefinition.findUnique({ where: { id } });
    if (!current) throw new Error("NOT_FOUND");
    const clash = await tx.specificationDefinition.findFirst({
      where: {
        id: { not: id },
        OR: [
          { slug },
          { translations: { some: { locale: "ka", name: { equals: name, mode: "insensitive" } } } },
        ],
      },
    });
    if (clash) throw new Error("DUPLICATE");
    await tx.specificationDefinition.update({
      where: { id },
      data: { slug },
    });
    await tx.specificationDefinitionTranslation.upsert({
      where: { specificationId_locale: { specificationId: id, locale: "ka" } },
      create: { specificationId: id, locale: "ka", name },
      update: { name },
    });
  });
}

export async function renameSpecificationValue(id: string, rawName: string) {
  const name = normalizeReusableLabel(rawName);
  if (!name) throw new Error("INVALID_SPEC_VALUE");
  const slug = reusableSlugOrFallback(name, "val");
  await prisma.$transaction(async (tx) => {
    const current = await tx.specificationValue.findUnique({ where: { id } });
    if (!current) throw new Error("NOT_FOUND");
    const clash = await tx.specificationValue.findFirst({
      where: {
        id: { not: id },
        specificationId: current.specificationId,
        OR: [
          { slug },
          { translations: { some: { locale: "ka", name: { equals: name, mode: "insensitive" } } } },
        ],
      },
    });
    if (clash) throw new Error("DUPLICATE");
    await tx.specificationValue.update({ where: { id }, data: { slug } });
    await tx.specificationValueTranslation.upsert({
      where: { valueId_locale: { valueId: id, locale: "ka" } },
      create: { valueId: id, locale: "ka", name },
      update: { name },
    });
    await tx.productSpecification.updateMany({
      where: { valueId: id },
      data: { value: name },
    });
  });
}

export async function deleteUnusedSpecificationValue(id: string) {
  const value = await prisma.specificationValue.findUnique({
    where: { id },
    include: { _count: { select: { usages: true } } },
  });
  if (!value) throw new Error("NOT_FOUND");
  if (value._count.usages > 0) throw new Error("IN_USE");
  await prisma.specificationValue.delete({ where: { id } });
}

export async function deleteUnusedSpecificationDefinition(id: string) {
  const definition = await prisma.specificationDefinition.findUnique({
    where: { id },
    include: { _count: { select: { values: true } } },
  });
  if (!definition) throw new Error("NOT_FOUND");
  if (definition._count.values > 0) throw new Error("IN_USE");
  await prisma.specificationDefinition.delete({ where: { id } });
}
