import "server-only";

import { cookies } from "next/headers";
import { ORDER_CONFIRM_COOKIE } from "@/server/account/orders";

export async function customerCanAccessOrder(order: {
  orderNumber: string;
  customerId: string | null;
}, customerId: string | null): Promise<boolean> {
  if (customerId && order.customerId === customerId) return true;
  const jar = await cookies();
  return jar.get(ORDER_CONFIRM_COOKIE)?.value === order.orderNumber;
}
