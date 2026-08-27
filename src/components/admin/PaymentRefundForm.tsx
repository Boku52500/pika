"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { adminInputClass, adminLabelClass, adminTextareaClass } from "@/components/admin/adminUi";
import { formatPrice } from "@/lib/utils";
import { refundAdminOrderPayment } from "@/server/payments/actions";

const MONEY_INPUT_RE = /^\d+(\.\d{1,2})?$/;

function isValidGelInput(raw: string): boolean {
  const value = raw.trim().replace(",", ".");
  if (!MONEY_INPUT_RE.test(value)) return false;
  const [whole, frac = ""] = value.split(".");
  return whole !== undefined && (frac.length === 0 || frac.length <= 2) && value !== "0" && value !== "0.0" && value !== "0.00";
}

export function PaymentRefundForm({
  paymentId,
  orderNumber,
  paidAmount,
  refundedAmount,
  remainingAmount,
  providerOrderId,
  canRefund,
}: {
  paymentId: string;
  orderNumber: string;
  paidAmount: number;
  refundedAmount: number;
  remainingAmount: number;
  providerOrderId: string | null;
  canRefund: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const amountValid = kind === "full" || isValidGelInput(amount);
  const confirmDisabled = pending || (kind === "partial" && !amountValid);

  function openDialog() {
    setMessage(null);
    setSuccess(null);
    setKind("full");
    setAmount("");
    setAdminNote("");
    setOpen(true);
  }

  function submit() {
    if (confirmDisabled) return;
    setMessage(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await refundAdminOrderPayment({
        paymentId,
        kind,
        amount: kind === "partial" ? amount : undefined,
        adminNote: adminNote.trim() || undefined,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setSuccess("დაბრუნების მოთხოვნა ბანკში გაიგზავნა. საბოლოო სტატუსისთვის განაახლეთ გადახდა.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {canRefund ? (
        <Button type="button" variant="secondary" onClick={openDialog} disabled={pending}>
          თანხის დაბრუნება
        </Button>
      ) : remainingAmount <= 0 ? (
        <p className="text-label text-text-faint">დასაბრუნებელი თანხა აღარ რჩება.</p>
      ) : null}
      {message ? (
        <p role="alert" className="text-small text-danger-600">
          {message}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="text-small text-success-600">
          {success}
        </p>
      ) : null}

      <AdminConfirmDialog
        open={open}
        title="თანხის დაბრუნება"
        description={`შეკვეთა ${orderNumber}. BOG-ის დაბრუნების მოთხოვნა დაწყების შემდეგ ვერ გაუქმდება.`}
        confirmLabel={kind === "full" ? "სრული დაბრუნების დადასტურება" : "ნაწილობრივი დაბრუნების დადასტურება"}
        danger={kind === "full"}
        pending={pending}
        confirmDisabled={confirmDisabled}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        onConfirm={submit}
      >
        <dl className="grid gap-1 text-small text-text-muted">
          <div className="flex justify-between gap-3">
            <dt>გადახდილი თანხა</dt>
            <dd className="tnum font-medium text-text">{formatPrice(paidAmount)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>დაბრუნებული თანხა</dt>
            <dd className="tnum font-medium text-text">{formatPrice(refundedAmount)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>დასაბრუნებელი დარჩენილი თანხა</dt>
            <dd className="tnum font-medium text-text">{formatPrice(remainingAmount)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>პროვაიდერი</dt>
            <dd>საქართველოს ბანკი</dd>
          </div>
          {providerOrderId ? (
            <div>
              <dt className="text-label text-text-faint">BOG order id</dt>
              <dd className="tnum break-all">{providerOrderId}</dd>
            </div>
          ) : null}
        </dl>

        <fieldset className="mt-4 flex flex-col gap-2">
          <legend className={adminLabelClass}>დაბრუნების ტიპი</legend>
          <label className="flex items-center gap-2 text-small text-text">
            <input
              type="radio"
              name={`refund-kind-${paymentId}`}
              checked={kind === "full"}
              onChange={() => setKind("full")}
              disabled={pending}
            />
            სრული დაბრუნება
          </label>
          <label className="flex items-center gap-2 text-small text-text">
            <input
              type="radio"
              name={`refund-kind-${paymentId}`}
              checked={kind === "partial"}
              onChange={() => setKind("partial")}
              disabled={pending}
            />
            ნაწილობრივი დაბრუნება
          </label>
        </fieldset>

        {kind === "full" ? (
          <p className="text-small mt-3 font-medium text-danger-600">
            სრული დაბრუნება დაიწყება ამ გადახდის დარჩენილ თანხაზე. მოთხოვნის გაგზავნის შემდეგ BOG-ში გაუქმება შეუძლებელია.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={adminLabelClass}>დასაბრუნებელი თანხა</span>
              <input
                className={adminInputClass}
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="10.50"
                disabled={pending}
              />
              <span className="text-label text-text-faint">მაქსიმუმ: {formatPrice(remainingAmount)}</span>
            </label>
          </div>
        )}
        <label className="mt-3 flex flex-col gap-1.5">
          <span className={adminLabelClass}>შიდა შენიშვნა (არასავალდებულო)</span>
          <textarea
            className={adminTextareaClass}
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
            maxLength={500}
            disabled={pending}
          />
        </label>
        {message ? (
          <p role="alert" className="text-small mt-3 text-danger-600">
            {message}
          </p>
        ) : null}
      </AdminConfirmDialog>
    </div>
  );
}
