"use client";

import { bogCalculatorBnplFlag } from "@/lib/checkout";

type BogCalculatorSelected = { amount?: number; month?: number; discount_code?: string };

export type BogLoanOrderResult = {
  providerOrderId: string;
  orderNumber: string;
  redirectUrl?: string;
};

export { bogCalculatorBnplFlag };

export function openBogInstallmentCalculator(input: {
  clientId: string;
  amount: number;
  /** Official SDK: true = ნაწილ-ნაწილ only; false = განვადება only. Never omit. */
  bnpl: boolean;
  onRequest: (selected: { month: number; discount_code: string }) => Promise<BogLoanOrderResult>;
}): Promise<BogLoanOrderResult & { sdkRedirectUrl?: string }> {
  return new Promise((resolve, reject) => {
    const src = `https://webstatic.bog.ge/bog-sdk/bog-sdk.js?version=2&client_id=${encodeURIComponent(input.clientId)}`;
    const existing = document.querySelector(`script[src="${src}"]`);
    let settled = false;
    let created: BogLoanOrderResult | null = null;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const start = () => {
      const bog = (
        window as unknown as {
          BOG?: { Calculator?: { open: (opts: Record<string, unknown>) => void } };
        }
      ).BOG;
      if (!bog?.Calculator) {
        fail(new Error("BOG calculator is unavailable"));
        return;
      }
      bog.Calculator.open({
        amount: input.amount,
        bnpl: input.bnpl,
        onClose: () => {
          if (created || settled) return;
          fail(new Error("closed"));
        },
        onRequest: (selected: BogCalculatorSelected, successCb: (orderId: string) => void, closeCb: () => void) => {
          const month = Number(selected.month);
          const discount_code = String(selected.discount_code ?? "");
          if (!month || !discount_code) {
            closeCb();
            fail(new Error("missing terms"));
            return false;
          }
          void input
            .onRequest({ month, discount_code })
            .then((result) => {
              created = result;
              successCb(result.providerOrderId);
            })
            .catch((error: unknown) => {
              closeCb();
              fail(error instanceof Error ? error : new Error("განვადების შეკვეთა ვერ შეიქმნა."));
            });
          return undefined;
        },
        onComplete: ({ redirectUrl }: { redirectUrl?: string }) => {
          if (!created) {
            fail(new Error("missing BOG order"));
            return false;
          }
          if (settled) return false;
          settled = true;
          resolve({ ...created, sdkRedirectUrl: redirectUrl });
          return false;
        },
      });
    };
    if (existing) {
      start();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = start;
    script.onerror = () => fail(new Error("BOG SDK failed"));
    document.head.appendChild(script);
  });
}
