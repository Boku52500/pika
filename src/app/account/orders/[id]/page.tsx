import type { Metadata } from "next";
import { OrderDetailPageClient } from "@/components/account/OrderDetailPageClient";
import { requireCustomer } from "@/server/auth/session";
import { getCustomerOrder } from "@/server/account/orders";

export const metadata: Metadata = {
  title: "შეკვეთის დეტალები — Pika",
  description: "შეკვეთის სრული დეტალები.",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await requireCustomer("/account/orders");
  const order = await getCustomerOrder(customer.id, decodeURIComponent(id));
  return <OrderDetailPageClient order={order} />;
}
