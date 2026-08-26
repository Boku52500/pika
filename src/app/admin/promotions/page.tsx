import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/admin";
import { listAdminPromotions } from "@/server/admin/promotions";
import { Button } from "@/components/ui/Button";
import { ActiveToggle } from "@/components/admin/ActiveToggle";
import { formatPrice } from "@/lib/utils";
import { DISCOUNT_TYPE_LABEL } from "@/lib/adminLabels";

export const metadata: Metadata = { title: "აქციები" };

export default async function AdminPromotionsPage() {
  await requireAdmin("/admin/promotions");
  const rows = await listAdminPromotions();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text">აქციები</h1>
          <p className="text-small mt-1 text-text-muted">{rows.length} აქცია</p>
        </div>
        <Button href="/admin/promotions/new">ახალი აქცია</Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-small text-text-muted">აქციები ჯერ არ არის.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-surface">
          <table className="w-full min-w-[760px] text-left text-small">
            <thead className="bg-surface-2 text-label text-text-faint">
              <tr>
                <th className="px-3 py-2.5 font-medium">კოდი</th>
                <th className="px-3 py-2.5 font-medium">სახელი</th>
                <th className="px-3 py-2.5 font-medium">ფასდაკლება</th>
                <th className="px-3 py-2.5 font-medium">ლიმიტი</th>
                <th className="px-3 py-2.5 font-medium">სტატუსი</th>
                <th className="px-3 py-2.5 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium">{row.code || "—"}</td>
                  <td className="px-3 py-2.5">{row.name}</td>
                  <td className="px-3 py-2.5">
                    {DISCOUNT_TYPE_LABEL[row.type]} · {row.type === "percentage" ? `${row.value}%` : formatPrice(row.value)}
                  </td>
                  <td className="tnum px-3 py-2.5">
                    {row.usedCount}
                    {row.usageLimit != null ? ` / ${row.usageLimit}` : ""}
                  </td>
                  <td className="px-3 py-2.5">{row.isActive ? "აქტიური" : "გამორთული"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/promotions/${row.id}`} className="font-medium text-brand-700 hover:underline">
                        რედაქტირება
                      </Link>
                      <ActiveToggle id={row.id} isActive={row.isActive} kind="promotion" />
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
