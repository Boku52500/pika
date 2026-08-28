"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { adminInputClass, adminLabelClass } from "@/components/admin/adminUi";
import { captureAdminPreauthorization, rejectAdminPreauthorization } from "@/server/payments/actions";

export function PaymentCaptureForm({ paymentId, authorizedAmount }: { paymentId: string; authorizedAmount: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState<"capture" | "reject" | null>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitCapture() {
    startTransition(async () => {
      setMessage(null);
      const result = await captureAdminPreauthorization({
        paymentId,
        amount: amount.trim() || undefined,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setOpen(null);
      router.refresh();
    });
  }

  function submitReject() {
    startTransition(async () => {
      setMessage(null);
      const result = await rejectAdminPreauthorization({ paymentId });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setOpen(null);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setOpen("capture")} disabled={pending}>
          თანხის ჩამოჭრა
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen("reject")} disabled={pending}>
          ავტორიზაციის გაუქმება
        </Button>
      </div>
      {message ? <p className="text-label text-danger-500">{message}</p> : null}
      <AdminConfirmDialog
        open={open === "capture"}
        title="თანხის ჩამოჭრა"
        description="ეს მოთხოვნა ბანკში იგზავნება. request_received არ ნიშნავს დასრულებას — საბოლოო სტატუსი Payment Details/callback-იდან მოვა."
        confirmLabel="ჩამოჭრა"
        pending={pending}
        onClose={() => setOpen(null)}
        onConfirm={submitCapture}
      >
        <label className={adminLabelClass}>
          ნაწილობრივი თანხა (ცარიელი = სრული)
          <input className={adminInputClass} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={authorizedAmount ? String(authorizedAmount) : ""} />
        </label>
      </AdminConfirmDialog>
      <AdminConfirmDialog
        open={open === "reject"}
        title="ავტორიზაციის გაუქმება"
        description="დაბლოკილი თანხა გაითავისუფლდება. ეს ქმედება შეუქცევადია."
        confirmLabel="გაუქმება"
        pending={pending}
        onClose={() => setOpen(null)}
        onConfirm={submitReject}
      />
    </div>
  );
}
