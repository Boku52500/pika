import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/admin";
import { emptyBrandEditor } from "@/server/admin/brands";
import { BrandEditor } from "@/components/admin/BrandEditor";

export const metadata: Metadata = { title: "ახალი ბრენდი" };

export default async function AdminNewBrandPage() {
  await requireAdmin("/admin/brands/new");
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight text-text">ახალი ბრენდი</h1>
      <BrandEditor isNew brand={emptyBrandEditor()} />
    </div>
  );
}
