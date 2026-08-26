import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/admin";
import { listAdminBrands } from "@/server/admin/brands";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "ბრენდები" };

export default async function AdminBrandsPage() {
  await requireAdmin("/admin/brands");
  const rows = await listAdminBrands();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text">ბრენდები</h1>
          <p className="text-small mt-1 text-text-muted">{rows.length} ბრენდი</p>
        </div>
        <Button href="/admin/brands/new">ახალი ბრენდი</Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-small text-text-muted">ბრენდები ჯერ არ არის.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left text-small">
            <thead className="bg-surface-2 text-label text-text-faint">
              <tr>
                <th className="px-3 py-2.5 font-medium">ბრენდი</th>
                <th className="px-3 py-2.5 font-medium">Slug</th>
                <th className="px-3 py-2.5 font-medium">პროდუქტები</th>
                <th className="px-3 py-2.5 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium">{row.name}</td>
                  <td className="px-3 py-2.5 text-text-muted">{row.slug}</td>
                  <td className="tnum px-3 py-2.5">{row.productCount}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/brands/${row.id}`} className="font-medium text-brand-700 hover:underline">
                      რედაქტირება
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
