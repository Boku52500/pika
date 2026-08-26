import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPageClient } from "@/components/category/CategoryPageClient";
import { loadStorefrontCategoryPage } from "@/server/catalog";
import { noIndexRobots, pageCanonical } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadStorefrontCategoryPage(slug);
  if (!page) notFound();

  return {
    title: page.seoTitle ?? `${page.category.name} — Pika`,
    description: page.seoDescription ?? page.category.description,
    robots: page.indexable ? undefined : noIndexRobots,
    ...pageCanonical(`/category/${slug}`, page.canonicalOverride),
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await loadStorefrontCategoryPage(slug);
  if (!page) notFound();

  return <CategoryPageClient category={page.category} products={page.products} />;
}
