import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/admin";
import { getAdminCategoryEditor, listAdminCategories } from "@/server/admin/categories";
import { isStorageConfigured } from "@/server/storage";
import { CategoryEditor } from "@/components/admin/CategoryEditor";

export const metadata: Metadata = { title: "კატეგორიის რედაქტირება" };

export default async function AdminEditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/categories/${id}`);
  const [category, allCategories] = await Promise.all([getAdminCategoryEditor(id), listAdminCategories()]);
  if (!category) notFound();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight text-text">{category.translations.ka.name}</h1>
      <CategoryEditor category={category} allCategories={allCategories} storageConfigured={isStorageConfigured()} />
    </div>
  );
}
