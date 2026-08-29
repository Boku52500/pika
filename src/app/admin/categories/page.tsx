import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/admin";
import { listAdminCategories } from "@/server/admin/categories";
import { Button } from "@/components/ui/Button";
import { ActiveToggle } from "@/components/admin/ActiveToggle";
import { MainNavToggle } from "@/components/admin/MainNavToggle";

export const metadata: Metadata = { title: "კატეგორიები" };

export default async function AdminCategoriesPage() {
  await requireAdmin("/admin/categories");
  const rows = await listAdminCategories();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text">კატეგორიები</h1>
          <p className="text-small mt-1 text-text-muted">{rows.length} კატეგორია</p>
        </div>
        <Button href="/admin/categories/new">ახალი კატეგორია</Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-small text-text-muted">კატეგორიები ჯერ არ არის.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-surface">
          <table className="w-full min-w-[720px] text-left text-small">
            <thead className="bg-surface-2 text-label text-text-faint">
              <tr>
                <th className="px-3 py-2.5 font-medium">დასახელება</th>
                <th className="px-3 py-2.5 font-medium">Slug</th>
                <th className="px-3 py-2.5 font-medium">ნავიგაცია</th>
                <th className="px-3 py-2.5 font-medium">რიგი</th>
                <th className="px-3 py-2.5 font-medium">პროდუქტები</th>
                <th className="px-3 py-2.5 font-medium">სტატუსი</th>
                <th className="px-3 py-2.5 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium" style={{ paddingInlineStart: `${12 + row.depth * 16}px` }}>
                    {row.name}
                  </td>
                  <td className="px-3 py-2.5 text-text-muted">{row.slug}</td>
                  <td className="px-3 py-2.5">{row.showInMainNav ? "მთავარ ნავიგაციაში" : "—"}</td>
                  <td className="tnum px-3 py-2.5">{row.showInMainNav ? row.navSortOrder : row.sortOrder}</td>
                  <td className="tnum px-3 py-2.5">{row.productCount}</td>
                  <td className="px-3 py-2.5">{row.isActive ? "აქტიური" : "გამორთული"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/categories/${row.id}`} className="font-medium text-brand-700 hover:underline">
                        რედაქტირება
                      </Link>
                      {row.parentId == null ? (
                        <MainNavToggle id={row.id} showInMainNav={row.showInMainNav} />
                      ) : null}
                      <ActiveToggle id={row.id} isActive={row.isActive} kind="category" />
                    </div>
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
