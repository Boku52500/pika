import "server-only";

import { prisma } from "@/server/db";

export type AdminHeroSlideRow = {
  id: string;
  imageUrl: string;
  objectKey: string | null;
  href: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
};

export async function listAdminHeroSlides(): Promise<AdminHeroSlideRow[]> {
  const rows = await prisma.heroSlide.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    imageUrl: row.imageUrl,
    objectKey: row.objectKey,
    href: row.href ?? "",
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getAdminHeroSlide(id: string): Promise<AdminHeroSlideRow | null> {
  const row = await prisma.heroSlide.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    imageUrl: row.imageUrl,
    objectKey: row.objectKey,
    href: row.href ?? "",
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
  };
}
