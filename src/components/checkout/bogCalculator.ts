"use client";

import { bogCalculatorBnplFlag } from "@/lib/checkout";
import {
  bogCalculatorScriptId,
  bogCalculatorScriptUrl,
  classifyCalculatorOnClose,
  logCalculatorDiag,
} from "@/lib/bogSdk";

type BogCalculatorSelected = { amount?: number; month?: number; discount_code?: string };
type BogCalculatorApi = { open: (opts: Record<string, unknown>) => void };

export type BogLoanOrderResult = {
  providerOrderId: string;
  orderNumber: string;
  redirectUrl?: string;
};

export { bogCalculatorBnplFlag };

function getBogCalculator(): BogCalculatorApi | undefined {
  return (window as unknown as { BOG?: { Calculator?: BogCalculatorApi } }).BOG?.Calculator;
}

let loadPromise: Promise<BogCalculatorApi> | null = null;
let loadClientId: string | null = null;

function waitForCalculator(timeoutMs = 8000): Promise<BogCalculatorApi> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      const calculator = getBogCalculator();
      if (calculator?.open) {
        resolve(calculator);
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error("BOG calculator is unavailable"));
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

/** Load the official SDK once; do not insert a second script tag. */
export function loadBogCalculatorSdk(clientId: string): Promise<BogCalculatorApi> {
  if (!clientId.trim()) {
    return Promise.reject(new Error("BOG calculator is unavailable"));
  }
  if (loadPromise && loadClientId === clientId) return loadPromise;

  loadClientId = clientId;
  loadPromise = new Promise((resolve, reject) => {
    const ready = getBogCalculator();
    if (ready?.open) {
      resolve(ready);
      return;
    }

    const src = bogCalculatorScriptUrl(clientId);
    const failLoad = (error: Error) => {
      loadPromise = null;
      loadClientId = null;
      document.getElementById(bogCalculatorScriptId())?.remove();
      reject(error);
    };

    const afterScript = () => {
      void waitForCalculator()
        .then(resolve)
        .catch((error: unknown) => {
          failLoad(error instanceof Error ? error : new Error("BOG calculator is unavailable"));
        });
    };

    const existing = document.getElementById(bogCalculatorScriptId()) as HTMLScriptElement | null;
    if (existing) {
      if (existing.getAttribute("data-bog-sdk") === "error") {
        existing.remove();
      } else {
        existing.addEventListener("load", afterScript, { once: true });
        existing.addEventListener(
          "error",
          () => failLoad(new Error("BOG SDK failed")),
          { once: true },
        );
        if (existing.getAttribute("data-bog-sdk") === "loaded") afterScript();
        return;
      }
    }

    const script = document.createElement("script");
    script.id = bogCalculatorScriptId();
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.setAttribute("data-bog-sdk", "loaded");
      afterScript();
    };
    script.onerror = () => {
      script.setAttribute("data-bog-sdk", "error");
      failLoad(new Error("BOG SDK failed"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function openBogInstallmentCalculator(input: {
  clientId: string;
  amount: number;
  /** Official SDK: true = ნაწილ-ნაწილ only; false = განვადება only. Never omit. */
  bnpl: boolean;
  onRequest: (selected: { month: number; discount_code: string }) => Promise<BogLoanOrderResult>;
}): Promise<{ cancelled: true } | (BogLoanOrderResult & { sdkRedirectUrl?: string })> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let requesting = false;
    let created: BogLoanOrderResult | null = null;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      logCalculatorDiag("session_failed", { bnpl: input.bnpl, message: error.message === "closed" ? "closed" : "error" });
      reject(error);
    };

    const cancel = () => {
      if (settled) return;
      settled = true;
      logCalculatorDiag("session_cancelled", { bnpl: input.bnpl });
      resolve({ cancelled: true });
    };

    void loadBogCalculatorSdk(input.clientId)
      .then((calculator) => {
        if (settled) return;
        logCalculatorDiag("calculator_opened", { bnpl: input.bnpl });
        calculator.open({
          amount: input.amount,
          bnpl: input.bnpl,
          onClose: () => {
            const kind = classifyCalculatorOnClose({
              requesting,
              hasCreatedOrder: Boolean(created),
              settled,
            });
            logCalculatorDiag("onClose", {
              bnpl: input.bnpl,
              kind,
              requesting,
              hasCreatedOrder: Boolean(created),
              settled,
            });
            if (kind === "cancel") cancel();
          },
          onRequest: (selected: BogCalculatorSelected, successCb: (orderId: string) => void, closeCb: () => void) => {
            const month = Number(selected.month);
            const discount_code = String(selected.discount_code ?? "");
            logCalculatorDiag("onRequest", {
              bnpl: input.bnpl,
              hasMonth: Boolean(month),
              hasDiscountCode: Boolean(discount_code),
            });
            if (!month || !discount_code) {
              logCalculatorDiag("onRequest_missing_terms", { bnpl: input.bnpl });
              closeCb();
              fail(new Error("missing terms"));
              return false;
            }
            requesting = true;
            logCalculatorDiag("pika_order_started", { bnpl: input.bnpl, hasMonth: true, hasDiscountCode: true });
            void input
              .onRequest({ month, discount_code })
              .then((result) => {
                created = result;
                requesting = false;
                logCalculatorDiag("pika_order_succeeded", {
                  bnpl: input.bnpl,
                  hasProviderOrderId: Boolean(result.providerOrderId),
                });
                logCalculatorDiag("successCb", { bnpl: input.bnpl, hasProviderOrderId: true });
                successCb(result.providerOrderId);
              })
              .catch((error: unknown) => {
                requesting = false;
                logCalculatorDiag("pika_order_failed", { bnpl: input.bnpl });
                closeCb();
                fail(error instanceof Error ? error : new Error("განვადების შეკვეთა ვერ შეიქმნა."));
              });
            return undefined;
          },
          onComplete: ({ redirectUrl }: { redirectUrl?: string }) => {
            logCalculatorDiag("onComplete", {
              bnpl: input.bnpl,
              hasCreatedOrder: Boolean(created),
              hasRedirectUrl: Boolean(redirectUrl),
              settled,
            });
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
      })
      .catch((error: unknown) => {
        fail(error instanceof Error ? error : new Error("BOG calculator is unavailable"));
      });
  });
}
