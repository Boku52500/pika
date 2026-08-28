"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { adminSelectClass } from "@/components/admin/adminUi";
import { ORDER_STATUS_LABEL } from "@/lib/adminLabels";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { updateAdminOrderStatus } from "@/server/actions/admin";
import type { OrderStatus } from "@/generated/prisma/client";

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export function OrderStatusForm({ orderId, current }: { orderId: string; current: OrderStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function submit() {
    setMessage(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateAdminOrderStatus({ orderId, orderStatus: status });
      setConfirmOpen(false);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setSuccess("სტატუსი განახლდა. გადახდის სტატუსი არ შეცვლილა.");
      router.refresh();
    });
  }

  function requestSubmit() {
    if (status === "cancelled") {
      setConfirmOpen(true);
      return;
    }
    submit();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[0.8125rem] font-medium text-text">შეკვეთის სტატუსი</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            className={adminSelectClass}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {ORDER_STATUS_LABEL[value]}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" onClick={requestSubmit} disabled={pending || status === current}>
          {pending ? "ინახება..." : "სტატუსის შენახვა"}
        </Button>
      </div>
      {message ? <p role="alert" className="text-small text-danger-600">{message}</p> : null}
      {success ? <p role="status" className="text-small text-success-600">{success}</p> : null}
      <AdminConfirmDialog
        open={confirmOpen}
        title="შეკვეთის გაუქმება"
        description="გაუქმება არ ცვლის გადახდის სტატუსს. გადაუხდელი ბარათის შეკვეთის მარაგი დაბრუნდება; ნაღდი ანგარიშსწორების შეკვეთაზე მარაგი არ ბრუნდება."
        confirmLabel="გაუქმება"
        danger
        pending={pending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submit}
      />
    </div>
  );
}
