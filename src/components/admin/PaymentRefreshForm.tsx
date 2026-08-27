"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { refreshAdminOrderPayment } from "@/server/payments/actions";

export function PaymentRefreshForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function submit() {
    setMessage(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await refreshAdminOrderPayment({ orderId });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setSuccess("გადახდის სტატუსი განახლდა.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" onClick={submit} disabled={pending}>
        {pending ? "ახლდება..." : "გადახდის სტატუსის განახლება"}
      </Button>
      {message ? <p role="alert" className="text-small text-danger-600">{message}</p> : null}
      {success ? <p role="status" className="text-small text-success-600">{success}</p> : null}
    </div>
  );
}
