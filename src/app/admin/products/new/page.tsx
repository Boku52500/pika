import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/admin";
import { emptyProductEditor, getAdminCatalogLookups } from "@/server/admin/products";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { isStorageConfigured } from "@/server/storage/config";

export const metadata: Metadata = { title: "ახალი პროდუქტი" };

export default async function AdminNewProductPage() {
  await requireAdmin("/admin/products/new");
  const lookups = await getAdminCatalogLookups();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight text-text">ახალი პროდუქტი</h1>
      <ProductEditor
        isNew
        product={emptyProductEditor()}
        brands={lookups.brands}
        categories={lookups.categories}
        variantAttributes={lookups.variantAttributes}
        specGroups={lookups.specGroups}
        storageConfigured={isStorageConfigured()}
      />
    </div>
  );
}
