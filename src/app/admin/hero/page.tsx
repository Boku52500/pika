import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/admin";
import { listAdminHeroSlides } from "@/server/admin/hero";
import { isStorageConfigured } from "@/server/storage";
import { HeroAdminManager } from "@/components/admin/HeroAdminManager";

export const metadata: Metadata = { title: "ჰერო ბანერები" };

export default async function AdminHeroPage() {
  await requireAdmin("/admin/hero");
  const [slides, storageConfigured] = await Promise.all([listAdminHeroSlides(), Promise.resolve(isStorageConfigured())]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-text">ჰერო ბანერები</h1>
        <p className="text-small mt-1 text-text-muted">
          მთავარი გვერდის სურათიანი ბანერები — ატვირთვა, რიგი, აქტიურობა და გადამისამართება.
        </p>
      </div>
      <HeroAdminManager initialSlides={slides} storageConfigured={storageConfigured} />
    </div>
  );
}
