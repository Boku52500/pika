import "server-only";

import { prisma } from "@/server/db";
import { pickTranslation } from "@/server/locale";

export type AdminBrandRow = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  productCount: number;
};

export type AdminBrandEditorData = {
  id: string;
  slug: string;
  logoUrl: string;
  indexable: boolean;
  sortOrder: number;
  showOnHomepage: boolean;
  homepageSortOrder: number;
  translations: {
    ka: { name: string; description: string; seoTitle: string; seoDescription: string };
    en: { name: string; description: string; seoTitle: string; seoDescription: string };
    ru: { name: string; description: string; seoTitle: string; seoDescription: string };
  };
};

function emptyCopy() {
  return { name: "", description: "", seoTitle: "", seoDescription: "" };
}

function copyFrom(
  rows: { locale: string; name: string; description: string | null; seoTitle: string | null; seoDescription: string | null }[],
  locale: string,
) {
  const row = rows.find((item) => item.locale === locale);
  if (!row) return emptyCopy();
  return {
    name: row.name,
    description: row.description ?? "",
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
  };
}

export async function listAdminBrands(): Promise<AdminBrandRow[]> {
  const brands = await prisma.brand.findMany({
    include: { translations: true, _count: { select: { products: true } } },
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
  });
  return brands.map((brand) => ({
    id: brand.id,
    slug: brand.slug,
    name: pickTranslation(brand.translations).name,
    logoUrl: brand.logoUrl,
    productCount: brand._count.products,
  }));
}

export async function getAdminBrandEditor(id: string): Promise<AdminBrandEditorData | null> {
  const brand = await prisma.brand.findUnique({
    where: { id },
    include: { translations: true },
  });
  if (!brand) return null;
  return {
    id: brand.id,
    slug: brand.slug,
    logoUrl: brand.logoUrl ?? "",
    indexable: brand.indexable,
    sortOrder: brand.sortOrder,
    showOnHomepage: brand.showOnHomepage,
    homepageSortOrder: brand.homepageSortOrder,
    translations: {
      ka: copyFrom(brand.translations, "ka"),
      en: copyFrom(brand.translations, "en"),
      ru: copyFrom(brand.translations, "ru"),
    },
  };
}

export function emptyBrandEditor(): AdminBrandEditorData {
  return {
    id: "",
    slug: "",
    logoUrl: "",
    indexable: true,
    sortOrder: 0,
    showOnHomepage: false,
    homepageSortOrder: 0,
    translations: { ka: emptyCopy(), en: emptyCopy(), ru: emptyCopy() },
  };
}
