import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/admin";
import { getAdminBrandEditor, listAdminBrands } from "@/server/admin/brands";
import { isStorageConfigured } from "@/server/storage";
import { BrandEditor } from "@/components/admin/BrandEditor";

export const metadata: Metadata = { title: "ბრენდის რედაქტირება" };

export default async function AdminEditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/brands/${id}`);
  const [brand, brands, storageConfigured] = await Promise.all([
    getAdminBrandEditor(id),
    listAdminBrands(),
    Promise.resolve(isStorageConfigured()),
  ]);
  if (!brand) notFound();
  const productCount = brands.find((row) => row.id === id)?.productCount ?? 0;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight text-text">{brand.translations.ka.name}</h1>
      <BrandEditor brand={brand} productCount={productCount} storageConfigured={storageConfigured} />
    </div>
  );
}
