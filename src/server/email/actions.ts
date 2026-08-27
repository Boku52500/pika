"use server";

import { prisma } from "@/server/db";
import { requireAdminAction } from "@/server/auth/admin";
import { GENERIC_SERVER_ERROR, type ActionResult } from "@/server/actions/result";
import { revalidateOrders } from "@/server/admin/revalidate";
import { logError } from "@/server/log";
import {
  notifyOrderConfirmation,
  notifyOrderStatus,
  notifyPaymentPaid,
  notifyRefund,
} from "@/server/email/notify";

export async function retryAdminEmailDelivery(input: unknown): Promise<ActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate;

  const id =
    typeof input === "object" && input && "id" in input
      ? String((input as { id: unknown }).id ?? "").trim()
      : "";
  if (!id) return { ok: false, message: "წერილი ვერ მოიძებნა" };

  const row = await prisma.emailDelivery.findUnique({ where: { id } });
  if (!row) return { ok: false, message: "წერილი ვერ მოიძებნა" };
  if (row.status === "sent") {
    return { ok: false, message: "ეს წერილი უკვე გაიგზავნა." };
  }

  try {
    if (row.type === "order_confirmation" && row.orderId) {
      await notifyOrderConfirmation(row.orderId);
    } else if (row.type === "payment_paid" && row.paymentId) {
      await notifyPaymentPaid(row.paymentId);
    } else if (row.type === "refund_partial" && row.paymentId) {
      await notifyRefund(row.paymentId, "partial");
    } else if (row.type === "refund_full" && row.paymentId) {
      await notifyRefund(row.paymentId, "full");
    } else if (row.type === "order_status" && row.orderId) {
      const status = row.eventKey.split(":").pop();
      if (!status) return { ok: false, message: "წერილის ხელახლა გაგზავნა ვერ მოხერხდა." };
      await notifyOrderStatus(row.orderId, status);
    } else {
      return { ok: false, message: "ამ წერილის ხელახლა გაგზავნა შეუძლებელია." };
    }
    revalidateOrders();
    const after = await prisma.emailDelivery.findUnique({ where: { id } });
    if (after?.status === "sent") return { ok: true };
    return { ok: false, message: "წერილი ვერ გაიგზავნა. სცადეთ ხელახლა." };
  } catch (error) {
    logError("email.retry_failed", { error, deliveryId: id });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}
