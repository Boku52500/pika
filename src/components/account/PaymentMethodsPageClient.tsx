"use client";

import { useState, useTransition } from "react";
import { CreditCard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AccountEmptyState } from "./AccountEmptyState";
import { deleteMySavedPaymentMethod } from "@/server/actions/savedPaymentMethods";

export function PaymentMethodsPageClient({
  methods,
}: {
  methods: Array<{
    id: string;
    consent: string;
    maskedPan: string | null;
    cardType: string | null;
    cardExpiry: string | null;
  }>;
}) {
  const [rows, setRows] = useState(methods);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteMySavedPaymentMethod({ id });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setRows((current) => current.filter((row) => row.id !== id));
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-h2 text-text">გადახდის მეთოდები</h1>
        <p className="text-body mt-1 text-text-muted">
          ინახება მხოლოდ საქართველოს ბანკის უსაფრთხო იდენტიფიკატორი. ბარათის ნომერი და CVV აქ არ ინახება.
        </p>
      </div>
      {message ? (
        <p role="alert" className="text-small text-danger-500">
          {message}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <AccountEmptyState
          icon={CreditCard}
          title="შენახული ბარათი არ არის"
          description="შემდეგი ბარათით გადახდისას შეგიძლიათ ბარათის შენახვა — ავტომატური ჩამოჭრა ამით არ ერთვება."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-4">
              <div>
                <p className="text-small font-semibold text-text">
                  {row.cardType ?? "ბარათი"} {row.maskedPan ?? ""}
                </p>
                <p className="text-label text-text-muted">
                  {row.cardExpiry ?? ""} · {row.consent === "subscription" ? "ავტომატური" : "მომხმარებლის ინიციატივით"}
                </p>
              </div>
              <Button type="button" variant="ghost" disabled={pending} onClick={() => remove(row.id)}>
                <Trash2 className="size-4" />
                წაშლა
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
