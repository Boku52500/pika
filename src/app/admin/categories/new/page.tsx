import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/admin";
import { emptyCategoryEditor, listAdminCategories } from "@/server/admin/categories";
import { isStorageConfigured } from "@/server/storage";
import { CategoryEditor } from "@/components/admin/CategoryEditor";

export const metadata: Metadata = { title: "ახალი კატეგორია" };

export default async function AdminNewCategoryPage() {
  await requireAdmin("/admin/categories/new");
  const allCategories = await listAdminCategories();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight text-text">ახალი კატეგორია</h1>
      <CategoryEditor isNew category={emptyCategoryEditor()} allCategories={allCategories} storageConfigured={isStorageConfigured()} />
    </div>
  );
}
