import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/admin";
import { listAdminSpecLibrary } from "@/server/admin/specifications";
import { SpecificationLibrary } from "@/components/admin/SpecificationLibrary";

export const metadata: Metadata = { title: "სპეციფიკაციები" };

export default async function AdminSpecificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin("/admin/specifications");
  const params = await searchParams;
  const rows = await listAdminSpecLibrary(params.q ?? "");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-text">სპეციფიკაციები</h1>
        <p className="text-small mt-1 text-text-muted">გამოიყენეთ ერთი და იგივე სპეციფიკაციები და მნიშვნელობები ყველა პროდუქტზე.</p>
      </div>
      <SpecificationLibrary initialRows={rows} />
    </div>
  );
}
