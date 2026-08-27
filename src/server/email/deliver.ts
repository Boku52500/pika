import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { EmailEventType } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logError } from "@/server/log";
import { recipientDomain } from "@/server/email/events";
import { sendTransactionalEmail } from "@/server/email/send";

export type DeliverInput = {
  eventKey: string;
  type: EmailEventType;
  recipient: string;
  subject: string;
  html: string;
  text: string;
  orderId?: string | null;
  paymentId?: string | null;
  refundId?: string | null;
  customerId?: string | null;
};

function sanitizeError(reason: string): string {
  return reason.replace(/re_[a-zA-Z0-9]+/g, "[redacted]").slice(0, 240);
}

export async function deliverEmail(input: DeliverInput): Promise<"sent" | "skipped" | "failed"> {
  const existing = await prisma.emailDelivery.findUnique({ where: { eventKey: input.eventKey } });
  if (existing?.status === "sent") return "skipped";

  let deliveryId = existing?.id;
  if (!deliveryId) {
    try {
      const created = await prisma.emailDelivery.create({
        data: {
          eventKey: input.eventKey,
          type: input.type,
          status: "pending",
          recipient: input.recipient,
          recipientDomain: recipientDomain(input.recipient),
          subject: input.subject,
          orderId: input.orderId ?? undefined,
          paymentId: input.paymentId ?? undefined,
          refundId: input.refundId ?? undefined,
          customerId: input.customerId ?? undefined,
        },
      });
      deliveryId = created.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raced = await prisma.emailDelivery.findUnique({ where: { eventKey: input.eventKey } });
        if (raced?.status === "sent") return "skipped";
        deliveryId = raced?.id;
      } else {
        logError("email.deliver_failed", { error, type: input.type });
        return "failed";
      }
    }
  }

  if (!deliveryId) return "failed";

  const sent = await sendTransactionalEmail({
    to: input.recipient,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (sent.ok) {
    await prisma.emailDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "sent",
        providerMessageId: sent.messageId,
        attempts: { increment: 1 },
        lastError: null,
        sentAt: new Date(),
      },
    });
    return "sent";
  }

  await prisma.emailDelivery.update({
    where: { id: deliveryId },
    data: {
      status: "failed",
      attempts: { increment: 1 },
      lastError: sanitizeError(sent.message),
    },
  });
  return "failed";
}
