import type { MetadataRoute } from "next";
import { getAppOriginString } from "@/lib/appUrl";
import { prisma } from "@/server/prisma";
import { logError } from "@/server/log";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getAppOriginString();
  const entries: MetadataRoute.Sitemap = [
    { url: origin, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
  ];

  try {
    const [categories, products] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true, indexable: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.product.findMany({
        where: { isActive: true, indexable: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    for (const category of categories) {
      entries.push({
        url: `${origin}/category/${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
    for (const product of products) {
      entries.push({
        url: `${origin}/product/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (error) {
    logError("sitemap.query_failed", { error });
  }

  return entries;
}
