"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { retryOrderPayment } from "@/server/payments/actions";

export function RetryPaymentButton({ orderNumber }: { orderNumber: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const result = await retryOrderPayment({ orderNumber });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      window.location.assign(result.data.redirectUrl);
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button type="button" onClick={submit} disabled={pending}>
        {pending ? "გადახდაზე გადასვლა..." : "გადახდის გამეორება"}
      </Button>
      {message ? (
        <p role="alert" className="text-small text-danger-600">
          {message}
        </p>
      ) : null}
    </div>
  );
}
