import { prisma } from "@/server/prisma";

/**
 * Resolve a retired Category.slug to its canonical Latin slug.
 * Returns null when there is no redirect (caller should 404 / load normally).
 * Guards against redirect loops (old === new, or new redirects back).
 */
export async function resolveCategorySlugRedirect(oldSlug: string): Promise<string | null> {
  const row = await prisma.categorySlugRedirect.findUnique({
    where: { oldSlug },
    select: { newSlug: true },
  });
  if (!row?.newSlug) return null;
  if (row.newSlug === oldSlug) return null;

  // Avoid one-hop loops: if the target also redirects to the original, ignore.
  const bounce = await prisma.categorySlugRedirect.findUnique({
    where: { oldSlug: row.newSlug },
    select: { newSlug: true },
  });
  if (bounce?.newSlug === oldSlug) return null;

  return row.newSlug;
}
