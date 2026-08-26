import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/admin";
import { emptyPromotionEditor } from "@/server/admin/promotions";
import { PromotionEditor } from "@/components/admin/PromotionEditor";

export const metadata: Metadata = { title: "ახალი აქცია" };

export default async function AdminNewPromotionPage() {
  await requireAdmin("/admin/promotions/new");
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight text-text">ახალი აქცია</h1>
      <PromotionEditor isNew promotion={emptyPromotionEditor()} />
    </div>
  );
}
