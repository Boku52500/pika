import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/admin";
import { getAdminOrder } from "@/server/admin/orders";
import { formatGeorgianDate, formatPrice } from "@/lib/utils";
import { getCityLabel } from "@/lib/checkout";
import {
  DELIVERY_METHOD_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/lib/adminLabels";
import { adminCardClass } from "@/components/admin/adminUi";
import { ProductImage } from "@/components/product/ProductImage";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import type { ProductVisual } from "@/types/product";

export const metadata: Metadata = { title: "შეკვეთა" };

const VISUALS: ProductVisual[] = [
  "phone",
  "laptop",
  "tablet",
  "tv",
  "monitor",
  "gaming",
  "keyboard",
  "components",
  "accessory",
  "audio",
  "smart-home",
  "network",
];

function asVisual(value: string | null): ProductVisual {
  return value && (VISUALS as string[]).includes(value) ? (value as ProductVisual) : "accessory";
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/orders/${id}`);
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const address = [getCityLabel(order.city), order.street, order.building, order.apartment, order.entrance, order.floor]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label text-text-faint">შეკვეთის ნომერი</p>
          <h1 className="tnum text-2xl font-extrabold tracking-tight text-text">{order.orderNumber}</h1>
          <p className="text-small mt-1 text-text-muted">{formatGeorgianDate(new Date(order.createdAt).getTime())}</p>
        </div>
        <div className="text-small text-text-muted">
          {ORDER_STATUS_LABEL[order.orderStatus]} · {PAYMENT_STATUS_LABEL[order.paymentStatus]}
        </div>
      </div>

      <section className={adminCardClass}>
        <h2 className="mb-3 text-base font-semibold text-text">სტატუსის მართვა</h2>
        <OrderStatusForm orderId={order.id} current={order.orderStatus} />
        <p className="text-label mt-3 text-text-faint">
          გადახდის სტატუსი ცალკე რჩება: {PAYMENT_STATUS_LABEL[order.paymentStatus]}. „მიწოდებული“ არ ნიშნავს „გადახდილს“.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={adminCardClass}>
          <h2 className="mb-3 text-base font-semibold text-text">მყიდველი</h2>
          <dl className="grid gap-2 text-small">
            <div>
              <dt className="text-label text-text-faint">სახელი</dt>
              <dd>
                {order.customerFirstName} {order.customerLastName} {order.isGuest ? "(სტუმარი)" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-label text-text-faint">ელ. ფოსტა</dt>
              <dd className="break-all">{order.customerEmail}</dd>
            </div>
            <div>
              <dt className="text-label text-text-faint">ტელეფონი</dt>
              <dd>{order.customerPhone}</dd>
            </div>
          </dl>
        </section>
        <section className={adminCardClass}>
          <h2 className="mb-3 text-base font-semibold text-text">მიწოდება და გადახდა</h2>
          <dl className="grid gap-2 text-small">
            <div>
              <dt className="text-label text-text-faint">მიწოდება</dt>
              <dd>{DELIVERY_METHOD_LABEL[order.deliveryMethod]}</dd>
            </div>
            <div>
              <dt className="text-label text-text-faint">მისამართი</dt>
              <dd>{address}</dd>
            </div>
            {order.additionalInfo ? (
              <div>
                <dt className="text-label text-text-faint">შენიშვნა</dt>
                <dd>{order.additionalInfo}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-label text-text-faint">გადახდა</dt>
              <dd>
                {PAYMENT_METHOD_LABEL[order.paymentMethod]} · {PAYMENT_STATUS_LABEL[order.paymentStatus]}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={adminCardClass}>
        <h2 className="mb-3 text-base font-semibold text-text">პროდუქტები (snapshot)</h2>
        <ul className="divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <ProductImage visual={asVisual(item.visual)} tone={(item.tone as 1 | 2 | 3 | 4 | 5) || 1} className="size-14 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text">{item.productName}</p>
                <p className="text-label text-text-faint">SKU {item.sku}</p>
                {item.variants.length ? (
                  <p className="text-label text-text-faint">
                    {item.variants.map((variant) => `${variant.attribute}: ${variant.option}`).join(" · ")}
                  </p>
                ) : null}
              </div>
              <div className="tnum text-right text-small">
                <p>
                  {item.quantity} × {formatPrice(item.unitPrice)}
                </p>
                <p className="font-semibold">{formatPrice(item.lineTotal)}</p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid gap-1 border-t border-border pt-4 text-small">
          <div className="flex justify-between">
            <dt>ქვეჯამი</dt>
            <dd className="tnum">{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>ფასდაკლება {order.promoCode ? `(${order.promoCode})` : ""}</dt>
            <dd className="tnum">{formatPrice(order.discount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>მიწოდება</dt>
            <dd className="tnum">{formatPrice(order.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>სულ</dt>
            <dd className="tnum">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
