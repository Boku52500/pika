import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/admin";
import { getAdminPromotionEditor } from "@/server/admin/promotions";
import { PromotionEditor } from "@/components/admin/PromotionEditor";

export const metadata: Metadata = { title: "აქციის რედაქტირება" };

export default async function AdminEditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/promotions/${id}`);
  const promotion = await getAdminPromotionEditor(id);
  if (!promotion) notFound();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight text-text">{promotion.code || promotion.name}</h1>
      <PromotionEditor promotion={promotion} />
    </div>
  );
}
