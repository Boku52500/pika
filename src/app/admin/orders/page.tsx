import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/admin";
import { listAdminOrders } from "@/server/admin/orders";
import { Button } from "@/components/ui/Button";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { adminInputClass, adminSelectClass } from "@/components/admin/adminUi";
import { formatGeorgianDate, formatPrice } from "@/lib/utils";
import {
  DELIVERY_METHOD_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/lib/adminLabels";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "შეკვეთები" };

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin("/admin/orders");
  const params = await searchParams;
  const q = param(params.q);
  const orderStatus = (param(params.status) || "all") as OrderStatus | "all";
  const paymentStatus = (param(params.payment) || "all") as PaymentStatus | "all";
  const page = Math.max(1, Number(param(params.page) || "1") || 1);

  const { rows, total, totalPages } = await listAdminOrders({ q, orderStatus, paymentStatus, page });

  const hrefForPage = (nextPage: number) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (orderStatus !== "all") search.set("status", orderStatus);
    if (paymentStatus !== "all") search.set("payment", paymentStatus);
    if (nextPage > 1) search.set("page", String(nextPage));
    const qs = search.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-text">შეკვეთები</h1>
        <p className="text-small mt-1 text-text-muted">{total} შეკვეთა</p>
      </div>

      <form method="get" className="grid gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-[0.8125rem] font-medium">ძიება</span>
          <input name="q" defaultValue={q} placeholder="ნომერი, ელ. ფოსტა, ტელეფონი" className={adminInputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[0.8125rem] font-medium">შეკვეთის სტატუსი</span>
          <select name="status" defaultValue={orderStatus} className={adminSelectClass}>
            <option value="all">ყველა</option>
            {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[0.8125rem] font-medium">გადახდა</span>
          <select name="payment" defaultValue={paymentStatus} className={adminSelectClass}>
            <option value="all">ყველა</option>
            {Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" variant="secondary" className="w-full">
            ფილტრი
          </Button>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-small text-text-muted">შეკვეთები ვერ მოიძებნა.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-surface">
          <table className="w-full min-w-[860px] text-left text-small">
            <thead className="bg-surface-2 text-label text-text-faint">
              <tr>
                <th className="px-3 py-2.5 font-medium">ნომერი</th>
                <th className="px-3 py-2.5 font-medium">მყიდველი</th>
                <th className="px-3 py-2.5 font-medium">თარიღი</th>
                <th className="px-3 py-2.5 font-medium">პროდუქტები</th>
                <th className="px-3 py-2.5 font-medium">ჯამი</th>
                <th className="px-3 py-2.5 font-medium">სტატუსი</th>
                <th className="px-3 py-2.5 font-medium">მიწოდება</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/orders/${row.id}`} className="font-medium text-brand-700 hover:underline">
                      {row.orderNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <p>{row.customerName || "—"} {row.isGuest ? <span className="text-text-faint">(სტუმარი)</span> : null}</p>
                    <p className="text-label text-text-faint">{row.customerEmail}</p>
                    <p className="text-label text-text-faint">{row.customerPhone}</p>
                  </td>
                  <td className="px-3 py-2.5">{formatGeorgianDate(new Date(row.createdAt).getTime())}</td>
                  <td className="tnum px-3 py-2.5">{row.itemCount}</td>
                  <td className="tnum px-3 py-2.5 font-medium">{formatPrice(row.total)}</td>
                  <td className="px-3 py-2.5">
                    {ORDER_STATUS_LABEL[row.orderStatus]}
                    <span className="block text-label text-text-faint">{PAYMENT_STATUS_LABEL[row.paymentStatus]}</span>
                  </td>
                  <td className="px-3 py-2.5">{DELIVERY_METHOD_LABEL[row.deliveryMethod]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} hrefForPage={hrefForPage} />
    </div>
  );
}
