"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { retryAdminEmailDelivery } from "@/server/email/actions";
import { EMAIL_DELIVERY_STATUS_LABEL, EMAIL_EVENT_LABEL } from "@/lib/adminLabels";
import { formatGeorgianDate } from "@/lib/utils";

export type AdminEmailRow = {
  id: string;
  type: keyof typeof EMAIL_EVENT_LABEL;
  status: keyof typeof EMAIL_DELIVERY_STATUS_LABEL;
  recipient: string;
  subject: string;
  providerMessageId: string | null;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
};

export function AdminEmailHistory({ emails }: { emails: AdminEmailRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function retry(id: string) {
    setMessage(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await retryAdminEmailDelivery({ id });
      setPendingId(null);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-border bg-surface p-4 sm:p-5">
      <h2 className="mb-3 text-base font-semibold text-text">ტრანზაქციული წერილები</h2>
      {emails.length === 0 ? (
        <p className="text-small text-text-muted">ამ შეკვეთაზე წერილი ჯერ არ არის.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {emails.map((row) => (
            <li key={row.id} className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-border p-3 text-small sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-text">
                  {EMAIL_EVENT_LABEL[row.type]} · {EMAIL_DELIVERY_STATUS_LABEL[row.status]}
                </p>
                <p className="text-label text-text-faint">{row.subject}</p>
                <p className="text-label text-text-muted">
                  {formatGeorgianDate(new Date(row.sentAt ?? row.createdAt).getTime())}
                </p>
                {row.status === "failed" && row.lastError ? (
                  <p className="text-label text-danger-600">{row.lastError}</p>
                ) : null}
              </div>
              {row.status !== "sent" ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() => retry(row.id)}
                >
                  {pending && pendingId === row.id ? "იგზავნება..." : "ხელახლა გაგზავნა"}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {message ? (
        <p role="alert" className="text-small mt-2 text-danger-600">
          {message}
        </p>
      ) : null}
    </section>
  );
}
