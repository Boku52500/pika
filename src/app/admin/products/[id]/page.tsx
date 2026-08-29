import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/admin";
import { getAdminCatalogLookups, getAdminProductEditor } from "@/server/admin/products";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { isStorageConfigured } from "@/server/storage/config";

export const metadata: Metadata = { title: "პროდუქტის რედაქტირება" };

export default async function AdminEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/products/${id}`);
  const [product, lookups] = await Promise.all([getAdminProductEditor(id), getAdminCatalogLookups()]);
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-text">{product.translations.ka.name || "პროდუქტი"}</h1>
        <p className="text-small mt-1 text-text-muted">
          {product.sku} · {product.slug}
        </p>
      </div>
      <ProductEditor
        product={product}
        brands={lookups.brands}
        categories={lookups.categories}
        variantAttributes={lookups.variantAttributes}
        specDefinitions={lookups.specDefinitions}
        storageConfigured={isStorageConfigured()}
      />
    </div>
  );
}
