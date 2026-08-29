import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/admin";
import { listAdminFilterOptions, listAdminProducts } from "@/server/admin/products";
import { Button } from "@/components/ui/Button";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { adminInputClass, adminSelectClass } from "@/components/admin/adminUi";
import { formatPrice } from "@/lib/utils";
import { STOCK_STATE_LABEL } from "@/lib/adminLabels";
import { AdminProductDeleteButton } from "@/components/admin/AdminProductDeleteButton";

export const metadata: Metadata = { title: "პროდუქტები" };

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin("/admin/products");
  const params = await searchParams;
  const q = param(params.q);
  const categoryId = param(params.category);
  const brandId = param(params.brand);
  const active = (param(params.active) || "all") as "all" | "active" | "inactive" | "archived";
  const stock = (param(params.stock) || "all") as "all" | "in-stock" | "low-stock" | "out-of-stock";
  const page = Math.max(1, Number(param(params.page) || "1") || 1);

  const [{ rows, total, totalPages }, filters] = await Promise.all([
    listAdminProducts({ q, categoryId: categoryId || undefined, brandId: brandId || undefined, active, stock, page }),
    listAdminFilterOptions(),
  ]);

  const hrefForPage = (nextPage: number) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (categoryId) search.set("category", categoryId);
    if (brandId) search.set("brand", brandId);
    if (active !== "all") search.set("active", active);
    if (stock !== "all") search.set("stock", stock);
    if (nextPage > 1) search.set("page", String(nextPage));
    const qs = search.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text">პროდუქტები</h1>
          <p className="text-small mt-1 text-text-muted">{total} ჩანაწერი</p>
        </div>
        <Button href="/admin/products/new">ახალი პროდუქტი</Button>
      </div>

      <form
        method="get"
        autoComplete="off"
        key={`${q}|${categoryId}|${brandId}|${active}|${stock}|${page}`}
        className="grid gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <label className="flex flex-col gap-1 lg:col-span-2">
          <span className="text-[0.8125rem] font-medium">ძიება</span>
          <input name="q" defaultValue={q} placeholder="სახელი, SKU, slug" autoComplete="off" className={adminInputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[0.8125rem] font-medium">კატეგორია</span>
          <select name="category" defaultValue={categoryId} className={adminSelectClass}>
            <option value="">ყველა</option>
            {filters.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[0.8125rem] font-medium">ბრენდი</span>
          <select name="brand" defaultValue={brandId} className={adminSelectClass}>
            <option value="">ყველა</option>
            {filters.brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[0.8125rem] font-medium">სტატუსი</span>
          <select name="active" defaultValue={active} className={adminSelectClass}>
            <option value="all">ყველა</option>
            <option value="active">აქტიური</option>
            <option value="inactive">გამორთული</option>
            <option value="archived">არქივი</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[0.8125rem] font-medium">მარაგი</span>
          <select name="stock" defaultValue={stock} className={adminSelectClass}>
            <option value="all">ყველა</option>
            <option value="in-stock">მარაგშია</option>
            <option value="low-stock">მარაგი იწურება</option>
            <option value="out-of-stock">მარაგში არ არის</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" variant="secondary" className="w-full">
            ფილტრი
          </Button>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-small text-text-muted">პროდუქტები ამ ფილტრით ვერ მოიძებნა.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-surface">
          <table className="w-full min-w-[860px] text-left text-small">
            <thead className="bg-surface-2 text-label text-text-faint">
              <tr>
                <th className="px-3 py-2.5 font-medium">პროდუქტი</th>
                <th className="px-3 py-2.5 font-medium">SKU</th>
                <th className="px-3 py-2.5 font-medium">ბრენდი</th>
                <th className="px-3 py-2.5 font-medium">კატეგორია</th>
                <th className="px-3 py-2.5 font-medium">ფასი</th>
                <th className="px-3 py-2.5 font-medium">მარაგი</th>
                <th className="px-3 py-2.5 font-medium">სტატუსი</th>
                <th className="px-3 py-2.5 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="size-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-surface-2">
                        {row.imageUrl && (row.imageUrl.startsWith("http") || row.imageUrl.startsWith("/")) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.imageUrl} alt={row.imageAlt} className="size-full object-cover" />
                        ) : (
                          <div className="size-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-medium text-text">{row.name}</p>
                        {row.isFeatured || row.isNew || row.badgeLabel ? (
                          <p className="text-label text-text-faint">
                            {[row.isFeatured ? "რჩეული" : null, row.isNew ? "ახალი" : null, row.badgeLabel || null]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="tnum px-3 py-2.5">{row.sku}</td>
                  <td className="px-3 py-2.5">{row.brandName}</td>
                  <td className="px-3 py-2.5">{row.categoryName}</td>
                  <td className="px-3 py-2.5">
                    <span className="tnum font-medium">{formatPrice(row.price)}</span>
                    {row.previousPrice != null ? (
                      <span className="tnum block text-label text-text-faint line-through">{formatPrice(row.previousPrice)}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="tnum">{row.stockQuantity}</span>
                    <span className="block text-label text-text-faint">{STOCK_STATE_LABEL[row.stockState]}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {row.deletedAt ? "არქივი" : row.isActive ? "აქტიური" : "გამორთული"}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col items-start gap-1">
                      <Link href={`/admin/products/${row.id}`} className="font-medium text-brand-700 hover:underline">
                        რედაქტირება
                      </Link>
                      {!row.deletedAt ? (
                        <AdminProductDeleteButton
                          productId={row.id}
                          productName={row.name}
                          className="font-medium text-danger-600 hover:underline"
                        />
                      ) : null}
                    </div>
                  </td>
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
